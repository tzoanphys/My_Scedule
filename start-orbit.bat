@echo off
cd /d "%~dp0"
set "OPEN=1"
if /I "%~1"=="quiet" set "OPEN=0"
echo %date% %time% start>> "%~dp0backend\data\start.log"

rem After a reboot, WSL can sit forever on this call. Do not wait for it.
rem The page is the Windows Java and Node processes, which Chrome can open.
start "" /min powershell.exe -NoProfile -WindowStyle Hidden -Command "wsl.exe -e bash '/mnt/c/Users/tzoan/OneDrive/Desktop/My_Scedule/scripts/wsl-stop.sh'"

netstat -ano | findstr /C:":8089 " | findstr LISTENING >nul
if errorlevel 1 (
  if not exist "backend\data" mkdir "backend\data"
  powershell -NoProfile -Command "$env:ORBIT_ZONE='Europe/Paris'; Start-Process -FilePath 'java' -ArgumentList '-jar','target\orbit-planner.jar' -WorkingDirectory '%~dp0backend' -WindowStyle Hidden -RedirectStandardOutput '%~dp0backend\data\api.log' -RedirectStandardError '%~dp0backend\data\api-err.log'"
)

netstat -ano | findstr /C:":1989 " | findstr LISTENING >nul
if errorlevel 1 (
  powershell -NoProfile -Command "Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory '%~dp0frontend' -WindowStyle Hidden -RedirectStandardOutput '%~dp0backend\data\page.log' -RedirectStandardError '%~dp0backend\data\page-err.log'"
)

set /a tries=0
:waitpage
set /a tries+=1
curl.exe -4 -sf http://127.0.0.1:1989/api/health >nul 2>&1
if not errorlevel 1 goto ready
if %tries% GEQ 40 goto failed
ping 127.0.0.1 -n 2 >nul
goto waitpage

:ready
if "%OPEN%"=="1" start "" "http://localhost:1989"
exit /b 0

:failed
echo %date% %time% failed>> "%~dp0backend\data\start.log"
echo.
echo The planner did not open. See backend\data\api-err.log and backend\data\page-err.log
echo.
if "%OPEN%"=="0" exit /b 1
pause
exit /b 1
