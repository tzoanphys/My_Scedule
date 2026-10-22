#!/bin/bash
cd /mnt/c/Users/tzoan/OneDrive/Desktop/My_Scedule || exit 1
ready=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
  if docker info >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" -ne 1 ]; then
  exit 1
fi
docker compose -f docker-compose.yml -f docker-compose.ports.yml up -d || exit 1
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
  if curl -sf http://127.0.0.1:1989/api/health >/dev/null 2>&1; then
    exit 0
  fi
  sleep 2
done
exit 1
