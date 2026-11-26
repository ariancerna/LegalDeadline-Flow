# LegalDeadline Flow — Frontend (Angular)

Cliente web del sistema. Consume la API REST del backend Spring Boot con JWT y muestra cada pantalla según el rol del usuario. Cubre RF20–RF23 y RNF19–RNF20 del informe.

- **Angular 21** (componentes standalone, signals, formularios reactivos) y **SASS**.
- Estilo de **mesa de partes** en `src/styles/`, pensado como herramienta de trabajo diario. El sistema de diseño (tokens, componentes, menú lateral y tablero) se definió en Claude Design y se trasladó a `_tema.scss`, `_tokens.scss` y `_components.scss`:
  - [Archivo](https://fonts.google.com/specimen/Archivo) con eje de ancho: condensada y gruesa en títulos y cifras, normal en el texto. Los números de expediente van en [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono).
  - Colores en `oklch`, definidos por separado para el tema claro y el oscuro.
  - Cifras con coma decimal y espacio fino como separador de miles desde cinco dígitos: 4187, 14 732, 97,9 % (`utils/cifra.ts`).
  - Grises neutros, tinta casi negra en la acción principal, un azul de sello para enlaces y foco, y el manila de las carpetas de expediente en la carátula y en la marca.
  - El color se reserva para el riesgo y sube de intensidad: «Crítico» va en rojo lleno; «Bajo» es solo texto gris.
  - Tablas densas, esquinas casi rectas y sin sombras salvo en menús. Modo claro y oscuro (`_tema.scss`).
  - Iconos de [Lucide](https://lucide.dev) solo donde ayudan a actuar (buscar, alertas, editar), no como adorno.
- `@angular/cdk` solo para arrastrar y soltar en el tablero Kanban.
- Pruebas unitarias con **Vitest** (el runner por defecto de Angular 21).

## Funciones de la interfaz

| Pantalla | Qué ofrece |
|---|---|
| Login | Formulario, tabla de cuentas demo y la carátula de un expediente con su sello de vencimiento. |
| Tablero | Fecha y enlaces a lo que requiere atención; lo más urgente en una carpeta manila con su sello («VENCIÓ HACE 6 DÍAS»), responsable y tareas pendientes; cinco cifras que cuentan al cargar; calendario de 14 días por riesgo; agenda de plazos con los vencidos primero; riesgo de la cartera; los más cargados frente al umbral; actividad reciente; gráficos de movimiento de la cartera (últimos 12 meses o últimos 10 años) y de plazos por semana. |
| Expedientes | Abre en los abiertos. Cada fila muestra el próximo plazo con su cuenta regresiva y riesgo, y las tareas activas. Búsqueda con tiempo de respuesta (RF04); si no hay resultados en la pestaña, ofrece buscar en todos los estados. La carátula muestra la cuenta regresiva del plazo más cercano. |
| Tareas | Abre en **Por hacer**: pendientes y en progreso, de la más urgente a la menos urgente. Una casilla cierra la tarea con un clic (las de prioridad ALTA piden la confirmación del supervisor). Vista **Tablero Kanban** con arrastrar y soltar. |
| Plazos | Abre en **Por vencer**, ordenados por fecha. Pestañas de próximos 10 días, vencidos y todos; vista **Calendario** mensual por riesgo. |
| Carga de trabajo | Bloques de capacidad por persona y recomendaciones de reasignación aplicables con un clic. |
| Auditoría | Bitácora en línea de tiempo agrupada por día. |
| Usuarios | Resumen por rol, alta, edición y desactivación. |

En toda la aplicación:

- **Ctrl/⌘ + K** abre el buscador: ir a una sección, crear registros o encontrar un expediente por código o asunto.
- La **campana** muestra los plazos críticos o altos de los próximos 10 días.
- El **menú lateral** (248 px) reúne el buscador, las secciones del rol con contadores (plazos críticos, personas sobrecargadas), las alertas y el menú del usuario. Se contrae a 64 px con solo iconos y recuerda la preferencia; en pantallas angostas se abre como cajón.
- La pestaña del navegador muestra el número del expediente abierto.
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
src/
  environments/     configuración: environment.ts (producción) y environment.development.ts (ng serve)
  app/
    pages/          una carpeta por pantalla con ruta: login, tablero, expedientes-lista,
                    expediente-detalle, tareas-lista, plazos-lista, carga, auditoria, usuarios, sin-permiso
    components/     piezas que usan las pantallas
      layout/       menú lateral (shell), buscador Ctrl+K, notificaciones
      ui/           reutilizables: icono, avatar, diálogo/panel, gráfico, paginador, esqueleto,
                    estado vacío, error de campo, buscador de expedientes
      expedientes/  tareas/  plazos/  usuarios/  tablero/
                    formularios, tablas, Kanban, calendario y línea de vencimientos de cada módulo
    services/
      api/          un servicio HTTP por recurso: expedientes, tareas, plazos, usuarios, consultas
      auth/         AuthService (sesión JWT) y permisos por rol
      state/        estado compartido con signals: alertas, responsables, caché de expedientes
                    (además: tema, notificaciones y buscador)
    guards/         autenticadoGuard, invitadoGuard y rolGuard (rutas por rol)
    interceptors/   authInterceptor: agrega el token y cierra la sesión ante un 401
    models/         interfaces que reflejan los DTO del backend, un archivo por entidad
    data/           catálogos fijos: etiquetas, tipos de evento, navegación, transiciones, iconos
    validators/     validadores de formularios (texto en blanco, largo normalizado, motivo de anulación)
    pipes/          etiqueta, fecha, asunto y cifra
    directives/     contador animado de las cifras
    utils/          fechas de Lima, formato de cifras, errores de la API, parámetros, recomendación de carga
```

El asunto de un expediente puede seguir la convención `Materia · Partes · Órgano jurisdiccional` (así lo carga la demostración); en ese caso la interfaz muestra cada parte por separado (`utils/asunto.ts`). Si no la sigue, el asunto completo se usa como título.

Los iconos se generan con `node scripts/generar-iconos.mjs` a partir de `lucide-static`. Para usar uno nuevo, agrega su nombre a la lista del script y vuelve a ejecutarlo.

## Movimiento

- Transición suave entre páginas con la View Transitions API; la marca de la sección activa se desliza en el menú lateral.
- Las cifras del tablero, de la carga y de usuarios cuentan hasta su valor (`directives/contador.directive.ts`).
- Las filas de las tablas aparecen en cascada; las columnas de los gráficos y las barras de progreso crecen desde su base.
- Todo se desactiva con la preferencia del sistema «reducir movimiento».

## Gráficos

`components/ui/grafico-columnas` dibuja columnas agrupadas con HTML y CSS, sin librerías. Tiene título, leyenda, eje con números redondos, tooltip con mouse o teclado y una vista de tabla con los mismos valores. Los colores de las series (`--serie-1`, `--serie-2`) se validaron contra daltonismo en modo claro y oscuro.

## Volumen de datos

La demostración trae 5000 expedientes, unas 10 000 tareas y 14 000 eventos. La interfaz está preparada para ese volumen:

- Los listados de plazos ya traen el **riesgo** (RN04) y el **código y asunto del expediente**, así que el tablero, la campana, el calendario y las tablas hacen una sola consulta en lugar de una por fila. `GET /plazos/{id}/riesgo` sigue disponible.
- Al registrar una tarea o un plazo, el expediente se elige con un **buscador** (`components/ui/selector-expediente`) que consulta `GET /expedientes?q` mientras escribes, en lugar de un desplegable con todos los expedientes.
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
| RF01 Autenticación | `POST /auth/login` | `pages/login` | `services/auth/auth.spec.ts` |
| RF02 Usuarios y roles | `/usuarios` | `pages/usuarios`, `components/usuarios` | E2E: el administrador crea un usuario |
| RF03–RF06 Expedientes | `/expedientes`, `/expedientes/{id}/cierre` | `pages/expedientes-lista`, `pages/expediente-detalle`, `components/expedientes` | E2E: crear, buscar, cierre bloqueado con pendientes |
| RF04 Búsqueda | `GET /expedientes?q&estado&responsableId` | `expedientes-lista.component` (muestra el tiempo de respuesta en ms) | E2E: la búsqueda filtra |
| RF07, RF09 Tareas | `/tareas` | `tarea-form.component` | E2E: registrar tarea |
| RF08 Duplicados | `POST /tareas` → 409 `TAREA_DUPLICADA` | `tarea-form.component` | `utils/errores.spec.ts`, E2E: duplicado rechazado |
| RF10 Transiciones / RN03 | `PATCH /tareas/{id}/estado` | `cambio-estado.component`, `tareas-kanban.component` | `data/transiciones.spec.ts`, E2E: cierre ALTA y arrastre en el Kanban |
| RF12–RF14 Plazos | `/plazos`, `/plazos/{id}/anulacion` | `pages/plazos-lista`, `components/plazos` | E2E: motivo < 10 caracteres bloqueado, anulación |
| RF15 Riesgo | `GET /plazos/{id}/riesgo` | `plazos-tabla`, `plazos-calendario`, `services/state/alertas.store` (campana y tablero) | E2E: plazo a 2 días = CRÍTICO |
| RF16 Sobrecarga | `GET /responsables/carga` | `pages/carga`, aviso en `tarea-form` | `utils/recomendacion.spec.ts` |
| RF17 Indicadores | `GET /indicadores` | `tablero.component`, `linea-vencimientos.component` | `components/ui/componentes.spec.ts`, E2E: tablero |
| RF18 Auditoría | `GET /auditoria/eventos` | `auditoria.component`, pestaña Actividad del expediente | E2E: eventos visibles solo para roles autorizados |
| RF20 Navegación por rol | — | `components/layout/shell`, `guards/auth.guards.ts` | `services/auth/auth.spec.ts` (guards), E2E: el auditor no ve acciones |
| RF23 Integración | todos | `interceptors/auth.interceptor.ts` | `services/auth/auth.spec.ts` (Bearer, 401) |

## Desplegar en la nube

El frontend se publica en Vercel con **Root Directory** `frontend`. `vercel.json` define la compilación, devuelve `index.html` en las rutas de Angular y reenvía `/api` al backend en Render. Pasos completos en [docs/despliegue.md](../docs/despliegue.md).

## Créditos

- Iconos de [Lucide](https://lucide.dev) (licencia ISC). Tipografías Archivo, de Omnibus-Type, e IBM Plex Mono, de IBM (ambas con licencia SIL Open Font).
