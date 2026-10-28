# LegalDeadline Flow

Sistema web para gestionar expedientes, tareas, plazos y auditoría de un estudio jurídico ficticio. El repositorio contiene:

- **Backend** (esta carpeta): API REST con Spring Boot.
- **Frontend** ([`frontend/`](frontend/README.md)): cliente Angular 21 + SASS que consume la API con JWT y adapta cada pantalla al rol.

`docker compose up -d --build` levanta base de datos, backend y frontend. La aplicación web queda en `http://localhost:4200`.

## Backend

API REST del segundo avance para gestionar expedientes, tareas, plazos y auditoría. Usa Java 17, Spring Boot, Spring Data JPA/Hibernate, PostgreSQL, Flyway, Spring Security y JWT. Los datos permanecen al reiniciar y los permisos se verifican por rol y recurso.

La [guía práctica en inglés](docs/backend-learning-and-demo-guide.en.md) explica JWT, DTO, records, el recorrido de una solicitud y cómo demostrar RF01–RF19. Incluye una colección de Postman, un entorno local y la evidencia de sus comprobaciones.

## Ejecutar con Docker Compose

Necesitas Docker Desktop iniciado con contenedores Linux y Docker Compose v2. No necesitas instalar Java, Maven ni PostgreSQL para este modo.

Desde esta carpeta, en PowerShell:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

La primera instrucción conserva un `.env` que ya exista. Edita `.env` para elegir la contraseña de PostgreSQL y una clave JWT aleatoria de al menos 32 bytes. Los valores del ejemplo son para una demostración local. `.env` está excluido de Git y de la imagen.

La API queda en `http://localhost:8081`. PostgreSQL queda en `localhost:5432`, base `legaldeadline` y usuario `legaldeadline`, con la contraseña de `.env`. Puedes cambiar los puertos del host con `BACKEND_PORT` y `DB_PORT`; los puertos entre contenedores se mantienen en 8081 y 5432. La conexión interna usa el servicio `db`.

El backend espera a PostgreSQL, aplica las migraciones y carga la demostración si `DEMO_ENABLED=true`. Comprueba `http://localhost:8081/actuator/health` o consulta los registros:

```powershell
docker compose logs --tail 100 backend
docker compose logs --tail 100 db
```

Para detener los contenedores:

```powershell
docker compose down
```

El volumen `postgres_data` conserva los registros entre reinicios y recreaciones. Al ejecutar `docker compose up -d`, se reutiliza. Evita `docker compose down -v` si quieres conservar la base. Las variables `POSTGRES_*` inicializan una base vacía; cambiar `.env` no modifica automáticamente una contraseña almacenada en un volumen existente.

## Datos de demostración e inicio de sesión

Compose activa el perfil `demo` y `DEMO_ENABLED=true`. La carga es idempotente: no duplica los usuarios o expedientes de ejemplo al reiniciar. Fuera de Compose, `legaldeadline.demo.enabled` está desactivada por defecto.

| Rol | Correo | Contraseña de demostración |
|---|---|---|
| Administrador | `admin@legaldeadline.local` | `AdminDemo123!` |
| Supervisor | `supervisor@legaldeadline.local` | `SupervisorDemo123!` |
| Responsable | `responsable@legaldeadline.local` | `ResponsableDemo123!` |
| Auditor | `auditor@legaldeadline.local` | `AuditorDemo123!` |
| Responsable | `paola.vargas@legaldeadline.local` | `ResponsableDemo123!` |
| Responsable | `diego.ramirez@legaldeadline.local` | `ResponsableDemo123!` |

La demostración se carga en dos pasos, ambos con números, partes y juzgados ficticios:

1. **Cartera base** (`DemoDataSeeder`): siete expedientes conocidos, como `00412-2026-0-1801`, con sus tareas y plazos. Sirven para el guion de la presentación y para las pruebas.
2. **Cartera de volumen** (`CarteraVolumenSeeder`): completa hasta **5000 expedientes** (variable `DEMO_VOLUMEN`) para presentar el sistema con un volumen realista y medir la búsqueda (RF04, RNF05).

La cartera de volumen se parece a la de un estudio con varios años de actividad:

| Registro | Cantidad aproximada | Detalle |
|---|---|---|
| Expedientes | 5000 | ~800 abiertos y el resto cerrados o archivados, ingresados de 2019 a hoy; materias civiles, laborales, de familia, alimentos, comerciales y apelaciones en Sala |
| Responsables | 39 | Los 3 de la demostración y 36 más (`nombre.apellido@legaldeadline.local`, contraseña `ResponsableDemo123!`) |
| Tareas | 10 000 | Historial cerrado o cancelado y unas 180 activas; solo unas 6 personas superan el umbral de carga |
| Plazos | 600 | En días hábiles, la mayoría por venir, pocos vencidos y algunos anulados con motivo |
| Eventos de auditoría | 14 000 | Registro y cierre de cada expediente, y la actividad de los últimos tres meses |

Respeta las reglas del negocio: un expediente cerrado o archivado no tiene tareas ni plazos activos (RF06), no hay tareas activas duplicadas (RF08) y ningún registro tiene fecha futura. Es determinista (siempre genera la misma cartera para la misma fecha), se inserta por lotes en una transacción (segundos, no minutos) y no se repite: si la base ya tiene 5000 expedientes, no hace nada. Con `DEMO_VOLUMEN=0` solo se carga la cartera base. En PostgreSQL ocupa unos 17 MB.

Solicita un token:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@legaldeadline.local",
  "password": "AdminDemo123!"
}
```

La respuesta contiene `accessToken`, `tokenType`, `expiresIn` y los datos del usuario. Envía `Authorization: Bearer <token>` en las solicitudes posteriores. Un token ausente, vencido o inválido produce 401; un usuario sin permiso produce 403. Las contraseñas se almacenan con BCrypt y no se incluyen en respuestas. Los cambios de contraseña, rol, estado o versión del usuario invalidan sus tokens anteriores.

| Rol | Alcance |
|---|---|
| Administrador | Gestión global de registros y usuarios |
| Supervisor | Gestión global de expedientes, tareas y plazos; aprobación de cierres |
| Responsable | Acceso a registros asignados según las relaciones del expediente y la tarea |
| Auditor | Lectura global y auditoría, sin modificaciones |

Establece `DEMO_ENABLED=false` para detener futuras cargas de ejemplo. No elimina los registros ya existentes.

## Base de datos en Neon (nube)

Para usar PostgreSQL en la nube en lugar del contenedor local, crea un proyecto en [Neon](https://neon.com), pega su cadena de conexión en `.env` como `DATABASE_URL` y ejecuta con el perfil `neon`:

```powershell
docker compose -f compose.neon.yaml up -d --build
```

La guía completa, con la configuración de IntelliJ y Maven, está en [docs/neon.md](docs/neon.md). Para publicar la aplicación (Vercel para el frontend, Render para el backend y Neon para la base), sigue [docs/despliegue.md](docs/despliegue.md).

## Ejecutar Java en el equipo

### IntelliJ IDEA (perfil local)

1. Abre esta carpeta del backend como proyecto Maven y mantén Docker Desktop iniciado.
2. Comprueba que existe `.env` en esta carpeta y ejecuta `docker compose up -d db`.
3. Selecciona **LegalDeadline Flow - IntelliJ local** en las configuraciones de ejecución y pulsa Run.
4. Comprueba `http://localhost:8082/actuator/health`.

La configuración compartida está en `.run/LegalDeadline Flow - IntelliJ local.run.xml`. Si IDEA no la muestra todavía, vuelve a abrir el proyecto o configura tu ejecución existente con **Program arguments** `--spring.profiles.active=local` y **Working directory** apuntando a esta carpeta del backend.

El perfil `local` importa `.env` como un archivo de propiedades de Spring: escribe los valores como `CLAVE=valor`, sin comillas, `export` ni comentarios al final de la línea. Usa las mismas credenciales que Compose. Las variables de entorno o argumentos configurados en IDEA tienen prioridad: elimina valores antiguos de `DB_PASSWORD`, `DB_USER`, `DB_HOST`, `DB_PORT` o `SPRING_DATASOURCE_*` si contradicen `.env`.

La ejecución local usa el puerto **8082** (configurable con `LOCAL_SERVER_PORT`) para poder convivir con el backend de Docker en **8081**. Ambas instancias acceden a la misma base de desarrollo. El archivo `.env` sigue excluido de Git y de la imagen Docker.

