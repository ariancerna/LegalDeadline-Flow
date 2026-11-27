# Despliegue en Azure (Azure for Students)

Toda la aplicación corre en **una máquina virtual de Azure** con Docker Compose:

```
Navegador ──HTTP:80──▶ VM Ubuntu Server 24.04 (B2ats v2 o B1s, 1 GB de RAM)
                        ├─ frontend  nginx: sirve Angular y reenvía /api al backend
                        ├─ backend   Spring Boot (puerto 8081, solo dentro de la máquina)
                        └─ db        PostgreSQL 17 (puerto 5432, solo dentro de la máquina)
```

- Solo el puerto 80 queda abierto a internet. SSH no queda expuesto: la máquina se revisa desde Cloud Shell con `az vm run-command`.
- Los datos se guardan en un volumen de Docker en el disco de la máquina y sobreviven a los reinicios.
- Al arrancar por primera vez, el backend crea las cuentas demo y la cartera de 5000 expedientes de 10 años.
- Las contraseñas de la base y del JWT se generan en la máquina; no están en el repositorio.

Archivos en el repositorio:

| Archivo | Para qué sirve |
|---|---|
| `deploy/azure/crear-servidor.sh` | Se ejecuta en Azure Cloud Shell: crea la máquina, la IP y el puerto 80, y espera a que la app responda |
| `deploy/azure/cloud-init.sh` | Corre en el primer arranque de la máquina: memoria de intercambio, Docker, el proyecto y sus secretos |
| `deploy/azure/compose.azure.yaml` | Capa sobre `compose.yaml`: publica el puerto 80 y ajusta la memoria a 1 GB |
| `deploy/azure/actualizar.sh` | Actualiza la máquina con la última versión de `main` |

## 1. Crear la cuenta de Azure for Students

Azure for Students da **$100 de crédito por 12 meses, sin tarjeta**, y un año de servicios gratuitos, entre ellos 750 horas al mes de las máquinas B1s y B2ats v2 que usa esta guía.

