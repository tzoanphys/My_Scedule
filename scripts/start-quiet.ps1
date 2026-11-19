# Starts the existing diary when Windows signs in.
# Does not open a window and does not change the database.

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$drive = $root.Substring(0, 1).ToLower()
$wslRoot = "/mnt/$drive" + (($root.Substring(2)) -replace '\\', '/')

Start-Process -FilePath "wsl.exe" -ArgumentList @("-e", "bash", "$wslRoot/scripts/keep-wsl.sh") -WindowStyle Hidden
Start-Process -FilePath "wsl.exe" -ArgumentList @("-e", "bash", "$wslRoot/scripts/start-orbit.sh") -WindowStyle Hidden
