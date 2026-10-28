# Base de datos en Neon

Esta guía conecta el backend a una base PostgreSQL en la nube con [Neon](https://neon.com), en su plan gratuito. El backend no cambia: Flyway crea las tablas en el primer arranque y, con el perfil `demo`, carga la cartera de demostración.

## 1. Crear el proyecto en Neon

1. Entra a [neon.com](https://neon.com) y crea una cuenta (puedes usar GitHub). Elige el plan **Free**.
2. Crea un proyecto:
   - **Project name:** `legaldeadline-flow`
   - **Postgres version:** 17 (la misma que usa Docker en local)
   - **Region:** **AWS US East 1 (N. Virginia)**, la misma región donde corre el backend en Render (ver [despliegue.md](despliegue.md)). La región no se puede cambiar después.
3. En el panel del proyecto pulsa **Connect**:
   - Branch `production`, base `neondb`, rol `neondb_owner`.
   - **Desactiva «Connection pooling».** El backend necesita la conexión directa: Flyway y los bloqueos de las transacciones no funcionan bien a través del pooler.
   - Copia la cadena de conexión. Tiene esta forma:

```
postgresql://neondb_owner:npg_XXXXXXXX@ep-nombre-123456.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## 2. Configurar el backend

En la carpeta del backend, abre `.env` (si no existe, copia `.env.example`) y agrega:

```
DATABASE_URL=postgresql://neondb_owner:npg_XXXXXXXX@ep-nombre-123456.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=una-clave-aleatoria-de-al-menos-32-caracteres
```

- Pega la cadena tal cual, **sin comillas**. El backend la convierte al formato JDBC por su cuenta.
- Con `DATABASE_URL`, el backend ignora `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`.
- `.env` no se sube a Git. Comparte la cadena con tu equipo por un canal privado, nunca en el repositorio ni en el informe.

## 3. Ejecutar

Elige una opción. El perfil `neon` es el que ajusta la conexión para Neon; `demo` carga los datos de ejemplo.

**IntelliJ IDEA:** selecciona la configuración **LegalDeadline Flow - Neon** y pulsa Run. Usa la carpeta del backend como directorio de trabajo, para que lea `.env`.

**Maven (PowerShell):**

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=neon,demo"
```

**Docker (backend y frontend, sin contenedor de base de datos):**

```powershell
docker compose -f compose.neon.yaml up -d --build
```

En los tres casos la API queda en `http://localhost:8081` y el frontend (`npm start` o el contenedor) en `http://localhost:4200`.

## 4. Comprobar

1. En el log del backend debe aparecer `Successfully applied 3 migrations` la primera vez (las siguientes, `Schema "public" is up to date`).
2. En la consola de Neon, **Tables** muestra `usuarios`, `expedientes`, `tareas`, `plazos`, `eventos` y `flyway_schema_history`.
3. Inicia sesión en el frontend con una cuenta demo, por ejemplo `supervisor@legaldeadline.local` / `SupervisorDemo123!`.

## Cuidar el plan gratuito

El plan Free incluye 0,5 GB de almacenamiento (la cartera de 5000 expedientes ocupa unos 17 MB) y un número limitado de horas de cómputo al mes. Neon suspende la base cuando lleva 5 minutos sin conexiones y no cobra ese tiempo. El perfil `neon` está preparado para eso:

- El pool de conexiones se vacía tras un minuto sin uso, en lugar de mantener conexiones abiertas.
- `/actuator/health` no consulta la base, así el healthcheck de Docker no la despierta cada 15 segundos.
- Por eso la primera petición después de un rato sin uso tarda uno o dos segundos más: Neon está despertando.

Evita conectar monitores de disponibilidad u otras herramientas que consulten la base cada pocos minutos.

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `password authentication failed` | La clave cambió o se copió mal. Vuelve a copiar la cadena desde **Connect** (puedes regenerar la clave del rol). |
| `Connection timed out` / `Connection refused` | Algunas redes (por ejemplo, la de un campus) bloquean el puerto 5432. Prueba desde otra red o con datos móviles. |
| El backend sigue usando la base local | `DATABASE_URL` no llegó al proceso. Revisa que esté en `.env` de la carpeta del backend o como variable de entorno, y que no exista `SPRING_DATASOURCE_URL` (tiene prioridad). |
| `Validate failed: Migrations have failed validation` | Se modificó una migración ya aplicada. No edites `V1`–`V3`: crea una `V4` nueva. |
| Quiero empezar de cero | En Neon, crea una rama nueva desde **Branches** o borra las tablas con el **SQL Editor**; al reiniciar, Flyway y la demo las crean otra vez. |

## Publicar el backend

Para publicar backend y frontend en la nube (Render y Vercel), sigue [despliegue.md](despliegue.md).
