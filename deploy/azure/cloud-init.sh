#!/bin/bash
# Instalación de LegalDeadline Flow en una máquina virtual de Azure con Ubuntu Server 24.04.
# Se pega en «Opciones avanzadas → Datos personalizados» al crear la máquina (o lo envía
# crear-servidor.sh) y corre una sola vez, como root, en el primer arranque.
# Con 1 GB de RAM tarda unos 20–30 minutos. Registro: /var/log/legaldeadline-instalacion.log
set -euxo pipefail
exec > >(tee -a /var/log/legaldeadline-instalacion.log) 2>&1

REPO_URL="https://github.com/ariancerna/LegalDeadline-Flow.git"
RAMA="main"
DIR="/opt/legaldeadline"
COMPOSE="docker compose -f compose.yaml -f deploy/azure/compose.azure.yaml"

# 1. Memoria de intercambio de 4 GB: compilar Java y Angular necesita más de 1 GB.
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
  sysctl -w vm.swappiness=60
fi

# 2. Docker con Compose y Buildx (paquetes de Ubuntu) y Git.
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q docker.io docker-compose-v2 docker-buildx git openssl
systemctl enable --now docker

# 3. Código del proyecto.
if [ ! -d "$DIR/.git" ]; then
  git clone --depth 1 --branch "$RAMA" "$REPO_URL" "$DIR"
fi
cd "$DIR"

# 4. Secretos generados en el servidor (no se guardan en el repositorio). Solo la primera vez.
if [ ! -f .env ]; then
  umask 077
  cat > .env <<ENV
DB_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 48)
SPRING_PROFILES_ACTIVE=demo
DEMO_ENABLED=true
ENV
fi

# 5. Compila una imagen a la vez (en paralelo no caben en 1 GB) y levanta todo.
#    Con «restart: unless-stopped» los servicios vuelven a arrancar solos si la máquina se reinicia.
$COMPOSE build backend
$COMPOSE build frontend
$COMPOSE up -d
docker image prune -f

echo "LegalDeadline Flow instalado. Abre http://<IP pública de la máquina>"
