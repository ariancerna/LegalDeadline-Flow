#!/bin/bash
# Crea en Azure todo lo necesario para LegalDeadline Flow y espera a que la aplicación responda.
# Se ejecuta en Azure Cloud Shell (Bash), que ya tiene iniciada tu sesión:
#
#   curl -fsSL https://raw.githubusercontent.com/ariancerna/LegalDeadline-Flow/main/deploy/azure/crear-servidor.sh | bash
#
# Crea el grupo de recursos «rg-legaldeadline-flow» con:
#   - una máquina virtual Ubuntu Server 24.04 de las gratuitas de Azure for Students
#     (Standard_B2ats_v2; si no está disponible, Standard_B1s), que se instala sola con cloud-init.sh;
#   - una IP pública estática y el puerto 80 abierto. SSH no queda abierto a internet: el registro
#     de instalación se consulta con «az vm run-command» (ver docs/despliegue-azure.md).
# Si la región o el tamaño no están permitidos en la suscripción, prueba los siguientes.
# Si la máquina ya existe, no crea otra: muestra su dirección.
set -euo pipefail

GRUPO="rg-legaldeadline-flow"
VM="legaldeadline-flow"
REGIONES="${REGION:-eastus eastus2 centralus westus2 southcentralus brazilsouth canadacentral}"
TAMANOS="${TAMANO:-Standard_B2ats_v2 Standard_B1s}"
IMAGEN="Canonical:ubuntu-24_04-lts:server:latest"
CLOUD_INIT_URL="https://raw.githubusercontent.com/ariancerna/LegalDeadline-Flow/main/deploy/azure/cloud-init.sh"
ESPERA_MAX_MIN=45

paso() { printf '\n==> %s\n' "$*"; }

paso "Suscripción"
az account show --query "{nombre:name, id:id}" -o tsv

if az vm show -g "$GRUPO" -n "$VM" >/dev/null 2>&1; then
  echo "La máquina $VM ya existe; no se crea otra."
  az vm start -g "$GRUPO" -n "$VM" >/dev/null 2>&1 || true
else
  curl -fsSL "$CLOUD_INIT_URL" -o /tmp/legaldeadline-cloud-init.sh
  CREADA=""
  for REGION_ACTUAL in $REGIONES; do
    for TAMANO_ACTUAL in $TAMANOS; do
      paso "Creando la máquina en $REGION_ACTUAL ($TAMANO_ACTUAL)"
      if ! az group show -n "$GRUPO" >/dev/null 2>&1; then
        az group create -n "$GRUPO" -l "$REGION_ACTUAL" -o none || { echo "Región no permitida para grupos."; continue 2; }
      fi
      if az vm create -g "$GRUPO" -n "$VM" -l "$REGION_ACTUAL" \
          --image "$IMAGEN" --size "$TAMANO_ACTUAL" \
          --admin-username azureuser --generate-ssh-keys \
          --custom-data /tmp/legaldeadline-cloud-init.sh \
          --public-ip-sku Standard --nsg-rule NONE \
          --os-disk-size-gb 30 --storage-sku StandardSSD_LRS \
          -o none; then
        CREADA="$REGION_ACTUAL $TAMANO_ACTUAL"
        break 2
      fi
      echo "No se pudo con $TAMANO_ACTUAL en $REGION_ACTUAL; se prueba la siguiente opción."
      # Borra lo que haya quedado a medias (solo de este grupo, que no tiene máquina).
      az group delete -n "$GRUPO" --yes -o none || true
    done
  done
  if [ -z "$CREADA" ]; then
    echo "No se pudo crear la máquina con ninguna región ni tamaño. Revisa la sección «Si algo falla» de docs/despliegue-azure.md."
    exit 1
  fi
  echo "Máquina creada: $CREADA"

  paso "Abriendo el puerto 80"
  az vm open-port -g "$GRUPO" -n "$VM" --port 80 --priority 900 -o none
fi

IP=$(az vm show -d -g "$GRUPO" -n "$VM" --query publicIps -o tsv)
echo "IP: $IP"

paso "Esperando a que la aplicación responda en http://$IP (la primera vez tarda 20–30 minutos)"
# /api/v1/auth/me responde 401 (pide iniciar sesión) solo cuando nginx y el backend ya funcionan.
for ((min = 0; min <= ESPERA_MAX_MIN; min++)); do
  CODIGO=$(curl -s -o /dev/null --max-time 5 -w '%{http_code}' "http://$IP/api/v1/auth/me" || true)
  if [ "$CODIGO" = "401" ]; then break; fi
  printf '  %2d min: instalando...\n' "$min"
  sleep 60
done

CODIGO=$(curl -s -o /dev/null --max-time 5 -w '%{http_code}' "http://$IP/api/v1/auth/me" || true)
if [ "$CODIGO" = "401" ]; then
  printf '\nListo. Abre http://%s e inicia sesión con una cuenta demo.\n' "$IP"
else
  printf '\nLa instalación sigue en curso o falló. Para ver el avance, ejecuta en Cloud Shell:\n'
  printf '  az vm run-command invoke -g %s -n %s --command-id RunShellScript --scripts "tail -n 40 /var/log/legaldeadline-instalacion.log" --query "value[0].message" -o tsv\n' "$GRUPO" "$VM"
  printf 'La aplicación quedará en http://%s\n' "$IP"
fi
