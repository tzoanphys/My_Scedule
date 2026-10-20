@echo off
cd /d "%~dp0"
wsl.exe -e bash -lc "cd '/mnt/c/Users/tzoan/OneDrive/Desktop/My_Scedule' && docker compose -f docker-compose.yml -f docker-compose.ports.yml up -d"
if errorlevel 1 exit /b 1
if /I "%~1"=="quiet" exit /b 0
start "" "http://localhost:1989"
exit /b 0
