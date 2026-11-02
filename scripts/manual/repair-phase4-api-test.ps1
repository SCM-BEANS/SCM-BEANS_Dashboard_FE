param(
    [string]$CaseId = "255e53c8-8304-4cdd-98ba-0c98243304a7",
    [string]$TechnicianCredentialPath = (Join-Path (Join-Path $env:USERPROFILE ".codex\repair-phase2-test") "technician.xml"),
    [string]$OwnerCredentialPath = (Join-Path (Join-Path $env:USERPROFILE ".codex\repair-phase2-test") "owner.xml"),
    [switch]$RunPhase4
)

$ErrorActionPreference = "Stop"
$authBaseUrl = "http://100.75.202.72:4000/api/v1"
$doloresBaseUrl = "http://100.75.202.72:8082/api/v1"
$script:accessToken = $null
$script:currentRole = $null

function Get-HttpStatusCode {
    param([System.Management.Automation.ErrorRecord]$ErrorRecord)
    if ($ErrorRecord.Exception.Response) {
        return [int]$ErrorRecord.Exception.Response.StatusCode
    }
    return "unreachable"
}

function Get-ResponseData {
    param([object]$Response)
    if ($null -ne $Response -and $null -ne $Response.PSObject.Properties["data"]) {
        return $Response.data
    }
    return $Response
}

function Get-RequiredProperty {
    param([object]$Object, [Parameter(Mandatory)][string]$Name)
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property -or $null -eq $property.Value -or [string]::IsNullOrWhiteSpace([string]$property.Value)) {
        throw "The API response is missing required field '$Name'. No next mutation was sent."
    }
    return $property.Value
}

function Get-CustodyEvents {
    $response = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/repair-cases/$CaseId/custody-events?page=0&size=50")
    if ($response -is [array]) { return @($response) }
    if ($null -ne $response.PSObject.Properties["items"]) { return @($response.items) }
    if ($null -ne $response.PSObject.Properties["content"]) { return @($response.content) }
    throw "Custody response did not contain an event list. No next mutation was sent."
}

function Read-OwnerCaseCustody {
    $case = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/repair-cases/$CaseId")
    if ([string]$case.id -ne $CaseId) { throw "Owner GET returned a different RepairCase. No next mutation was sent." }
    return [pscustomobject]@{ Case = $case; Events = @(Get-CustodyEvents) }
}

function Invoke-DoloresApi {
    param(
        [Parameter(Mandatory)][ValidateSet("GET", "POST")][string]$Method,
        [Parameter(Mandatory)][string]$Path,
        [object]$Body
    )

    $arguments = @{
        Method      = $Method
        Uri         = "$doloresBaseUrl$Path"
        Headers     = @{ Authorization = "Bearer $script:accessToken" }
        TimeoutSec  = 30
        ErrorAction = "Stop"
    }
    if ($Method -eq "POST") {
        $arguments.ContentType = "application/json"
        $arguments.Body = $Body | ConvertTo-Json -Depth 8 -Compress
    }

    try {
        return Invoke-RestMethod @arguments
    } catch {
        $status = Get-HttpStatusCode $_
        throw "Dolores $Method $Path failed (HTTP $status). No credential or token was printed."
    }
}

function Connect-Role {
    param(
        [Parameter(Mandatory)][ValidateSet("TECH", "OWNER")][string]$Role,
        [Parameter(Mandatory)][string]$CredentialPath
    )

    if ($script:accessToken -and $script:currentRole -eq $Role) { return }

    if (-not (Test-Path -LiteralPath $CredentialPath)) {
        throw "$Role credential file not found: $CredentialPath. No next mutation was sent."
    }
    try {
        $credential = Import-Clixml -LiteralPath $CredentialPath
    } catch {
        throw "Windows could not decrypt the $Role credential file. Run this script in the same Windows account/profile that created it. No next mutation was sent."
    }

    $plainPassword = [System.Net.NetworkCredential]::new("", $credential.Password).Password
    $loginBody = @{ email = $credential.UserName; password = $plainPassword } | ConvertTo-Json -Compress
    try {
        $login = Invoke-RestMethod -Method Post -Uri "$authBaseUrl/auth/login" -ContentType "application/json" -Body $loginBody -TimeoutSec 30 -ErrorAction Stop
    } catch {
        $status = Get-HttpStatusCode $_
        $plainPassword = $null
        $loginBody = $null
        $credential = $null
        throw "Fresh $Role login failed (HTTP $status). No token was printed. No next mutation was sent."
    }
    $plainPassword = $null
    $loginBody = $null
    $credential = $null

    if (-not $login.access_token) {
        if ($login.temp_token) {
            $login = $null
            throw "$Role login requires MFA. No next mutation was sent."
        }
        $login = $null
        throw "$Role login did not return an access token. No next mutation was sent."
    }
    $script:accessToken = [string]$login.access_token
    $script:currentRole = $Role
    $login = $null
    Write-Output "Fresh $Role login: OK (token hidden)."
}

