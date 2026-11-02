param(
    [string]$CaseId = "255e53c8-8304-4cdd-98ba-0c98243304a7",
    [string]$CredentialPath = (Join-Path (Join-Path $env:USERPROFILE ".codex\repair-phase2-test") "technician.xml"),
    [switch]$RunPhase3
)

$ErrorActionPreference = "Stop"
$authBaseUrl = "http://100.75.202.72:4000/api/v1"
$doloresBaseUrl = "http://100.75.202.72:8082/api/v1"
$script:accessToken = $null

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

function Get-RequiredProperty {
    param([object]$Object, [Parameter(Mandatory)][string]$Name)
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property -or $null -eq $property.Value -or [string]::IsNullOrWhiteSpace([string]$property.Value)) {
        throw "The API response is missing required field '$Name'. No Phase 3 mutation was sent."
    }
    return $property.Value
}

try {
    if (-not (Test-Path -LiteralPath $CredentialPath)) {
        throw "TECH credential file not found: $CredentialPath"
    }

    try {
        $credential = Import-Clixml -LiteralPath $CredentialPath
    } catch {
        throw "Windows could not decrypt the TECH credential file. Run this script in the same Windows account/profile that created it."
    }

    $plainPassword = [System.Net.NetworkCredential]::new("", $credential.Password).Password
    $loginBody = @{ email = $credential.UserName; password = $plainPassword } | ConvertTo-Json -Compress
    try {
        $login = Invoke-RestMethod -Method Post -Uri "$authBaseUrl/auth/login" -ContentType "application/json" -Body $loginBody -TimeoutSec 30 -ErrorAction Stop
    } catch {
        $status = Get-HttpStatusCode $_
        throw "Fresh TECH login failed (HTTP $status). Check that the TECH credential is valid. No token was printed."
    }
    $plainPassword = $null
    $loginBody = $null
    $credential = $null

    if (-not $login.access_token) {
        if ($login.temp_token) {
            throw "TECH login requires MFA. No Phase 3 mutation was sent."
        }
        throw "TECH login did not return an access token. No Phase 3 mutation was sent."
    }
    $script:accessToken = [string]$login.access_token
    $login = $null
    Write-Output "Fresh TECH login: OK (token hidden; expires in about 900 seconds)."

    $case = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/repair-cases/$CaseId")
    if ([string]$case.id -ne $CaseId) { throw "GET returned a different RepairCase. No Phase 3 mutation was sent." }
    $ticketId = Get-RequiredProperty $case "maintenanceTicketId"
    $requestId = Get-RequiredProperty $case "maintenanceRequestId"
    $ticket = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/maintenance-tickets/$ticketId")
    $request = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/maintenance-requests/$requestId")
    $assignmentId = $request.replacementAssignmentId
    $assignmentSource = "maintenance request"
    if (-not $assignmentId) {
        $workItemsResponse = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/technician/work-items?page=0&size=50&workType=REPAIR")
        $workItems = if ($null -ne $workItemsResponse.PSObject.Properties["items"]) { $workItemsResponse.items } else { $workItemsResponse }
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
    if (-not $assignmentId) {
        throw "Neither the maintenance request nor the Technician work-item returned a replacement assignment ID. No Phase 3 mutation was sent."
    }
    $assignment = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/replacement-assignments/$assignmentId")
    $custodyResponse = Invoke-DoloresApi -Method GET -Path "/repair-cases/$CaseId/custody-events?page=0&size=50"
    $custody = Get-ResponseData $custodyResponse
    if ($custody -isnot [array]) {
        if ($null -ne $custody.PSObject.Properties["items"]) { $custody = $custody.items }
        elseif ($null -ne $custody.PSObject.Properties["content"]) { $custody = $custody.content }
        else { throw "Custody response did not contain a list. No Phase 3 mutation was sent." }
    }
    $deliveryEvent = @($custody | Where-Object { $_.eventType -eq "REPLACEMENT_DELIVERED" } | Select-Object -First 1)

    Write-Output "Preflight: case=$($case.status); ticket=$($ticket.status); assignment=$($assignment.status); assignmentSource=$assignmentSource; caseId=$CaseId; ticketId=$ticketId"
    if ([string]$ticket.repairCaseId -ne $CaseId -or [string]$assignment.repairCaseId -ne $CaseId) {
        throw "Ticket or assignment does not belong to this case. No Phase 3 mutation was sent."
    }
    if ([string]$assignment.status -ne "ACTIVE") { throw "Replacement assignment is not ACTIVE. No Phase 3 mutation was sent." }
    if ($deliveryEvent.Count -eq 0 -or -not $deliveryEvent[0].ownerAcknowledgedAt) {
        throw "Owner has not acknowledged REPLACEMENT_DELIVERED. No Phase 3 mutation was sent."
    }
    if ([string]$deliveryEvent[0].machineId -ne [string]$assignment.replacementMachineId) {
        throw "Acknowledged delivery event does not refer to the replacement machine. No Phase 3 mutation was sent."
    }
    if ([string]$case.status -ne "REPLACEMENT_DELIVERED" -or [string]$ticket.status -ne "ASSIGNED") {
        throw "Case/ticket are not at the Phase 3 entry state. No Phase 3 mutation was sent."
    }

    if (-not $RunPhase3) {
        Write-Output "Preflight passed. No mutations were sent. Re-run with -RunPhase3 to write TEST ONLY diagnosis/work evidence and advance this case."
        return
    }

    $runId = [guid]::NewGuid().ToString("N")
    $diagnosis = "TEST ONLY: Phase 3 API verification $runId; synthetic diagnosis, no real repair data."
    $workScope = "TEST ONLY: Phase 3 API verification $runId; synthetic work scope."
    $diagnosisEvidence = "private/repair-phase3-test/$CaseId/$runId/diagnosis.txt"
    $completionEvidence = "private/repair-phase3-test/$CaseId/$runId/completion.txt"

    $null = Invoke-DoloresApi -Method POST -Path "/repair-cases/$CaseId/diagnosis" -Body @{
        diagnosis = $diagnosis
        evidenceReference = $diagnosisEvidence
    }
    $case = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/repair-cases/$CaseId")
    $ticket = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/maintenance-tickets/$ticketId")
    if ([string]$case.status -ne "DIAGNOSIS" -or [string]$ticket.status -ne "ASSIGNED" -or [string]$ticket.diagnosis -ne $diagnosis) {
        throw "Diagnosis POST returned, but GET read-after-write did not confirm DIAGNOSIS/ASSIGNED. Stopped before work start."
    }
    Write-Output "Diagnosis read-after-write: OK (case=DIAGNOSIS; ticket=ASSIGNED)."

    $null = Invoke-DoloresApi -Method POST -Path "/repair-cases/$CaseId/work/start" -Body @{ workScope = $workScope }
    $case = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/repair-cases/$CaseId")
    $ticket = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/maintenance-tickets/$ticketId")
    if ([string]$case.status -ne "REPAIR_IN_PROGRESS" -or [string]$ticket.status -ne "IN_PROGRESS") {
        throw "Work-start POST returned, but GET read-after-write did not confirm REPAIR_IN_PROGRESS/IN_PROGRESS. Stopped before completion."
    }
    Write-Output "Work-start read-after-write: OK (case=REPAIR_IN_PROGRESS; ticket=IN_PROGRESS)."

    $null = Invoke-DoloresApi -Method POST -Path "/repair-cases/$CaseId/work/complete" -Body @{
        diagnosis = $diagnosis
        resolutionResult = "TEST ONLY: Phase 3 API verification $runId; synthetic completion result."
        workScope = $workScope
        evidenceReferences = @($completionEvidence)
        notes = "TEST ONLY: no image uploaded; synthetic reference used for API verification."
    }
    $case = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/repair-cases/$CaseId")
    $ticket = Get-ResponseData (Invoke-DoloresApi -Method GET -Path "/maintenance-tickets/$ticketId")
    if ([string]$case.status -ne "REPAIR_COMPLETED" -or [string]$ticket.status -ne "RESOLVED") {
        throw "Completion POST returned, but GET read-after-write did not confirm REPAIR_COMPLETED/RESOLVED."
    }
    Write-Output "Work-completion read-after-write: OK (case=REPAIR_COMPLETED; ticket=RESOLVED)."
    Write-Output "Phase 3 TEST ONLY run: $runId. No image was uploaded; references were recorded by the backend."
} finally {
    $script:accessToken = $null
    $plainPassword = $null
    $loginBody = $null
    $credential = $null
    $login = $null
}