1. Entra a <https://azure.microsoft.com/free/students> y pulsa **Empezar gratis** (Start free).
2. Inicia sesión con tu **correo de la universidad** (`@utp.edu.pe`). Si te pide crear una cuenta de Microsoft con ese correo, créala.
3. Completa la verificación de estudiante y tus datos. Si te pide un teléfono, usa tu celular con **+51**.
4. Acepta los términos. Al terminar entras al **portal de Azure** (<https://portal.azure.com>) con la suscripción **Azure for Students**.

Cuando el crédito se acaba, Azure deshabilita la suscripción y te avisa por correo para que decidas si pasar al pago por uso; no la cambia sola.

## 2. Crear todo con un comando (Cloud Shell)

1. En el portal, pulsa el ícono **`>_` (Cloud Shell)** de la barra superior.
2. La primera vez elige **Bash**. Si te pregunta por almacenamiento, elige **No se requiere ninguna cuenta de almacenamiento** (o la opción que no crea una cuenta) y tu suscripción **Azure for Students**.
3. Pega esta línea y pulsa Enter:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/ariancerna/LegalDeadline-Flow/main/deploy/azure/crear-servidor.sh | bash
   ```

4. El script muestra cada paso y luego «instalando…» cada minuto. La primera vez tarda **20–30 minutos**, porque la máquina compila el backend y el frontend con solo 1 GB de memoria. Termina con:

   ```
   Listo. Abre http://<IP> e inicia sesión con una cuenta demo.
   ```

Si Cloud Shell se cierra mientras espera, la máquina sigue instalándose igual: vuelve a pegar la misma línea y el script no crea otra máquina, solo espera a que responda.

La IP es **estática**: no cambia aunque la máquina se reinicie.

## 3. Crear la máquina a mano (si no usas Cloud Shell)

En el portal: **Máquinas virtuales → Crear → Máquina virtual de Azure**.

1. **Suscripción:** Azure for Students. **Grupo de recursos:** nuevo, `rg-legaldeadline-flow`.
2. **Nombre:** `legaldeadline-flow`. **Región:** East US (si no está permitida, otra de la lista).
3. **Imagen:** **Ubuntu Server 24.04 LTS - x64 Gen2**.
4. **Tamaño:** **Standard_B2ats_v2** o **Standard_B1s** (las dos tienen 750 horas gratis al mes el primer año).
5. **Autenticación:** clave pública SSH (deja que Azure la genere).
6. **Puertos de entrada públicos:** permite **HTTP (80)**. No hace falta SSH.
7. **Discos:** SSD estándar.
8. **Opciones avanzadas → Datos personalizados:** pega el contenido completo de [`deploy/azure/cloud-init.sh`](../deploy/azure/cloud-init.sh).
9. **Revisar y crear → Crear.** Cuando termine, abre la máquina, copia la **dirección IP pública** y, tras 20–30 minutos, abre `http://<IP>`.

## 4. Revisar la máquina

Todo se hace desde Cloud Shell, sin SSH:

```bash
az vm run-command invoke -g rg-legaldeadline-flow -n legaldeadline-flow --command-id RunShellScript --scripts "tail -n 40 /var/log/legaldeadline-instalacion.log" --query "value[0].message" -o tsv
```

Estado de los servicios:

```bash
az vm run-command invoke -g rg-legaldeadline-flow -n legaldeadline-flow --command-id RunShellScript --scripts "cd /opt/legaldeadline && docker compose -f compose.yaml -f deploy/azure/compose.azure.yaml ps" --query "value[0].message" -o tsv
```

## 5. Actualizar con cambios nuevos

Después de hacer push a `main`:

```bash
az vm run-command invoke -g rg-legaldeadline-flow -n legaldeadline-flow --command-id RunShellScript --scripts "bash /opt/legaldeadline/deploy/azure/actualizar.sh" --query "value[0].message" -o tsv
```

Recompila y reinicia los servicios conservando los datos. Tarda varios minutos.

## 6. Costos y apagado

- La máquina B2ats v2 o B1s entra en las 750 horas gratis al mes del primer año: puede quedar encendida todo el mes.
- La IP pública y el disco consumen un poco del crédito de $100.
- Para revisar el consumo: portal → **Suscripciones → Azure for Students → Análisis de costos**.
- Al terminar el curso, borra todo de una vez:

  ```bash
  az group delete -n rg-legaldeadline-flow --yes
  ```

## 7. Si algo falla

| Síntoma | Qué revisar |
|---|---|
| El script dice que no pudo crear la máquina | La suscripción de estudiante solo permite algunas regiones y tamaños. En el portal, la lista de regiones permitidas aparece al crear una máquina. Vuelve a ejecutar el script indicando una de ellas, por ejemplo: `curl -fsSL https://raw.githubusercontent.com/ariancerna/LegalDeadline-Flow/main/deploy/azure/crear-servidor.sh \| REGION=westeurope bash` |
| La página no carga | Que la dirección empiece con `http://` y que la instalación haya terminado (sección 4). |
| La página carga pero el login falla | Que el backend esté `healthy` (sección 4). La primera vez tarda más porque genera los 5000 expedientes. |
| La instalación se detuvo con un error | Mira el final del registro (sección 4). Para reintentar: `--scripts "cd /opt/legaldeadline && docker compose -f compose.yaml -f deploy/azure/compose.azure.yaml up -d --build"`. |

La aplicación se sirve por **HTTP**. Para HTTPS hace falta un dominio y un certificado; no es necesario para la presentación.

## Verificación hecha antes de publicar esta guía

- La compilación del backend (Maven) y del frontend (Angular) se probó dentro de contenedores limitados a **1 GB de RAM y 1 procesador**: 11 s y 13 s en este equipo; en la máquina de Azure, con un procesador más lento y descargando dependencias, tarda más.
- Con los límites de `compose.azure.yaml`, los tres servicios arrancan sanos y usan unos **280 MB** en total (backend ~217 MB, PostgreSQL ~56 MB, nginx ~5 MB); el backend genera los 5000 expedientes en segundos.
- Una prueba de humo con Playwright contra el puerto 80 pasó **29 comprobaciones**: login de los 4 roles, tablero, calendario de 14 días, listas, permisos del menú por rol y el gráfico de 10 años.
- `crear-servidor.sh` se probó con un `az` simulado: cuenta nueva, región prohibida con tamaño no disponible (pasa a la siguiente opción y limpia lo que quedó a medias) y máquina ya existente (no crea otra).
- Los paquetes que instala `cloud-init.sh` (`docker.io`, `docker-compose-v2`, `docker-buildx`, `git`, `openssl`) existen en Ubuntu 24.04.
