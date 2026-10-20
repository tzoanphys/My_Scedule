@echo off
cd /d "%~dp0"
wsl.exe -e bash -lc "cd '/mnt/c/Users/tzoan/OneDrive/Desktop/My_Scedule' && docker compose -f docker-compose.yml -f docker-compose.ports.yml down"
