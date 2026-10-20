#!/bin/bash
cd /mnt/c/Users/tzoan/OneDrive/Desktop/My_Scedule || exit 1
docker compose -f docker-compose.yml -f docker-compose.ports.yml down
exit 0
