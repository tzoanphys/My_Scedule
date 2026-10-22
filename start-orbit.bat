@echo off
cd /d "%~dp0"
wsl.exe -e bash /mnt/c/Users/tzoan/OneDrive/Desktop/My_Scedule/scripts/start-orbit.sh
if errorlevel 1 exit /b 1
if /I "%~1"=="quiet" exit /b 0
start "" "http://localhost:1989"
exit /b 0
