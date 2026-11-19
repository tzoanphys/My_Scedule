# Opens the existing diary on this laptop.
# The window does not use Wi-Fi. Does not delete or replace the database.

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$drive = $root.Substring(0, 1).ToLower()
$wslRoot = "/mnt/$drive" + (($root.Substring(2)) -replace '\\', '/')

function Show-Note([string]$text) {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($text, "Orbit Planner") | Out-Null
}

Start-Process -FilePath "wsl.exe" -ArgumentList @("-e", "bash", "$wslRoot/scripts/keep-wsl.sh") -WindowStyle Hidden
$start = Start-Process -FilePath "wsl.exe" -ArgumentList @("-e", "bash", "$wslRoot/scripts/start-orbit.sh") -Wait -PassThru -WindowStyle Hidden
if ($start.ExitCode -ne 0) {
    Show-Note "Orbit Planner could not start. Open Docker Desktop, wait until it is running, then try again. Your diary was not changed."
    exit 1
}

$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
Start-Process -FilePath $edge -ArgumentList @("--app=http://127.0.0.1:19890")