También puedes ejecutar este perfil desde PowerShell, situado en esta carpeta:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

Si aparece `SQL State: 28P01` / `password authentication failed`, PostgreSQL ha rechazado las credenciales. Revisa la configuración de ejecución y la contraseña con la que se inicializó la base: cambiar `.env` no cambia la contraseña de un volumen existente. No borres el volumen para resolver un problema de conexión.

### Ejecución con variables de entorno (sin perfil local)

Necesitas Java 17 o superior. El proyecto incluye Maven Wrapper. Levanta únicamente PostgreSQL:

```powershell
docker compose up -d db
```

Configura las variables del proceso antes de iniciar Spring Boot:

```powershell
$env:DB_HOST = 'localhost'
$env:DB_PORT = '5432'
$env:DB_NAME = 'legaldeadline'
$env:DB_USER = 'legaldeadline'
$env:DB_PASSWORD = 'la contraseña configurada en .env'
$env:JWT_SECRET = 'una clave aleatoria de al menos 32 bytes'
$env:LEGALDEADLINE_DEMO_ENABLED = 'true'
.\mvnw.cmd spring-boot:run
```

Sin el perfil `local`, Java directo no lee `.env` automáticamente: configura las variables anteriores. Si el contenedor `backend` usa el puerto 8081, detenlo con `docker compose stop backend` o configura `SERVER_PORT` con otro puerto libre.

## Verificar

```powershell
.\mvnw.cmd clean verify
docker compose --env-file .env.example config --quiet
```

Las pruebas usan H2 aislado en modo PostgreSQL y las migraciones comunes V1 y V2; no necesitan una base externa. La migración V3 añade un índice único parcial exclusivo de PostgreSQL y se comprueba con `docs/verificar-integridad-postgresql.sql`, siguiendo las instrucciones del [modelo relacional](docs/modelo-relacional.md). El informe de cobertura se genera en `target/site/jacoco/index.html`. La verificación exige al menos 80 % de cobertura de líneas del paquete de servicios.

El Dockerfile compila con Maven Wrapper y JDK 17, y copia solo el JAR ejecutable a una segunda etapa con JRE 17. La imagen final usa un usuario sin privilegios. El empaquetado Docker omite la ejecución de pruebas; ejecuta `clean verify` antes de entregar una imagen.

## Rutas

Las rutas de negocio requieren JWT. Los listados usan paginación y filtros opcionales.

| Método | Ruta | Propósito |
|---|---|---|
| POST | `/api/v1/auth/login` | Autenticarse |
| GET | `/api/v1/auth/me` | Consultar usuario autenticado |
| GET / POST | `/api/v1/usuarios` | Listar y registrar usuarios |
| GET / PUT / DELETE | `/api/v1/usuarios/{id}` | Consultar, editar o desactivar usuario |
| GET / POST | `/api/v1/expedientes` | Listar y registrar expedientes |
| GET / PUT / DELETE | `/api/v1/expedientes/{id}` | Consultar, editar o archivar expediente |
| PATCH | `/api/v1/expedientes/{id}/cierre` | Cerrar expediente |
| GET / POST | `/api/v1/tareas` | Listar y registrar tareas |
| GET / PUT / DELETE | `/api/v1/tareas/{id}` | Consultar, editar o cancelar tarea |
| PATCH | `/api/v1/tareas/{id}/estado` | Cambiar estado de tarea |
| GET | `/api/v1/expedientes/{id}/tareas` | Listar tareas del expediente |
| GET / POST | `/api/v1/plazos` | Listar y registrar plazos |
| GET / PUT / DELETE | `/api/v1/plazos/{id}` | Consultar, editar o anular plazo |
| PATCH | `/api/v1/plazos/{id}/anulacion` | Anular plazo con motivo |
| GET | `/api/v1/plazos/{id}/riesgo` | Calcular riesgo del plazo |
| GET | `/api/v1/responsables/carga` | Consultar carga activa |
| GET | `/api/v1/indicadores` | Consultar indicadores persistidos |
| GET | `/api/v1/auditoria/eventos` | Consultar trazabilidad |
| GET | `/actuator/health` | Consultar disponibilidad |

