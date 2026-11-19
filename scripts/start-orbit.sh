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
compose() {
  docker compose -f docker-compose.yml -f docker-compose.ports.yml "$@"
}

compose up -d || exit 1

healthy() {
  curl -sf --max-time 3 http://127.0.0.1:19890/api/health >/dev/null 2>&1
}

frontend_ip() {
  docker inspect orbit-planner-frontend-1 --format '{{range $k, $v := .NetworkSettings.Networks}}{{$v.IPAddress}}{{end}}' 2>/dev/null || true
}

# A new Wi-Fi, or a restart, can leave the site running but unreachable
# on this laptop. Recreate only that container. The database volume stays.
for _ in 1 2 3 4 5 6 7 8; do
  if healthy; then
    exit 0
  fi
  if [ -z "$(frontend_ip)" ]; then
    break
  fi
  sleep 2
done

compose up -d --force-recreate --no-deps frontend || exit 1

for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  if healthy; then
    exit 0
  fi
  sleep 2
done
exit 1
