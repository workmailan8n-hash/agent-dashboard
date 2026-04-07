$wsh = New-Object -ComObject WScript.Shell
$wsh.Run('cmd /k cd /d C:\AI\agent-dashboard && node server.js', 1, $false) | Out-Null
Write-Host "dashboard launched (detached)"
