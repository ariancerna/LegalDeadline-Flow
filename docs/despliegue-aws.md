# Despliegue en AWS (EC2)

Toda la aplicación corre en **un servidor EC2** de AWS con Docker Compose:

```
Navegador ──HTTP:80──▶ EC2 (Amazon Linux 2023, t3.small)
                        ├─ frontend  nginx: sirve Angular y reenvía /api al backend
                        ├─ backend   Spring Boot (puerto 8081, solo dentro del servidor)
                        └─ db        PostgreSQL 17 (puerto 5432, solo dentro del servidor)
```

- Solo el puerto 80 queda abierto a internet. La base de datos y el backend no se pueden alcanzar desde fuera.
- Los datos se guardan en un volumen de Docker en el disco del servidor y sobreviven a los reinicios.
- Al arrancar por primera vez, el backend crea las cuentas demo y la cartera de 5000 expedientes de 10 años.
- Las contraseñas de la base y del JWT se generan en el servidor; no están en el repositorio.

Archivos en el repositorio:

| Archivo | Para qué sirve |
|---|---|
| `deploy/aws/user-data.sh` | Se pega al crear la instancia: instala Docker, descarga el proyecto y lo levanta |
| `deploy/aws/compose.aws.yaml` | Capa sobre `compose.yaml`: publica el puerto 80 y limita la memoria a 2 GB |
| `deploy/aws/actualizar.sh` | Actualiza el servidor con la última versión de `main` |

Funciona igual con **AWS Academy (Learner Lab)** o con una **cuenta propia** con el plan gratuito.

## 1. Entrar a la consola

- **AWS Academy:** en el curso, abre **Learner Lab**, pulsa **Start Lab** y espera a que el círculo junto a «AWS» se ponga verde. Pulsa **AWS** para abrir la consola. Usa la región **N. Virginia (us-east-1)**.
- **Cuenta propia:** entra a <https://console.aws.amazon.com> y elige una región arriba a la derecha (por ejemplo, **N. Virginia (us-east-1)**).

## 2. Crear el servidor

En la consola busca **EC2** → **Instancias** → **Lanzar instancias** y completa:

1. **Nombre:** `legaldeadline-flow`.
2. **Imagen (AMI):** **Amazon Linux 2023** (la primera de la lista, 64 bits x86).
3. **Tipo de instancia:** **t3.small** (2 GB de RAM). Con t3.micro (1 GB) la compilación es muy lenta y puede fallar.
4. **Par de claves:** en AWS Academy elige **vockey**. En una cuenta propia, **Crear un nuevo par de claves** (no hace falta si solo usarás la conexión desde el navegador).
5. **Configuración de red → Editar → Firewall (grupos de seguridad) → Crear grupo de seguridad**:
   - Deja la regla **SSH (22)** con origen **Cualquier lugar (0.0.0.0/0)**. La terminal en el navegador (EC2 Instance Connect) entra desde servidores de AWS, no desde tu IP; el acceso sigue protegido porque exige la clave que AWS entrega en cada conexión.
   - **Agregar regla de grupo de seguridad:** tipo **HTTP**, puerto **80**, origen **Cualquier lugar (0.0.0.0/0)**.
6. **Configurar almacenamiento:** **20 GiB**, tipo **gp3**.
7. **Detalles avanzados → Datos de usuario:** pega el contenido completo de [`deploy/aws/user-data.sh`](../deploy/aws/user-data.sh).
8. Pulsa **Lanzar instancia**.

## 3. Esperar a que termine la instalación (unos 10–15 minutos)

El servidor instala Docker, descarga el proyecto y compila el backend y el frontend. Para ver el avance:

1. En **Instancias**, selecciona `legaldeadline-flow` → **Conectar** → pestaña **EC2 Instance Connect** → **Conectar**. Se abre una terminal en el navegador.
2. Escribe:

   ```bash
   sudo tail -f /var/log/legaldeadline-instalacion.log
   ```

   Termina cuando aparece `LegalDeadline Flow instalado`. Sal con `Ctrl+C`.
