#!/bin/bash
# Actualiza la máquina con la última versión de main. Se ejecuta dentro de la máquina:
#   sudo bash /opt/legaldeadline/deploy/azure/actualizar.sh
set -euo pipefail
cd /opt/legaldeadline
COMPOSE="docker compose -f compose.yaml -f deploy/azure/compose.azure.yaml"
git fetch --depth 1 origin main
git reset --hard origin/main
$COMPOSE build backend
$COMPOSE build frontend
$COMPOSE up -d
docker image prune -f
$COMPOSE ps
