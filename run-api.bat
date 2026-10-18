@echo off
cd /d "%~dp0backend"
set ORBIT_ZONE=Europe/Paris
if not exist "data" mkdir "data"
java -jar "%~dp0backend\target\orbit-planner.jar" >> "%~dp0backend\data\api.log" 2>&1