3. Comprueba que los tres servicios estén `healthy` o `Up`:

   ```bash
   cd /opt/legaldeadline && sudo docker compose -f compose.yaml -f deploy/aws/compose.aws.yaml ps
   ```

## 4. Abrir la aplicación

En **Instancias**, copia la **Dirección IPv4 pública** y ábrela en el navegador como `http://<IP>` (con **http**, no https). Inicia sesión con cualquiera de las cuentas demo del login.

## 5. Dirección fija (recomendado)

La IP pública cambia cada vez que el servidor se detiene y vuelve a arrancar (en AWS Academy, cada vez que termina la sesión del laboratorio). Para que no cambie:

1. **EC2 → Direcciones IP elásticas → Asignar la dirección IP elástica → Asignar**.
2. Selecciónala → **Acciones → Asociar la dirección IP elástica** → elige la instancia `legaldeadline-flow` → **Asociar**.

Desde ahí la aplicación queda siempre en `http://<IP elástica>`.

## 6. Actualizar con cambios nuevos

Después de hacer push a `main`, conéctate al servidor (paso 3) y ejecuta:

```bash
sudo bash /opt/legaldeadline/deploy/aws/actualizar.sh
```

Descarga la última versión, recompila y reinicia los servicios. Los datos se conservan.

## 7. Apagar y costos

- **AWS Academy:** al terminar la sesión del laboratorio, el servidor se detiene solo y se enciende al volver a pulsar **Start Lab**. Los servicios arrancan solos (tardan 1–2 minutos). El día de la presentación, inicia el laboratorio unos minutos antes. El crédito del laboratorio se consume mientras el servidor está encendido.
- **Cuenta propia (plan gratuito):** la instancia, el disco y la IP se pagan con los créditos del plan. Cuando no la uses, **Estado de la instancia → Detener**; vuelve a **Iniciar** antes de usarla. Al terminar el curso, **Terminar instancia** y **Liberar** la IP elástica para que no sigan consumiendo crédito.

## 8. Si algo falla

| Síntoma | Qué revisar |
|---|---|
| La página no carga | Que la regla **HTTP 80** esté en el grupo de seguridad y que la dirección empiece con `http://`. |
| La página carga pero el login falla | Que el backend esté `healthy` (paso 3). La primera vez tarda más porque genera los 5000 expedientes. |
| La instalación se detuvo con un error | Revisa el final de `/var/log/legaldeadline-instalacion.log`. Para reintentar: `cd /opt/legaldeadline && sudo docker compose -f compose.yaml -f deploy/aws/compose.aws.yaml up -d --build`. |
| Ver los mensajes del backend | `cd /opt/legaldeadline && sudo docker compose -f compose.yaml -f deploy/aws/compose.aws.yaml logs --tail 100 backend` |
| Volver a cargar los datos desde cero | `cd /opt/legaldeadline && sudo docker compose -f compose.yaml -f deploy/aws/compose.aws.yaml down -v` y luego `up -d`. Borra todo lo registrado. |

La aplicación se sirve por **HTTP**. Para HTTPS hace falta un dominio propio y un certificado (por ejemplo, con Amazon CloudFront delante del servidor); no es necesario para la presentación.

## Verificación hecha antes de publicar esta guía

Con las mismas imágenes y la capa `compose.aws.yaml`:

- Los tres servicios arrancan sanos y usan unos 410 MB de memoria en total (backend ~345 MB, PostgreSQL ~57 MB, nginx ~5 MB).
- La aplicación responde por el puerto 80; las rutas de Angular y `/api` funcionan desde el mismo origen.
- El flujo E2E completo (42 comprobaciones: login por rol, expedientes, tareas, plazos, auditoría, modo oscuro, móvil) pasa contra el puerto 80.
- Tras detener y volver a arrancar los servicios, los datos se conservan.
