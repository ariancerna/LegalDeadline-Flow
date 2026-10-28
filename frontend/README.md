# LegalDeadline Flow — Frontend (Angular)

Cliente web del sistema. Consume la API REST del backend Spring Boot con JWT y muestra cada pantalla según el rol del usuario. Cubre RF20–RF23 y RNF19–RNF20 del informe.

- **Angular 21** (componentes standalone, signals, formularios reactivos) y **SASS**.
- Estilo **«despacho editorial»** en `src/styles/`: papel, tinta y un burdeos de sello; títulos y cifras en serif (Source Serif 4), rótulos en versalitas, líneas finas en lugar de sombras y color reservado para el riesgo. Variables CSS con modo claro y **noche** (`_tema.scss`). Texto de interfaz en Inter e iconos de [Lucide](https://lucide.dev).
- `@angular/cdk` solo para arrastrar y soltar en el tablero Kanban.
- Pruebas unitarias con **Vitest** (el runner por defecto de Angular 21).

## Funciones de la interfaz

| Pantalla | Qué ofrece |
|---|---|
| Login | Pantalla dividida con presentación del sistema y accesos rápidos a las cuentas demo. |
| Tablero | Registro de vencimientos: franja de cifras, calendario de 14 días con los plazos marcados por riesgo, registro de plazos, riesgo de la cartera, carga del equipo y diario de actividad. |
| Expedientes | Pestañas por estado con contadores, búsqueda con tiempo de respuesta (RF04) y carátula de cada expediente (número, partes, materia, órgano jurisdiccional), con avance, próximos vencimientos e historial. |
| Tareas | Vista **Lista** o **Tablero Kanban**: arrastrar una tarjeta cambia el estado y respeta las transiciones y la confirmación ALTA. |
| Plazos | Vista **Lista** (todos, próximos 10 días, vencidos) o **Calendario** mensual coloreado por riesgo. |
| Carga de trabajo | Bloques de capacidad por persona y recomendaciones de reasignación aplicables con un clic. |
| Auditoría | Bitácora en línea de tiempo agrupada por día. |
| Usuarios | Resumen por rol, alta, edición y desactivación. |

En toda la aplicación:

- **Ctrl/⌘ + K** abre el buscador: ir a una sección, crear registros o encontrar un expediente por código o asunto.
- La **campana** muestra los plazos críticos o altos de los próximos 10 días.
- El menú lateral se puede contraer y muestra contadores (plazos críticos, personas sobrecargadas).
- Formularios en paneles laterales, confirmaciones en ventanas, skeletons de carga y estados vacíos con acciones.
- Tema claro, oscuro o el del sistema (menú del usuario).

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
  shared/          icono, avatar, diálogo/panel, skeleton, estado vacío, paginador, pipes, fechas de Lima
  layout/          menú lateral por rol, barra superior, buscador Ctrl+K, alertas, notificaciones
  features/
    auth/          login
    tablero/       indicadores, distribución del riesgo, alertas de plazos
    expedientes/   listado con búsqueda, detalle, formulario
    tareas/        lista, tablero Kanban, cambio de estado, formulario, transiciones
    plazos/        lista, calendario mensual, tabla con riesgo, formulario, anulación
    carga/         balanceador visual y recomendación de reasignación
    auditoria/     bitácora en línea de tiempo
    usuarios/      administración de cuentas
```

El asunto de un expediente puede seguir la convención `Materia · Partes · Órgano jurisdiccional` (así lo carga la demostración); en ese caso la interfaz muestra cada parte por separado (`shared/asunto.ts`). Si no la sigue, el asunto completo se usa como título.

Los iconos se generan con `node scripts/generar-iconos.mjs` a partir de `lucide-static`. Para usar uno nuevo, agrega su nombre a la lista del script y vuelve a ejecutarlo.

## Volumen de datos

La demostración trae 5000 expedientes, unas 10 000 tareas y 14 000 eventos. La interfaz está preparada para ese volumen:

- Los listados de plazos ya traen el **riesgo** (RN04) y el **código y asunto del expediente**, así que el tablero, la campana, el calendario y las tablas hacen una sola consulta en lugar de una por fila. `GET /plazos/{id}/riesgo` sigue disponible.
- Al registrar una tarea o un plazo, el expediente se elige con un **buscador** (`shared/selector-expediente.component.ts`) que consulta `GET /expedientes?q` mientras escribes, en lugar de un desplegable con todos los expedientes.
- El calendario pide todas las páginas del mes y muestra primero los plazos de mayor riesgo de cada día.
- La pestaña **Actividad** de un expediente usa `GET /auditoria/eventos?expedienteId=`, que filtra en el servidor sus eventos y los de sus tareas y plazos.

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
| RF10 Transiciones / RN03 | `PATCH /tareas/{id}/estado` | `cambio-estado.component`, `tareas-kanban.component` | `features/tareas/transiciones.spec.ts`, E2E: cierre ALTA y arrastre en el Kanban |
| RF12–RF14 Plazos | `/plazos`, `/plazos/{id}/anulacion` | `features/plazos/*` | E2E: motivo < 10 caracteres bloqueado, anulación |
| RF15 Riesgo | `GET /plazos/{id}/riesgo` | `plazos-tabla`, `plazos-calendario`, `core/alertas.store` (campana y tablero) | E2E: plazo a 2 días = CRÍTICO |
| RF16 Sobrecarga | `GET /responsables/carga` | `features/carga/*`, aviso en `tarea-form` | `features/carga/recomendacion.spec.ts` |
| RF17 Indicadores | `GET /indicadores` | `tablero.component`, `linea-vencimientos.component` | `shared/componentes.spec.ts`, E2E: tablero |
| RF18 Auditoría | `GET /auditoria/eventos` | `auditoria.component`, pestaña Actividad del expediente | E2E: eventos visibles solo para roles autorizados |
| RF20 Navegación por rol | — | `layout/shell.component`, `core/auth/guards.ts` | `core/auth/auth.spec.ts` (guards), E2E: el auditor no ve acciones |
| RF23 Integración | todos | `core/auth/auth.interceptor.ts` | `core/auth/auth.spec.ts` (Bearer, 401) |

## Desplegar en la nube

El frontend se publica en Vercel con **Root Directory** `frontend`. `vercel.json` define la compilación, devuelve `index.html` en las rutas de Angular y reenvía `/api` al backend en Render. Pasos completos en [docs/despliegue.md](../docs/despliegue.md).

## Créditos

- Fotografía del inicio de sesión: Palacio de Justicia de Montpellier, por [Nathan Cima](https://unsplash.com/@nathan_cima) en [Unsplash](https://unsplash.com/photos/OHE90W2rQF4), bajo la [licencia de Unsplash](https://unsplash.com/license). Se usa en blanco y negro bajo una capa de color (`public/img/login-tribunal.webp`).
- Iconos de [Lucide](https://lucide.dev) (licencia ISC). Tipografías Inter y Source Serif 4 (licencia SIL Open Font).