Los listados de expedientes, tareas, plazos y eventos devuelven una página con `content`, `totalElements`, `totalPages`, etc. Aceptan `page` desde 0 y `size` entre 1 y 100; por defecto se devuelven 20 registros. Usuarios y carga de trabajo devuelven una lista. Cada elemento de la carga incluye `responsableId`, `nombre`, `rol`, `tareasActivas`, `umbral` y `sobrecargado`; el frontend usa el nombre para mostrar y asignar responsables sin requerir el permiso de administración de usuarios. Filtros:

- Expedientes: `estado`, `responsableId` y `q` para buscar código o asunto.
- Tareas: `expedienteId`, `responsableId`, `estado`, `prioridad`, `desde` y `hasta`.
- Plazos: `expedienteId`, `estado`, `desde` y `hasta`.

Las respuestas incluyen `version`. Envía ese valor al editar, cerrar, cancelar o anular un registro; si otro usuario lo cambió previamente, la API devuelve 409. Las bajas de expediente y tarea reciben un cuerpo JSON con `version`; la baja o anulación de plazo recibe `motivo` y `version`. El cierre de expediente recibe `version`. El cambio de estado de tarea recibe `nuevoEstado`, `confirmacionSupervisor` y `version`; esa confirmación se valida también contra el rol autenticado.

## Modelo y reglas

El [modelo relacional](docs/modelo-relacional.md) documenta tablas, relaciones e índices. Flyway versiona el esquema y Hibernate lo valida sin borrar datos al reiniciar. La consola H2 no está habilitada en la aplicación.

- Los códigos de expediente se normalizan en mayúsculas y son únicos.
- Los responsables deben existir, estar activos y tener un rol válido para la asignación.
- Una tarea activa equivalente produce 409. Su comprobación usa una transacción con bloqueo del expediente para proteger solicitudes simultáneas.
- Cerrar una tarea de prioridad alta exige identidad y autorización de supervisor o administrador.
- Los expedientes se archivan, las tareas se cancelan y los plazos se anulan con motivo. Se preserva el historial.
- Los cambios exitosos y sus eventos de auditoría se guardan en la misma transacción. El evento identifica al autor autenticado.
- Las fechas de negocio usan `America/Lima`. Riesgo, carga e indicadores usan registros persistidos.
- `version` detecta cambios concurrentes y evita sobrescrituras silenciosas.

## Variables de configuración

| Variable | Uso |
|---|---|
| `DB_HOST` | PostgreSQL: `localhost` en Java local y `db` en Compose |
| `DB_PORT` | Puerto de la base; 5432 dentro de Compose |
| `DB_NAME` | Nombre de la base |
| `DB_USER` / `DB_PASSWORD` | Credenciales PostgreSQL |
| `JWT_SECRET` | Clave de firma de al menos 32 bytes |
| `JWT_EXPIRATION_SECONDS` | Vigencia del token: 3600 por defecto, de 60 a 86400 |
| `SERVER_PORT` | Puerto HTTP de Java: 8081 por defecto |
| `BACKEND_PORT` | Puerto del host publicado por Compose |
| `FRONTEND_PORT` | Puerto del host para la aplicación web en Compose: 4200 por defecto |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos, separados por comas: `http://localhost:4200,http://localhost:5173` por defecto |
| `DATABASE_URL` | Cadena `postgresql://usuario:clave@host/base` de un proveedor en la nube (Neon); reemplaza a `DB_*`. Ver [docs/neon.md](docs/neon.md) |
| `SPRING_DATASOURCE_URL` | URL JDBC completa; reemplaza a `DB_HOST`, `DB_PORT` y `DB_NAME` (por ejemplo, PostgreSQL en la nube con `?sslmode=require`) |
| `DEMO_ENABLED` | Carga de ejemplo en Compose |
| `DEMO_VOLUMEN` | Expedientes que debe tener la demostración: 5000 con el perfil `demo`; `0` carga solo la cartera base |
| `LEGALDEADLINE_DEMO_ENABLED` | Carga de ejemplo en Java directo |

Imágenes base: [PostgreSQL oficial](https://hub.docker.com/_/postgres), [Maven oficial](https://hub.docker.com/_/maven) y [Eclipse Temurin oficial](https://hub.docker.com/_/eclipse-temurin).
