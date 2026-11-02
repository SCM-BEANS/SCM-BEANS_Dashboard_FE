param(
    [string]$CaseId = "255e53c8-8304-4cdd-98ba-0c98243304a7",
    [string]$TechnicianCredentialPath = (Join-Path (Join-Path $env:USERPROFILE ".codex\repair-phase2-test") "technician.xml"),
    [string]$OwnerCredentialPath = (Join-Path (Join-Path $env:USERPROFILE ".codex\repair-phase2-test") "owner.xml"),
    [switch]$RunPhase5
)

$ErrorActionPreference = "Stop"
$authBaseUrl = "http://100.75.202.72:4000/api/v1"
$doloresBaseUrl = "http://100.75.202.72:8082/api/v1"
$script:accessToken = $null

function Get-HttpStatusCode {
    param([System.Management.Automation.ErrorRecord]$ErrorRecord)
    if ($ErrorRecord.Exception.Response) { return [int]$ErrorRecord.Exception.Response.StatusCode }
    return "unreachable"
}

function Get-ResponseData {
    param([object]$Response)
    if ($null -ne $Response -and $null -ne $Response.PSObject.Properties["data"]) { return $Response.data }
    return $Response
}

function Invoke-DoloresApi {
    param(
        [Parameter(Mandatory)][ValidateSet("GET", "POST")][string]$Method,
        [Parameter(Mandatory)][string]$Path,
        [object]$Body
    )
    $arguments = @{
        Method = $Method
        Uri = "$doloresBaseUrl$Path"
        Headers = @{ Authorization = "Bearer $script:accessToken" }
        TimeoutSec = 30
        ErrorAction = "Stop"
    }
    if ($Method -eq "POST") {
        $arguments.ContentType = "application/json"
        $arguments.Body = $Body | ConvertTo-Json -Depth 8 -Compress
    }
    try { return Invoke-RestMethod @arguments }
    catch {
        $status = Get-HttpStatusCode $_
        throw "Dolores $Method $Path failed (HTTP $status). No credential or token was printed."
    }
}

function Connect-Role {
    param([Parameter(Mandatory)][ValidateSet("TECH", "OWNER")][string]$Role)
    $credentialPath = if ($Role -eq "TECH") { $TechnicianCredentialPath } else { $OwnerCredentialPath }
    if (-not (Test-Path -LiteralPath $credentialPath)) {
        throw "$Role credential file not found. Save it in the same Windows profile before testing."
    }
    try { $credential = Import-Clixml -LiteralPath $credentialPath }
    catch { throw "Windows could not decrypt the $Role credential file. Use the same Windows profile that created it." }

    $plainPassword = [System.Net.NetworkCredential]::new("", $credential.Password).Password
    $loginBody = @{ email = $credential.UserName; password = $plainPassword } | ConvertTo-Json -Compress
    try {
        $login = Invoke-RestMethod -Method Post -Uri "$authBaseUrl/auth/login" -ContentType "application/json" -Body $loginBody -TimeoutSec 30 -ErrorAction Stop
    } catch {
        $status = Get-HttpStatusCode $_
        $plainPassword = $null; $loginBody = $null; $credential = $null
        throw "Fresh $Role login failed (HTTP $status). No token was printed."
    }
    $plainPassword = $null; $loginBody = $null; $credential = $null
    if (-not $login.access_token) {
        if ($login.temp_token) { throw "$Role login requires MFA." }
        throw "$Role login did not return an access token."
    }
    $script:accessToken = [string]$login.access_token
    $login = $null
    Write-Output "Fresh $Role login: OK (token hidden)."
}

function Get-Events {
    param([string]$Path, [string]$CollectionName)
    $response = Get-ResponseData (Invoke-DoloresApi -Method GET -Path $Path)
    if ($response -is [array]) { return @($response) }
    if ($null -ne $response.PSObject.Properties[$CollectionName]) { return @($response.$CollectionName) }
    if ($null -ne $response.PSObject.Properties["items"]) { return @($response.items) }
    if ($null -ne $response.PSObject.Properties["content"]) { return @($response.content) }
    throw "GET $Path did not return an event list. No mutation was sent."
}

