#!/bin/bash
# Crea en AWS todo lo necesario para LegalDeadline Flow y espera a que la aplicación responda.
# Se ejecuta en AWS CloudShell (la terminal de la consola de AWS, ya autenticada con tu cuenta):
#
#   curl -fsSL https://raw.githubusercontent.com/ariancerna/LegalDeadline-Flow/main/deploy/aws/crear-servidor.sh | bash
#
# Crea, en la región elegida en la consola:
#   - un grupo de seguridad «legaldeadline-flow»: HTTP (80) abierto y SSH (22) solo para la
#     terminal del navegador (EC2 Instance Connect);
#   - una instancia EC2 Amazon Linux 2023 (t3.small; si el plan no la permite, t3.micro) con
#     20 GB gp3 que se instala sola con deploy/aws/user-data.sh;
#   - una IP elástica asociada, para que la dirección no cambie al reiniciar.
# Si ya existe una instancia con ese nombre, no crea otra: muestra su dirección.
set -euo pipefail

NOMBRE="legaldeadline-flow"
TIPOS="${TIPO:-t3.small t3.micro}"
USER_DATA_URL="https://raw.githubusercontent.com/ariancerna/LegalDeadline-Flow/main/deploy/aws/user-data.sh"
ESPERA_MAX_MIN=40

paso() { printf '\n==> %s\n' "$*"; }

REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || true)}"
if [ -z "$REGION" ]; then
  echo "No se encontró la región. Elige una arriba a la derecha en la consola y vuelve a abrir CloudShell."
  exit 1
fi
export AWS_DEFAULT_REGION="$REGION"
paso "Región: $REGION"

paso "Buscando una instancia existente"
EXISTENTE=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$NOMBRE" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[].Instances[].InstanceId' --output text)
if [ -n "$EXISTENTE" ] && [ "$EXISTENTE" != "None" ]; then
  ID=$(echo "$EXISTENTE" | awk '{print $1}')
  echo "Ya existe la instancia $ID; no se crea otra."
else
  paso "Red por defecto"
  VPC=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)
  if [ "$VPC" = "None" ] || [ -z "$VPC" ]; then
    echo "Esta región no tiene la red (VPC) por defecto. Créala en VPC → Acciones → Crear VPC predeterminada y vuelve a ejecutar."
    exit 1
  fi
  echo "VPC: $VPC"

  paso "Grupo de seguridad"
  SG=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$NOMBRE" "Name=vpc-id,Values=$VPC" \
    --query 'SecurityGroups[0].GroupId' --output text)
  if [ "$SG" = "None" ] || [ -z "$SG" ]; then
    SG=$(aws ec2 create-security-group --group-name "$NOMBRE" --vpc-id "$VPC" \
      --description "LegalDeadline Flow: HTTP publico y SSH para EC2 Instance Connect" \
      --query GroupId --output text)
    aws ec2 authorize-security-group-ingress --group-id "$SG" \
      --ip-permissions 'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0,Description=Aplicacion}]' >/dev/null
    # SSH solo desde el servicio de EC2 Instance Connect de la región (la terminal del navegador).
    PL=$(aws ec2 describe-managed-prefix-lists \
      --filters "Name=prefix-list-name,Values=com.amazonaws.$REGION.ec2-instance-connect" \
      --query 'PrefixLists[0].PrefixListId' --output text 2>/dev/null || echo None)
    if [ "$PL" != "None" ] && [ -n "$PL" ]; then
      aws ec2 authorize-security-group-ingress --group-id "$SG" \
        --ip-permissions "IpProtocol=tcp,FromPort=22,ToPort=22,PrefixListIds=[{PrefixListId=$PL,Description=EC2InstanceConnect}]" >/dev/null
    else
      aws ec2 authorize-security-group-ingress --group-id "$SG" \
        --ip-permissions 'IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=0.0.0.0/0,Description=SSH}]' >/dev/null
    fi
    echo "Creado $SG"
  else
    echo "Se reutiliza $SG"
  fi

  paso "Imagen Amazon Linux 2023"
  AMI=$(aws ssm get-parameter \
    --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
    --query Parameter.Value --output text)
  echo "AMI: $AMI"

  curl -fsSL "$USER_DATA_URL" -o /tmp/legaldeadline-user-data.sh

  ID=""
  for TIPO_ACTUAL in $TIPOS; do
    paso "Creando la instancia ($TIPO_ACTUAL)"
    if ID=$(aws ec2 run-instances \
        --image-id "$AMI" --instance-type "$TIPO_ACTUAL" --count 1 \
        --security-group-ids "$SG" \
        --user-data file:///tmp/legaldeadline-user-data.sh \
        --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":20,"VolumeType":"gp3","DeleteOnTermination":true}}]' \
        --metadata-options HttpTokens=required \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$NOMBRE}]" \
        --query 'Instances[0].InstanceId' --output text); then
      echo "Instancia $ID ($TIPO_ACTUAL)"
      break
    fi
    echo "No se pudo crear con $TIPO_ACTUAL; se prueba el siguiente tipo."
    ID=""
  done
  if [ -z "$ID" ]; then
    echo "No se pudo crear la instancia con ninguno de estos tipos: $TIPOS"
    exit 1
  fi
fi

paso "Esperando a que la instancia esté encendida"
ESTADO=$(aws ec2 describe-instances --instance-ids "$ID" --query 'Reservations[0].Instances[0].State.Name' --output text)
if [ "$ESTADO" = "stopped" ]; then
  aws ec2 start-instances --instance-ids "$ID" >/dev/null
fi
aws ec2 wait instance-running --instance-ids "$ID"

paso "IP elástica"
IP=$(aws ec2 describe-addresses --filters "Name=instance-id,Values=$ID" --query 'Addresses[0].PublicIp' --output text)
if [ "$IP" = "None" ] || [ -z "$IP" ]; then
  ALLOC=$(aws ec2 allocate-address --domain vpc \
    --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=$NOMBRE}]" \
    --query AllocationId --output text)
  aws ec2 associate-address --instance-id "$ID" --allocation-id "$ALLOC" >/dev/null
  IP=$(aws ec2 describe-addresses --allocation-ids "$ALLOC" --query 'Addresses[0].PublicIp' --output text)
fi
echo "IP: $IP"

paso "Esperando a que la aplicación responda en http://$IP (la primera vez tarda 10–30 minutos)"
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
  printf '\nLa instalación sigue en curso o falló. Revisa el avance conectándote a la instancia %s\n' "$ID"
  printf '(EC2 → Instancias → Conectar → EC2 Instance Connect) y ejecuta:\n'
  printf '  sudo tail -n 50 /var/log/legaldeadline-instalacion.log\n'
  printf 'La aplicación quedará en http://%s\n' "$IP"
fi