function Read-Phase4State {
    $case = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/repair-cases/$CaseId")
    if ([string]$case.id -ne $CaseId) { throw "GET returned a different RepairCase. No next mutation was sent." }
    $ticketId = Get-RequiredProperty $case "maintenanceTicketId"
    $ticket = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/maintenance-tickets/$ticketId")
    $assignmentId = $null
    $assignmentSource = $null

    $requestId = $case.maintenanceRequestId
    if ($requestId) {
        $request = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/maintenance-requests/$requestId")
        $assignmentId = $request.replacementAssignmentId
        if ($assignmentId) { $assignmentSource = "maintenance request" }
    }
    if (-not $assignmentId) {
        $timelineResponse = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/repair-cases/$CaseId/timeline?page=0&size=50")
        if ($null -ne $timelineResponse.PSObject.Properties["content"]) { $timelineEvents = @($timelineResponse.content) }
        elseif ($timelineResponse -is [array]) { $timelineEvents = @($timelineResponse) }
        else { $timelineEvents = @() }
        $plannedEvents = @($timelineEvents | Where-Object { $_.eventType -eq "REPLACEMENT_PLANNED" } | Select-Object -Last 1)
        if ($plannedEvents.Count -gt 0 -and $plannedEvents[0].reason) {
            $match = [regex]::Match([string]$plannedEvents[0].reason, '(?:^|[;\s])replacementAssignmentId=([0-9a-f-]{36})(?:;|$)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            if ($match.Success) {
                $assignmentId = $match.Groups[1].Value
                $assignmentSource = "RepairCase REPLACEMENT_PLANNED timeline event"
            }
        }
    }
    if (-not $assignmentId) {
        $workItemsResponse = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/technician/work-items?page=0&size=50&workType=REPAIR")
        if ($null -ne $workItemsResponse.PSObject.Properties["items"]) { $workItems = @($workItemsResponse.items) }
        elseif ($workItemsResponse -is [array]) { $workItems = @($workItemsResponse) }
        else { $workItems = @() }
        $matchingWorkItems = @($workItems | Where-Object {
            $_.workType -eq "REPAIR" -and (([string]$_.id -eq $CaseId) -or ([string]$_.detailPath -like "*/$CaseId"))
        })
        if ($matchingWorkItems.Count -gt 0) {
            $assignmentStep = @($matchingWorkItems[0].relatedSteps | Where-Object { $_.stepType -eq "REPLACEMENT_ASSIGNMENT" } | Select-Object -First 1)
            if ($assignmentStep.Count -gt 0) {
                $assignmentId = $assignmentStep[0].id
                $assignmentSource = "Technician work-item relatedSteps"
            }
        }
    }
    if (-not $assignmentId) { throw "No replacement assignment ID was returned. No mutation was sent." }
    $assignment = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/replacement-assignments/$assignmentId")
    $events = Get-CustodyEvents

    if ([string]$ticket.repairCaseId -ne $CaseId -or [string]$assignment.repairCaseId -ne $CaseId) {
        throw "Ticket or assignment does not belong to this case. No mutation was sent."
    }
    if ([string]$assignment.status -ne "ACTIVE") { throw "Replacement assignment is not ACTIVE. No mutation was sent." }
    if (-not $assignment.replacementMachineId -or -not $case.primaryMachineId) { throw "Primary/replacement machine ID is missing. No mutation was sent." }

    return [pscustomobject]@{
        Case = $case
        Ticket = $ticket
        TicketId = [string]$ticketId
        Assignment = $assignment
        AssignmentId = [string]$assignmentId
        AssignmentSource = [string]$assignmentSource
        Events = @($events)
    }
}

function Get-Event {
    param([object[]]$Events, [Parameter(Mandatory)][string]$EventType)
    $matches = @($Events | Where-Object { $_.eventType -eq $EventType } | Select-Object -First 1)
    if ($matches.Count -gt 0) { return $matches[0] }
    return $null
}

function Assert-EventMachine {
    param([object]$Event, [string]$EventType, [string]$MachineId)
    if ([string]$Event.eventType -ne $EventType -or [string]$Event.machineId -ne $MachineId -or [string]$Event.repairCaseId -ne $CaseId) {
        throw "$EventType event does not match the expected case and machine. No next mutation was sent."
    }
}