function Get-Event {
    param([object[]]$Events, [string]$EventType)
    $match = @($Events | Where-Object { $_.eventType -eq $EventType } | Select-Object -First 1)
    if ($match.Count -gt 0) { return $match[0] }
    return $null
}

function Read-Phase5State {
    $case = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/repair-cases/$CaseId")
    if ([string]$case.id -ne $CaseId) { throw "RepairCase GET returned a different ID. No mutation was sent." }
    $ticketId = [string]$case.maintenanceTicketId
    if (-not $ticketId) { throw "RepairCase has no maintenance ticket ID. No mutation was sent." }
    $ticket = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/maintenance-tickets/$ticketId")
    if ([string]$ticket.repairCaseId -ne $CaseId) { throw "Maintenance ticket is linked to a different case. No mutation was sent." }

    $assignmentId = $null
    if ($case.maintenanceRequestId) {
        $request = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/maintenance-requests/$($case.maintenanceRequestId)")
        $assignmentId = $request.replacementAssignmentId
    }
    if (-not $assignmentId) {
        $timeline = Get-Events -Path "/repair-cases/$CaseId/timeline?page=0&size=50" -CollectionName "content"
        $planned = @($timeline | Where-Object { $_.eventType -eq "REPLACEMENT_PLANNED" } | Select-Object -Last 1)
        if ($planned.Count -gt 0 -and $planned[0].reason) {
            $match = [regex]::Match([string]$planned[0].reason, '(?:^|[;\s])replacementAssignmentId=([0-9a-f-]{36})(?:;|$)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            if ($match.Success) { $assignmentId = $match.Groups[1].Value }
        }
    }
    if (-not $assignmentId) { throw "No replacement assignment ID is linked to the RepairCase. No mutation was sent." }

    $assignment = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/replacement-assignments/$assignmentId")
    $contractId = [string]$assignment.contractId
    if (-not $contractId) { throw "Replacement assignment has no contract ID. No mutation was sent." }
    $contract = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/contracts/$contractId")
    $primaryMachine = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/machines/$($case.primaryMachineId)")
    $replacementMachine = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/machines/$($assignment.replacementMachineId)")
    $custodyEvents = Get-Events -Path "/repair-cases/$CaseId/custody-events?page=0&size=50" -CollectionName "items"
    $timelineEvents = Get-Events -Path "/repair-cases/$CaseId/timeline?page=0&size=50" -CollectionName "content"
    return [pscustomobject]@{
        Case = $case
        Ticket = $ticket
        Assignment = $assignment
        AssignmentId = [string]$assignmentId
        Contract = $contract
        PrimaryMachine = $primaryMachine
        ReplacementMachine = $replacementMachine
        CustodyEvents = @($custodyEvents)
        TimelineEvents = @($timelineEvents)
    }
}

try {
    Connect-Role -Role TECH
    $state = Read-Phase5State
    $collected = Get-Event -Events $state.CustodyEvents -EventType "REPLACEMENT_COLLECTED"
    $returned = Get-Event -Events $state.CustodyEvents -EventType "PRIMARY_RETURNED"
    Write-Output "Preflight: case=$($state.Case.status); ticket=$($state.Ticket.status); assignment=$($state.Assignment.status); caseId=$CaseId; assignmentId=$($state.AssignmentId)"

    if ([string]$state.Assignment.repairCaseId -ne $CaseId -or [string]$state.Assignment.id -ne $state.AssignmentId) {
        throw "Replacement assignment is linked to a different case or ID. No mutation was sent."
    }
    if ([string]$state.PrimaryMachine.id -ne [string]$state.Case.primaryMachineId -or
        [string]$state.ReplacementMachine.id -ne [string]$state.Assignment.replacementMachineId) {
        throw "Machine GET returned an ID different from the RepairCase or assignment. No mutation was sent."
    }
    if ([string]$state.Assignment.primaryMachineId -ne [string]$state.Case.primaryMachineId -or
        [string]$state.Assignment.replacementMachineId -eq [string]$state.Case.primaryMachineId) {
        throw "Assignment machine IDs do not match the case's primary and replacement machines. No mutation was sent."
    }
    if (-not $collected -or -not $collected.ownerAcknowledgedAt -or
        [string]$collected.machineId -ne [string]$state.Assignment.replacementMachineId) {
        throw "Owner-acknowledged REPLACEMENT_COLLECTED for machine B is missing. No mutation was sent."
    }
    if (-not $returned -or -not $returned.ownerAcknowledgedAt -or
        [string]$returned.machineId -ne [string]$state.Case.primaryMachineId) {
        throw "Owner-acknowledged PRIMARY_RETURNED for machine A is missing. No mutation was sent."
    }

    if ([string]$state.Assignment.status -eq "RELEASED" -and [string]$state.Case.status -eq "CLOSED") {
        $closedEvent = Get-Event -Events $state.TimelineEvents -EventType "CASE_CLOSED"
        if (-not $closedEvent) { throw "Assignment and case are final, but CASE_CLOSED timeline event is missing." }
        if ([string]$state.ReplacementMachine.status -ne "IN_WAREHOUSE" -or $null -ne $state.ReplacementMachine.ownerId) {
            throw "Released replacement machine is not confirmed IN_WAREHOUSE with no assigned Owner."
        }
        if ([string]$state.Contract.status -eq "ACTIVE") {
            if ([string]$state.PrimaryMachine.status -ne "DEPLOYED_CONTRACT_OWNER" -or
                [string]$state.PrimaryMachine.ownerId -ne [string]$state.Assignment.ownerId) {
                throw "Active-contract primary machine is not confirmed DEPLOYED_CONTRACT_OWNER for the assignment Owner."
            }
        }
        Write-Output "Already complete: assignment=RELEASED; case=CLOSED; timeline=CASE_CLOSED. No duplicate mutation sent."
        Write-Output "Machine lifecycle GET: replacement=IN_WAREHOUSE with Owner cleared; primary=$($state.PrimaryMachine.status)."
        return
    }
    if ([string]$state.Assignment.status -ne "ACTIVE" -or [string]$state.Case.status -ne "OWNER_ACKNOWLEDGED") {
        throw "Preflight requires assignment ACTIVE and RepairCase OWNER_ACKNOWLEDGED. No mutation was sent."
    }

    if (-not $RunPhase5) {
        Write-Output "Preflight passed. No mutation was sent. Re-run with -RunPhase5 to release this test assignment using TEST ONLY evidence."
        return
    }

    $runId = [guid]::NewGuid().ToString("N")
    $request = @{
        releaseEvidence = "private/repair-phase5-test/$CaseId/$runId/release.txt"
        idempotencyKey = [guid]::NewGuid().ToString("N")
        correlationId = $runId
    }
    $response = Get-ResponseData (Invoke-DoloresApi -Method POST -Path "/replacement-assignments/$($state.AssignmentId)/release" -Body $request)
    if ([string]$response.id -ne $state.AssignmentId -or [string]$response.status -ne "RELEASED") {
        throw "Release POST did not return the expected assignment ID and RELEASED status. State may need GET reconciliation."
    }

    $final = Read-Phase5State
    $closedEvent = Get-Event -Events $final.TimelineEvents -EventType "CASE_CLOSED"
    if ([string]$final.Assignment.status -ne "RELEASED" -or [string]$final.Case.status -ne "CLOSED" -or -not $closedEvent) {
        throw "Release POST succeeded, but read-after-write did not confirm assignment RELEASED, case CLOSED, and CASE_CLOSED timeline. Do not retry until GET state is inspected."
    }
    if ([string]$final.ReplacementMachine.status -ne "IN_WAREHOUSE" -or $null -ne $final.ReplacementMachine.ownerId) {
        throw "Release POST succeeded, but GET did not confirm the replacement machine in warehouse with Owner cleared."
    }
    if ([string]$final.Contract.status -eq "ACTIVE") {
        if ([string]$final.PrimaryMachine.status -ne "DEPLOYED_CONTRACT_OWNER" -or
            [string]$final.PrimaryMachine.ownerId -ne [string]$final.Assignment.ownerId) {
            throw "Release POST succeeded, but GET did not confirm the active-contract primary machine assigned to its Owner."
        }
    } elseif ([string]$state.PrimaryMachine.status -eq "UNDER_MAINTENANCE") {
        if ([string]$final.PrimaryMachine.status -ne "IN_WAREHOUSE" -or $null -ne $final.PrimaryMachine.ownerId) {
            throw "Release POST succeeded, but GET did not confirm the out-of-contract primary machine released from maintenance to warehouse."
        }
    } elseif ([string]$final.PrimaryMachine.status -ne [string]$state.PrimaryMachine.status -or
        [string]$final.PrimaryMachine.ownerId -ne [string]$state.PrimaryMachine.ownerId) {
        throw "Release POST changed the primary machine unexpectedly for the contract state."
    }
    Write-Output "Phase 5 read-after-write: OK (assignment=RELEASED; case=CLOSED; timeline=CASE_CLOSED; both return acknowledgments retained)."
    Write-Output "Machine lifecycle read-after-write: OK (replacement=IN_WAREHOUSE with Owner cleared; primary=$($final.PrimaryMachine.status))."

    $page = 0
    do {
        $workPage = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/technician/work-items?page=$page&size=100&workType=REPAIR")
        $workItems = if ($null -ne $workPage.PSObject.Properties["items"]) { @($workPage.items) } else { @() }
        $stillOpen = @($workItems | Where-Object { [string]$_.id -eq $CaseId -or [string]$_.detailPath -like "*/$CaseId" })
        if ($stillOpen.Count -gt 0) { throw "Closed RepairCase is still present in Technician REPAIR work items." }
        $hasNext = [bool]$workPage.hasNext
        $page++
        if ($hasNext -and $page -ge 100) { throw "Technician work-item pagination exceeded 100 pages; absence was not confirmed." }
    } while ($hasNext)
    Write-Output "TECH work-items read: OK (closed RepairCase is absent from open REPAIR work items)."

    Connect-Role -Role OWNER
    $ownerCase = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/repair-cases/$CaseId")
    if ([string]$ownerCase.id -ne $CaseId -or [string]$ownerCase.status -ne "CLOSED") {
        throw "Owner GET did not confirm the same RepairCase as CLOSED."
    }
    $page = 0
    do {
        $actionPage = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/dashboard/action-items?resourceType=REPAIR_CASE&page=$page&size=100")
        $actionItems = if ($null -ne $actionPage.PSObject.Properties["items"]) { @($actionPage.items) } else { @() }
        $stillActionable = @($actionItems | Where-Object { [string]$_.resourceId -eq $CaseId })
        if ($stillActionable.Count -gt 0) { throw "Closed RepairCase is still present in Owner dashboard action items." }
        $hasMore = [bool]$actionPage.hasMore
        $page++
        if ($hasMore -and $page -ge 100) { throw "Owner action-item pagination exceeded 100 pages; absence was not confirmed." }
    } while ($hasMore)
    Write-Output "OWNER dashboard read: OK (RepairCase is CLOSED and absent from actionable REPAIR_CASE items)."
    Write-Output "Phase 5 TEST ONLY run: $runId. Synthetic private reference only; no image was uploaded."
} finally {
    $script:accessToken = $null
    $plainPassword = $null
    $loginBody = $null
    $credential = $null
    $login = $null
}
