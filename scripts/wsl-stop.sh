#!/bin/bash
cd /mnt/c/Users/tzoan/OneDrive/Desktop/My_Scedule || exit 1
docker compose stop >/dev/null 2>&1 || true
pkill -f 'orbit-planner.jar' || true
pkill -f '/mnt/c/Users/tzoan/OneDrive/Desktop/My_Scedule/frontend/server.mjs' || true
exit 0
