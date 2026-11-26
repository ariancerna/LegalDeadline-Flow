#!/bin/bash
# Actualiza el servidor con la última versión de main. Se ejecuta dentro del servidor:
#   sudo bash /opt/legaldeadline/deploy/aws/actualizar.sh
set -euo pipefail
cd /opt/legaldeadline
git fetch --depth 1 origin main
git reset --hard origin/main
docker compose -f compose.yaml -f deploy/aws/compose.aws.yaml up -d --build
docker image prune -f
docker compose -f compose.yaml -f deploy/aws/compose.aws.yaml ps