try {
    Connect-Role -Role TECH -CredentialPath $TechnicianCredentialPath
    $state = Read-Phase4State
    $deliveredEvent = Get-Event -Events $state.Events -EventType "REPLACEMENT_DELIVERED"
    $collectionEvent = Get-Event -Events $state.Events -EventType "REPLACEMENT_COLLECTED"
    $primaryReturnEvent = Get-Event -Events $state.Events -EventType "PRIMARY_RETURNED"
    Write-Output "Preflight: case=$($state.Case.status); ticket=$($state.Ticket.status); assignment=$($state.Assignment.status); assignmentSource=$($state.AssignmentSource); caseId=$CaseId; ticketId=$($state.TicketId)"

    if (-not $deliveredEvent -or -not $deliveredEvent.ownerAcknowledgedAt) {
        throw "Owner has not acknowledged REPLACEMENT_DELIVERED. No Phase 4 mutation was sent."
    }
    Assert-EventMachine -Event $deliveredEvent -EventType "REPLACEMENT_DELIVERED" -MachineId ([string]$state.Assignment.replacementMachineId)
    if ($collectionEvent) { Assert-EventMachine -Event $collectionEvent -EventType "REPLACEMENT_COLLECTED" -MachineId ([string]$state.Assignment.replacementMachineId) }
    if ($primaryReturnEvent) { Assert-EventMachine -Event $primaryReturnEvent -EventType "PRIMARY_RETURNED" -MachineId ([string]$state.Case.primaryMachineId) }
    if ($primaryReturnEvent -and -not $collectionEvent) { throw "PRIMARY_RETURNED exists without REPLACEMENT_COLLECTED. No mutation was sent." }
    if ($primaryReturnEvent -and -not $collectionEvent.ownerAcknowledgedAt) { throw "PRIMARY_RETURNED exists before Owner acknowledged REPLACEMENT_COLLECTED. No mutation was sent." }

    if (-not $RunPhase4) {
        Write-Output "Preflight passed. No mutations were sent. Re-run with -RunPhase4 to record the two TEST ONLY return events and Owner acknowledgments."
        return
    }

    $runId = [guid]::NewGuid().ToString("N")
    if (-not $collectionEvent) {
        if ([string]$state.Case.status -ne "REPAIR_COMPLETED" -or [string]$state.Ticket.status -ne "RESOLVED") {
            throw "Case/ticket are not at REPAIR_COMPLETED/RESOLVED for replacement collection. No Phase 4 mutation was sent."
        }
        Connect-Role -Role TECH -CredentialPath $TechnicianCredentialPath
        $null = Invoke-DoloresApi -Method POST -Path "/repair-cases/$CaseId/custody-events" -Body @{
            eventType = "REPLACEMENT_COLLECTED"
            machineId = [string]$state.Assignment.replacementMachineId
            conditionNotes = "TEST ONLY: Phase 4 run $runId; synthetic replacement-machine collection condition."
            evidenceReference = "private/repair-phase4-test/$CaseId/$runId/replacement-collected.txt"
        }
        $state = Read-Phase4State
        $collectionEvent = Get-Event -Events $state.Events -EventType "REPLACEMENT_COLLECTED"
        if (-not $collectionEvent) { throw "REPLACEMENT_COLLECTED POST returned, but custody GET did not contain the event. Stopped before acknowledgment." }
        Assert-EventMachine -Event $collectionEvent -EventType "REPLACEMENT_COLLECTED" -MachineId ([string]$state.Assignment.replacementMachineId)
        if ([string]$state.Case.status -ne "REPLACEMENT_COLLECTED") { throw "Collection GET did not confirm case REPLACEMENT_COLLECTED. Stopped before acknowledgment." }
        Write-Output "Replacement collection read-after-write: OK (case=REPLACEMENT_COLLECTED; machine=B)."
    } elseif (-not $collectionEvent.ownerAcknowledgedAt) {
        Write-Output "Resume: found the existing, unacknowledged REPLACEMENT_COLLECTED event; no duplicate event will be created."
    } else {
        Write-Output "Resume: REPLACEMENT_COLLECTED is already Owner-acknowledged."
    }

    if (-not $collectionEvent.ownerAcknowledgedAt) {
        $script:accessToken = $null
        Connect-Role -Role OWNER -CredentialPath $OwnerCredentialPath
        $null = Invoke-DoloresApi -Method POST -Path "/repair-cases/$CaseId/custody-events/$($collectionEvent.id)/acknowledge" -Body @{
            acknowledgement = "TEST ONLY: Owner acknowledgment for Phase 4 replacement-machine collection $runId."
        }
        $ownerRead = Read-OwnerCaseCustody
        $collectionEvent = Get-Event -Events $ownerRead.Events -EventType "REPLACEMENT_COLLECTED"
        if (-not $collectionEvent.ownerAcknowledgedAt -or [string]$ownerRead.Case.status -ne "REPLACEMENT_COLLECTED") {
            throw "Owner acknowledgment POST returned, but case/custody GET did not confirm it. Stopped before returning machine A."
        }
        Write-Output "Replacement collection Owner acknowledgment read-after-write: OK."
        Connect-Role -Role TECH -CredentialPath $TechnicianCredentialPath
        $state = Read-Phase4State
        $collectionEvent = Get-Event -Events $state.Events -EventType "REPLACEMENT_COLLECTED"
    }

    if (-not $primaryReturnEvent) {
        if ([string]$state.Case.status -ne "REPLACEMENT_COLLECTED" -or [string]$state.Ticket.status -ne "RESOLVED" -or -not $collectionEvent.ownerAcknowledgedAt) {
            throw "Case/ticket or prior acknowledgment is not ready for primary return. No next mutation was sent."
        }
        Connect-Role -Role TECH -CredentialPath $TechnicianCredentialPath
        $null = Invoke-DoloresApi -Method POST -Path "/repair-cases/$CaseId/custody-events" -Body @{
            eventType = "PRIMARY_RETURNED"
            machineId = [string]$state.Case.primaryMachineId
            conditionNotes = "TEST ONLY: Phase 4 run $runId; synthetic repaired primary-machine return condition."
            evidenceReference = "private/repair-phase4-test/$CaseId/$runId/primary-returned.txt"
        }
        $state = Read-Phase4State
        $primaryReturnEvent = Get-Event -Events $state.Events -EventType "PRIMARY_RETURNED"
        if (-not $primaryReturnEvent) { throw "PRIMARY_RETURNED POST returned, but custody GET did not contain the event. Stopped before acknowledgment." }
        Assert-EventMachine -Event $primaryReturnEvent -EventType "PRIMARY_RETURNED" -MachineId ([string]$state.Case.primaryMachineId)
        if ([string]$state.Case.status -ne "PRIMARY_RETURNED") { throw "Primary return GET did not confirm case PRIMARY_RETURNED. Stopped before acknowledgment." }
        Write-Output "Primary return read-after-write: OK (case=PRIMARY_RETURNED; machine=A)."
    } elseif (-not $primaryReturnEvent.ownerAcknowledgedAt) {
        Write-Output "Resume: found the existing, unacknowledged PRIMARY_RETURNED event; no duplicate event will be created."
    } else {
        Write-Output "Resume: PRIMARY_RETURNED is already Owner-acknowledged."
    }

    if (-not $primaryReturnEvent.ownerAcknowledgedAt) {
        $script:accessToken = $null
        Connect-Role -Role OWNER -CredentialPath $OwnerCredentialPath
        $null = Invoke-DoloresApi -Method POST -Path "/repair-cases/$CaseId/custody-events/$($primaryReturnEvent.id)/acknowledge" -Body @{
            acknowledgement = "TEST ONLY: Owner acknowledgment for Phase 4 primary-machine return $runId."
        }
        $ownerRead = Read-OwnerCaseCustody
        $primaryReturnEvent = Get-Event -Events $ownerRead.Events -EventType "PRIMARY_RETURNED"
        if (-not $primaryReturnEvent.ownerAcknowledgedAt -or [string]$ownerRead.Case.status -ne "OWNER_ACKNOWLEDGED") {
            throw "Owner acknowledgment POST returned, but case/custody GET did not confirm the final state."
        }
        Write-Output "Primary return Owner acknowledgment read-after-write: OK."
    }

    $finalRead = Read-OwnerCaseCustody
    $collectionEvent = Get-Event -Events $finalRead.Events -EventType "REPLACEMENT_COLLECTED"
    $primaryReturnEvent = Get-Event -Events $finalRead.Events -EventType "PRIMARY_RETURNED"
    if (-not $collectionEvent.ownerAcknowledgedAt -or -not $primaryReturnEvent.ownerAcknowledgedAt -or [string]$finalRead.Case.status -ne "OWNER_ACKNOWLEDGED") {
        throw "Final GET did not confirm both Owner acknowledgments and case OWNER_ACKNOWLEDGED. Phase 5 release was not attempted."
    }
    Write-Output "Phase 4 final read-after-write: OK (case=OWNER_ACKNOWLEDGED; both return events acknowledged)."
    Write-Output "Phase 4 TEST ONLY run: $runId. No image was uploaded; Phase 5 release was not attempted."
} finally {
    $script:accessToken = $null
    $script:currentRole = $null
    $plainPassword = $null
    $loginBody = $null
    $credential = $null
    $login = $null
}
