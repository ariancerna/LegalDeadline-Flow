#!/bin/bash
# Arranque de LegalDeadline Flow en un servidor EC2 con Amazon Linux 2023.
# Se pega en «Detalles avanzados → Datos de usuario» al crear la instancia y corre una sola vez,
# como root, en el primer arranque. Tarda unos 10 minutos (descarga y compila todo).
# Registro: /var/log/legaldeadline-instalacion.log
set -euxo pipefail
exec > >(tee -a /var/log/legaldeadline-instalacion.log) 2>&1

REPO_URL="https://github.com/ariancerna/LegalDeadline-Flow.git"
RAMA="main"
DIR="/opt/legaldeadline"

# 1. Docker, Git y los complementos compose y buildx (Amazon Linux no los trae).
dnf install -y docker git openssl
systemctl enable --now docker
ARQ="$(uname -m)"                                   # x86_64 o aarch64
case "$ARQ" in x86_64) BX=amd64 ;; aarch64) BX=arm64 ;; *) echo "Arquitectura no soportada: $ARQ"; exit 1 ;; esac
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-${ARQ}" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
curl -fsSL "https://github.com/docker/buildx/releases/download/v0.20.1/buildx-v0.20.1.linux-${BX}" \
  -o /usr/local/lib/docker/cli-plugins/docker-buildx
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/lib/docker/cli-plugins/docker-buildx

# 2. 2 GB de memoria de intercambio: la compilación de Java y Angular la necesita en 2 GB de RAM.
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
fi

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

# 5. Compila y levanta frontend, backend y PostgreSQL. Con «restart: unless-stopped» vuelven a
#    arrancar solos cuando el servidor se reinicia (por ejemplo, al iniciar el laboratorio).
docker compose -f compose.yaml -f deploy/aws/compose.aws.yaml up -d --build

echo "LegalDeadline Flow instalado. Abre http://<IP pública del servidor>"
