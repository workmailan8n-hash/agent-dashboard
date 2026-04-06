# Remove old sprint tasks and create new ones at 12,15,18,21,00
$old = @(10,12,14,16,18,20,22)
foreach ($h in $old) {
    try {
        Unregister-ScheduledTask -TaskName "AgentDashboardSprint_$h" -Confirm:$false -ErrorAction Stop
        Write-Host "removed AgentDashboardSprint_$h"
    } catch {
        Write-Host "skip AgentDashboardSprint_$h"
    }
}

$new = @(12,15,18,21,0)
foreach ($h in $new) {
    $name = "AgentDashboardSprint_{0:D2}" -f $h
    $time = "{0:D2}:00" -f $h
    $action = New-ScheduledTaskAction -Execute "C:\AI\agent-dashboard\sprint.bat"
    $trigger = New-ScheduledTaskTrigger -Daily -At $time
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
    Write-Host "created $name at $time"
}

Get-ScheduledTask -TaskName 'AgentDashboardSprint_*' | Get-ScheduledTaskInfo | Select TaskName,NextRunTime | Format-Table -AutoSize
