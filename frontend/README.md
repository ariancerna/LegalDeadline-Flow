# LegalDeadline Flow — Frontend (Angular)

Cliente web del sistema. Consume la API REST del backend Spring Boot con JWT y muestra cada pantalla según el rol del usuario. Cubre RF20–RF23 y RNF19–RNF20 del informe.

- **Angular 21** (componentes standalone, signals, formularios reactivos) y **SASS**.
- Sin librerías de UI: los estilos están en `src/styles/` (`_tokens.scss` define la paleta y los colores de riesgo).
- Pruebas unitarias con **Vitest** (el runner por defecto de Angular 21).

## Requisitos

- Node.js **20.19+**, **22.12+** o **24+** (`node -v`).
- El backend corriendo en `http://localhost:8081` (ver el README de la raíz).

## Ejecutar en desarrollo

```bash
cd frontend
npm install
npm start
```

Abre `http://localhost:4200`. `npm start` usa `proxy.conf.json`: las llamadas a `/api` se reenvían a `http://localhost:8081`, así que en desarrollo no hace falta configurar CORS.

Con el perfil `demo` del backend puedes entrar con las cuentas de demostración. En el login, el desplegable **Cuentas de demostración** llena el formulario.

## Pruebas y compilación

```bash
npm test -- --watch=false   # pruebas unitarias (Vitest)
npm run build               # compilación de producción en dist/frontend/browser
```

## Ejecutar todo con Docker Compose

Desde la raíz del repositorio, `docker compose up -d --build` levanta PostgreSQL, el backend y el frontend. El frontend queda en `http://localhost:4200` (variable `FRONTEND_PORT`). nginx sirve Angular y reenvía `/api` al backend dentro de la red de Compose.

## Estructura

```
src/app/
  core/            modelos (DTO), servicios REST, sesión JWT, interceptor, guards, errores
    api/           un servicio por recurso: expedientes, tareas, plazos, usuarios, consultas
    auth/          AuthService, authInterceptor, guards, permisos por rol
  shared/          diálogo, paginador, pipes (etiqueta, fecha), fechas en hora de Lima
  layout/          menú lateral por rol, barra superior, notificaciones
  features/
    auth/          login
    tablero/       indicadores, distribución del riesgo, alertas de plazos
    expedientes/   listado con búsqueda, detalle, formulario
    tareas/        listado, tabla con acciones, formulario, transiciones
    plazos/        listado, tabla con riesgo, formulario, anulación
    carga/         balanceador visual y recomendación de reasignación
    auditoria/     bitácora de eventos
    usuarios/      administración de cuentas
```

## Seguridad en el cliente

- El JWT se guarda en `sessionStorage`, así que la sesión termina al cerrar la pestaña. `authInterceptor` lo envía como `Authorization: Bearer` solo a la API.
- Un 401 cierra la sesión y lleva al login. Un 403 muestra "No tienes permiso".
- Los guards (`autenticadoGuard`, `rolGuard`) y `permisos.ts` ocultan lo que el rol no puede usar. **El servidor vuelve a validar todo**: ocultar un botón no reemplaza la autorización del backend.
- Las ediciones envían `version`. Si otra persona modificó el registro, el backend responde 409 y la pantalla recarga los datos.

## Trazabilidad: requisito → endpoint → componente → prueba

| Requisito | Endpoint | Componente Angular | Prueba |
|---|---|---|---|
| RF01 Autenticación | `POST /auth/login` | `features/auth/login.component` | `core/auth/auth.spec.ts` |
| RF02 Usuarios y roles | `/usuarios` | `features/usuarios/*` | E2E: el administrador crea un usuario |
| RF03–RF06 Expedientes | `/expedientes`, `/expedientes/{id}/cierre` | `features/expedientes/*` | E2E: crear, buscar, cierre bloqueado con pendientes |
| RF04 Búsqueda | `GET /expedientes?q&estado&responsableId` | `expedientes-lista.component` (muestra el tiempo de respuesta en ms) | E2E: la búsqueda filtra |
| RF07, RF09 Tareas | `/tareas` | `tarea-form.component` | E2E: registrar tarea |
| RF08 Duplicados | `POST /tareas` → 409 `TAREA_DUPLICADA` | `tarea-form.component` | `core/errores.spec.ts`, E2E: duplicado rechazado |
| RF10 Transiciones / RN03 | `PATCH /tareas/{id}/estado` | `tareas-tabla.component` | `features/tareas/transiciones.spec.ts`, E2E: cierre ALTA |
| RF12–RF14 Plazos | `/plazos`, `/plazos/{id}/anulacion` | `features/plazos/*` | E2E: motivo < 10 caracteres bloqueado, anulación |
| RF15 Riesgo | `GET /plazos/{id}/riesgo` | `plazos-tabla.component`, `tablero.component` (alertas) | E2E: plazo a 2 días = CRÍTICO |
| RF16 Sobrecarga | `GET /responsables/carga` | `features/carga/*`, aviso en `tarea-form` | `features/carga/recomendacion.spec.ts` |
| RF17 Indicadores | `GET /indicadores` | `tablero.component` | E2E: tablero con 8 indicadores |
| RF18 Auditoría | `GET /auditoria/eventos` | `auditoria.component` | E2E: eventos visibles solo para roles autorizados |
| RF20 Navegación por rol | — | `layout/shell.component`, `core/auth/guards.ts` | `core/auth/auth.spec.ts` (guards), E2E: el auditor no ve acciones |
| RF23 Integración | todos | `core/auth/auth.interceptor.ts` | `core/auth/auth.spec.ts` (Bearer, 401) |

## Desplegar en la nube

1. **Base de datos:** crea un proyecto PostgreSQL en Neon (plan gratuito). Usa la cadena de conexión **directa** (sin `-pooler`) y pásala al backend como `SPRING_DATASOURCE_URL=jdbc:postgresql://<host>/<db>?sslmode=require`, junto con `DB_USER` y `DB_PASSWORD`.
2. **Backend:** publícalo con su `Dockerfile` en un servicio que acepte contenedores. Define `JWT_SECRET` y `CORS_ALLOWED_ORIGINS=https://<dominio-del-frontend>`.
3. **Frontend:** si se publica en otro dominio (Vercel, Netlify, etc.), cambia `apiUrl` en `src/environments/environment.ts` a `https://<backend>/api/v1` y publica `dist/frontend/browser`. Configura la reescritura de rutas a `index.html`.
