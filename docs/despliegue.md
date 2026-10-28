# Despliegue en la nube (gratis)

| Parte | Servicio | Región | Configuración en el repositorio |
|---|---|---|---|
| Base de datos | [Neon](https://neon.com) | AWS US East 1 (N. Virginia) | `application-neon.properties` |
| Backend (Spring Boot) | [Render](https://render.com), servicio web con Docker | Virginia (US East) | `render.yaml`, `Dockerfile` |
| Frontend (Angular) | [Vercel](https://vercel.com) | Global | `frontend/vercel.json` |

El backend y la base están en la misma región porque cada pantalla hace varias consultas a la base. El navegador habla solo con Vercel: Vercel sirve Angular y reenvía `/api` a Render, así que no hace falta configurar CORS.

Los tres se conectan al mismo repositorio de GitHub. Cada `git push` a `main` actualiza el frontend y, si cambió el backend, también el backend.

## 1. Neon

Sigue [neon.md](neon.md), con la región **AWS US East 1 (N. Virginia)**. Guarda la cadena de conexión **directa** (sin `-pooler`).

## 2. Render (backend)

1. En Render: **New → Blueprint** y elige el repositorio `LegalDeadline-Flow`. Render lee `render.yaml`.
2. Cuando lo pida, pega la cadena de Neon en `DATABASE_URL`. `JWT_SECRET` se genera solo.
3. Pulsa **Apply**. La primera compilación tarda varios minutos (Maven descarga dependencias).
4. Comprueba `https://legaldeadline-flow-api.onrender.com/actuator/health` → `{"status":"UP"}`.

Si Render asigna otra dirección (por ejemplo, porque el nombre ya estaba tomado), cámbiala en `frontend/vercel.json` (`destination`) y haz push.

## 3. Vercel (frontend)

1. En Vercel: **Add New → Project** e importa el repositorio.
2. **Root Directory:** `frontend`. **Application Preset:** Angular. No hacen falta variables de entorno; `vercel.json` define la compilación y la carpeta de salida.
3. Pulsa **Deploy** y abre la dirección que te da Vercel.

## Antes de la demostración

- El plan gratuito de Render **apaga el backend tras 15 minutos sin visitas**. La primera visita después tarda alrededor de un minuto mientras arranca. Abre la aplicación unos minutos antes de presentar.
- Neon también se suspende sin uso; despierta en uno o dos segundos.
- Con el perfil `demo`, el arranque completa la cartera de presentación hasta **5000 expedientes** (variable `DEMO_VOLUMEN`; ver el README). Si la base ya tiene la cartera pequeña, el siguiente despliegue le agrega el resto; si ya tiene 5000, no hace nada. En el registro de Render aparece `Cartera de demostración lista en N s`. Para no volver a cargar datos en una base nueva, cambia `SPRING_PROFILES_ACTIVE` a `neon` en Render.
- Para comprobar el volumen en Neon, ejecuta en el **SQL Editor**: `select estado, count(*) from expedientes group by estado;`
