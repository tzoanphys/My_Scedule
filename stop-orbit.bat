@echo off
cd /d "%~dp0"
wsl -e bash /mnt/c/Users/tzoan/OneDrive/Desktop/My_Scedule/scripts/wsl-stop.sh
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'orbit-planner.jar' -or $_.CommandLine -match 'server\.mjs' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
