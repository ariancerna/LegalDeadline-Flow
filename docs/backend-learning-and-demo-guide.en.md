# LegalDeadline Flow: Backend Learning and Demonstration Guide

Prepared for the second project milestone. Based on the current Spring Boot backend, PostgreSQL schema V1–V3, and the RF identifiers in `Informe_APF2_LegalDeadline_Flow.docx`.

The prose is in English. Spanish endpoint names, JSON property names, enum values, and Java identifiers are preserved because they are the actual API contract.

## Contents

1. [JWT: what it is and what this project does with it](#1-jwt-what-it-is-and-what-this-project-does-with-it)
2. [DTOs: why they exist and why some projects omit them](#2-dtos-why-they-exist-and-why-some-projects-omit-them)
3. [Java records: how to read the code](#3-java-records-how-to-read-the-code)
4. [Tools and preparation](#4-tools-and-preparation)
5. [Completed functional requirements and evidence](#5-completed-functional-requirements-and-evidence)
6. [Postman practice](#6-postman-practice)
7. [Follow one JSON request through the layers](#7-follow-one-json-request-through-the-layers)
8. [Failure experiments and transaction rollback](#8-failure-experiments-and-transaction-rollback)
9. [Database evidence, persistence, and demo idempotence](#9-database-evidence-persistence-and-demo-idempotence)
10. [Suggested presentation sequence](#10-suggested-presentation-sequence)
11. [Verification scope and troubleshooting](#11-verification-scope-and-troubleshooting)

## 1. JWT: what it is and what this project does with it

JWT means **JSON Web Token**. It carries claims, such as the identity of a user and an expiration time. This backend issues a signed JWT after a successful login. The client sends it with later requests:

```http
Authorization: Bearer <accessToken>
```

The signed token used here has three dot-separated parts: header, payload, and signature. The payload is encoded, not encrypted; a signature protects against undetected changes but does not hide the claims. These concepts are defined in [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519).

### The login flow in this project

1. The client submits email and password to `POST /api/v1/auth/login`.
2. `AuthService` looks up the stored user and compares the password using BCrypt.
3. An invalid password or inactive account causes HTTP 401.
4. A successful login returns `accessToken`, `tokenType`, `expiresIn`, and `usuario`.
5. The client attaches the token to protected requests instead of repeatedly sending the password.

The default validity is 3,600 seconds. The token is signed using HS256 and the configured `JWT_SECRET`. This secret is a server configuration value; it is not the user's password and is never sent to Postman.

### Claims actually used here

| Claim | Meaning in LegalDeadline Flow |
|---|---|
| `sub` | The user's database ID, represented as text. |
| `iss` | Issuer: `legaldeadline-flow`. |
| `aud` | Intended audience: `legaldeadline-api`. |
| `iat` | Issue time. |
| `nbf` | Earliest valid time. |
| `exp` | Expiration time. |
| `rol` | Role at issuance. |
| `version` | User version at issuance. |

`SecurityConfiguration` validates the signature and required claims. `JwtUsuarioConverter` then loads the current account, checks that it is active, compares its version, and obtains its current role. Updating the user's password, role, or account state changes its version and invalidates earlier tokens.

This application does not keep an HTTP login session. However, it still queries the database to check the account: **stateless HTTP authentication does not mean zero database queries**.

Authentication establishes who the caller is. Authorization checks what that caller may do. A valid JWT does not grant access to every record. Administrators and supervisors manage business records globally; responsible users have access according to assignments; auditors have read access and cannot write. User administration is restricted to administrators.

Source files: `security/AuthService.java`, `security/JwtUsuarioConverter.java`, `security/AccesoService.java`, and `config/SecurityConfiguration.java`, under `src/main/java/pe/edu/utp/legaldeadlineflow`.

## 2. DTOs: why they exist and why some projects omit them

DTO means **Data Transfer Object**. A DTO describes the data crossing an application boundary, such as a request received by a controller or a response returned to a client.

In this backend:

| Object | Responsibility |
|---|---|
| `TareaRequest` | Fields accepted when creating a task. |
| `TareaActualizarRequest` | Fields accepted when updating a task, including the expected version. |
| `TareaResponse` | Fields returned to the client. |
| `Tarea` | JPA entity with relationships, identity, state, and persistence mapping. |

A DTO is not a database table and does not become persistent just because a controller receives it. The service creates or updates an entity using the DTO's values.

### Why separating DTOs from entities helps

- **Control input:** clients provide IDs and permitted fields; the service controls initial states, timestamps, and derived values.
- **Control output:** `UsuarioResponse` includes identity and role but excludes the password hash.
- **Express different operations:** task creation does not require `version`; updating does.
- **Validate the API contract:** annotations such as `@NotBlank`, `@Size`, and `@Positive` describe accepted input.
- **Keep the public contract stable:** an internal entity relationship can change without requiring the entire entity graph to be exposed in JSON.

Spring MVC reads `@RequestBody` through an HTTP message converter. Here Jackson maps JSON to the DTO, and `@Valid` triggers Bean Validation before the controller method executes. See the official [Spring MVC request-body documentation](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/requestbody.html).

DTO validation does not replace business rules or PostgreSQL constraints. A valid positive `responsableId` must still refer to an active, assignable user. A valid title can still conflict with an existing task.

### Why some projects do not use DTOs

Small prototypes may accept and return entities directly, use maps, use projections, or use separate request classes without calling them DTOs. DTO is a design role, not a required suffix or a mandatory Spring feature. A class named `CreateTaskCommand` can serve the same transfer role.

Direct entity exposure can reduce mapping code, but it couples the API to the persistence model and requires careful control of sensitive fields, relationships, and writable properties. This project uses explicit DTOs because user credentials, permissions, concurrency versions, and different operation contracts justify that separation.

### A concrete input/output difference

The client sends `titulo`, `tipo`, and IDs. `TareaService` calculates `titulo_normalizado`, chooses initial state `PENDIENTE`, and assigns timestamps. `TareaResponse` returns the readable title and current version without exposing `titulo_normalizado`. That internal field is a derived, controlled redundancy used to enforce active-task uniqueness.

## 3. Java records: how to read the code

A `record` is a concise Java class for a fixed set of component values. Records are available in the project's Java 17 target. For example, this existing DTO needs only:

```java
public record VersionRequest(Long version) { }
```

Java supplies the constructor, accessor `version()`, and value-based `equals`, `hashCode`, and `toString`. Component fields are final; records have no automatically generated setters and cannot be subclassed. These features reduce repetitive DTO code. See [Oracle's record documentation](https://docs.oracle.com/en/java/javase/17/language/records.html).

```java
VersionRequest request = new VersionRequest(3L);
Long expectedVersion = request.version();
// Accessor: version(), rather than getVersion().
```

The record declaration above is simplified; the actual `VersionRequest` also contains validation annotations.

### Compact constructors in this project

`TareaRequest` has a compact constructor:

```java
public TareaRequest {
    titulo = TextoNormalizado.limpiar(titulo);
    tipo = TextoNormalizado.codigo(tipo);
}
```

This constructor transforms the incoming arguments before they are stored as components. Thus `"  Prepare   hearing  "` becomes `"Prepare hearing"`, and `"escrito"` becomes `"ESCRITO"`. Assigning a constructor argument here does not mutate an already-created record.

Records are **shallowly immutable**: component references cannot be reassigned, but a mutable object referenced by a component can still change. For example, a record containing a map does not automatically make that map immutable. This distinction is documented by [Java's Record API](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Record.html).

DTO describes a purpose; record describes a language construct. A DTO can be an ordinary class or a record. In this project DTOs are often records, while JPA entities are ordinary classes because this mapping uses mutable managed state, entity constructors, and Hibernate's entity lifecycle. Do not replace the entities with DTO records.

Also remember that a generated `toString()` includes component values. Avoid printing a password-bearing request DTO while debugging login.

## 4. Tools and preparation

Use **Postman + IntelliJ IDEA Debug + PostgreSQL inspection**. Each provides different evidence:

| Tool | What it reveals |
|---|---|
| Postman | HTTP requests, response bodies, status codes, tokens, and repeatable assertions. |
| IntelliJ Debug | DTO construction, controller delegation, service rules, entities, and call stacks. |
| PostgreSQL via `psql` | Committed rows, foreign keys, normalized titles, audit events, and migrations. |
| Maven/JUnit | Boundary rules and controlled rollback scenarios that should not be simulated by damaging a live demo database. |

Postman's [Collection Runner](https://learning.postman.com/docs/tests-and-scripts/running-collections/intro-to-collection-runs/) executes requests in order. Its [post-response scripts](https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/) store IDs/tokens and assert results.

### Included files

- `legaldeadline-learning.postman_collection.json`: 68 requests in six ordered folders.
- `legaldeadline-local.postman_environment.json`: local URL and initially empty runtime variables.
- `learning-lab-verification.en.md`: verification result and its scope.
- `verificar-integridad-postgresql.sql`: separate transactional database-constraint checks.

These files are beside this guide in `docs`.

### Choose the running backend

Run commands from the backend project root:

```powershell
docker compose up -d --build
docker compose ps
```

For the normal Postman run, use `base_url = http://localhost:8081` (Docker backend).

For stepping through source code, run **LegalDeadline Flow - IntelliJ local** using **Debug**, then use `base_url = http://localhost:8082`. The local profile imports `.env` and uses the same PostgreSQL database. It requires the backend root as its working directory. Changing Postman to port 8082 is essential: calls to port 8081 do not hit the IntelliJ debugger.

The collection expects the existing demo administrator, supervisor, and auditor accounts described in `README.md`. It creates its own responsible users A and B. If demo accounts are missing, enable the existing demo mode and start the backend before running the lab.

## 5. Completed functional requirements and evidence

The report marks **RF01–RF19 as 100%**. The following matrix explains how to demonstrate their acceptance criteria. It does not change the report's progress values or claim that one happy-path request proves every rule.

| RF | Requirement in English | Demonstration and expected evidence |
|---|---|---|
| RF01 | Authenticate API users | Folder 01: successful login and `/auth/me`; wrong credentials and missing token return 401. Expired/invalid-claim scenarios also have integration tests. |
| RF02 | Manage users and roles | Folders 01/06: create, list, read, change password, deactivate; old tokens stop working. Role changes can be exercised on a new lab account. Last-administrator protection is verified by the existing isolated unit test. |
| RF03 | Register cases | `02.01`: unique code, valid responsible user, initial `ABIERTO`; duplicate code returns 409. Manually retry with an inactive user to check invalid assignment. |
| RF04 | Read/search cases | Folder 02: read by ID, filter by state/responsible/text, pagination, 403 for an unassigned responsible user, and 404 for an unknown ID. |
| RF05 | Edit/reassign cases | `02.07–02.09`: manager reassigns A to B and back; old version returns 409. |
| RF06 | Close/archive cases | Folder 05: active children block closure with 422; finalization permits closure, then logical archive. Read the retained row afterward. |
| RF07 | Register associated tasks | `03.01`: task belongs to an open case and starts `PENDIENTE`; normalized inputs appear in the readable response and stored row. |
| RF08 | Prevent equivalent active tasks | `03.02`: case + normalized title + type duplicate returns 409. Separate PostgreSQL checks verify the V3 unique index on direct writes. |
| RF09 | Edit/reassign tasks | Folder 03: manager changes responsible/priority; responsible user's priority change returns 403; stale version returns 409. |
| RF10 | Enforce task state transitions | Folder 05: move to `EN_PROGRESO`; high-priority closure without confirmation returns 422; responsible caller with confirmation returns 403; supervisor succeeds; reopening a finalized task returns 422. |
| RF11 | Read/cancel tasks | Folder 03 lists filtered tasks and tasks by case; Folder 05 cancels a task and reads the retained `CANCELADA` row. |
| RF12 | Register/read deadlines | Folder 04 creates deadlines and reads a paginated, filtered list. `05.12` also reads one by ID. |
| RF13 | Edit active deadlines | `04.04`: update type/date with current version. For additional evidence, retry with the old version and try editing an annulled deadline; expect 409 and 422 respectively. |
| RF14 | Annul deadlines with a reason | Folder 05: short reason returns 400; PATCH and DELETE preserve records with `ANULADO`, reason, and annulment time. Audit records identify the actor. |
| RF15 | Classify deadline risk | Folder 04: two remaining days with active tasks gives `CRITICO`; eight days gives `MEDIO`. Use the boundary table in section 6 for the full rule. |
| RF16 | Read workload | `04.07`: A has two active tasks; B appears with zero. To show overload, create distinct active tasks until the count exceeds `umbral`; with the default threshold, six is overloaded, five is not. |
| RF17 | Calculate operational indicators | Baseline, intermediate, and final requests verify changes based on persisted tasks. Compare with SQL counts and the percentage formula. |
| RF18 | Read audit records with actor | Folder 06: auditor reads events filtered by type/user; the created task's event identifies its creator. Responsible caller is denied. The rollback test verifies atomicity. |
| RF19 | Load reproducible demo data | Section 9: inspect seeded records, restart, compare counts and IDs. The existing integration test runs the seeder twice and checks idempotence. |

RF20–RF22 are web-interface requirements and remain outside this backend demonstration. RF23 is reported as partially complete; calling the API from Postman does not prove browser integration or a completed frontend.

## 6. Postman practice

### Import and run

1. Import both JSON files into Postman.
2. Select **LegalDeadline Flow - Local lab** as the environment.
3. Set `base_url` to 8081 for Docker or 8082 for IntelliJ Debug.
4. Run all six folders once, in order, with one iteration. For learning, send requests one by one.
5. Check both the response and the assertions. Expected 400/401/403/404/409/422 responses are successful negative tests when their assertions pass.
6. Stop and investigate the first unexpected failure. Later requests depend on earlier IDs and versions.

The first request creates `run_id` and dates relative to the current day in Lima. Each complete run creates two synthetic responsible accounts, one case, two tasks, and two deadlines. Successful completion finalizes those business records and deactivates the lab users. It leaves their history and audit records intact and does not edit the existing demo accounts. An interrupted run may leave its own active fixtures; finish that run or finalize those IDs manually.

Do not rerun a middle folder against an already completed run: its case is archived and its users are inactive. Start again from `01.01` for new fixtures.

### Variables and saved state

| Variable | Use |
|---|---|
| `admin_token`, `supervisor_token`, `auditor_token` | Demo-role credentials returned by login. |
| `a_token`, `b_token` | Tokens of the newly created responsible users. |
| `case_id`, `task_id`, `deadline_id` | IDs obtained from actual creation responses. |
| `case_version`, `task_version`, `deadline_version` | Latest response versions used in subsequent writes. |
| `case_old_version`, `task_old_version` | Earlier versions deliberately used to provoke 409. |
| `case_code`, `run_id` | Identify this lab's records in the database. |
| `date_2`, `date_8`, `date_15` | Dates calculated from Lima's current date. |

Do not hard-code IDs such as 1 or 2. They depend on the database's previous contents. Do not use a fixed calendar date for a risk demonstration: the result changes as time passes.

### The task-creation request

```http
POST {{base_url}}/api/v1/tareas
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

```json
{
  "expedienteId": {{case_id}},
  "titulo": "  Prepare   hearing  ",
  "tipo": "escrito",
  "responsableId": {{a_id}},
  "prioridad": "ALTA",
  "fechaLimite": "{{date_2}}"
}
```

This is a Postman template; it becomes valid JSON after variable substitution. Numeric IDs remain unquoted. Expected response: HTTP 201, a generated ID, `titulo: "Prepare hearing"`, `tipo: "ESCRITO"`, `estado: "PENDIENTE"`, and the current `version`. The controller also supplies a `Location` header.

The client never sends `titulo_normalizado`, `estado`, `creadoEn`, or `actualizadoEn` for this operation. They are controlled by the backend. Do not assume unknown JSON properties are necessarily rejected: the allow-list is expressed by the DTO and the mapping code.

### Useful standalone assertion scripts

Add these to a request's post-response script when practicing manually:

```javascript
pm.test("Task created", function () {
    pm.response.to.have.status(201);
});
const task = pm.response.json();
pm.environment.set("task_id", task.id);
pm.environment.set("task_version", task.version);
```

For a negative duplicate request:

```javascript
pm.test("Equivalent active task is rejected", function () {
    pm.response.to.have.status(409);
    pm.expect(pm.response.json().code).to.eql("TAREA_DUPLICADA");
});
```

For subsequent writes, always use the newest returned version. A failed request should not advance the saved version.

### Risk boundaries to explain and test

| Active deadline situation | Result |
|---|---|
| Already overdue | `CRITICO` |
| 0–2 days remaining and at least one active task in its case | `CRITICO` |
| Up to 5 days remaining, after the critical rule is excluded | `ALTO` |
| 6–10 days remaining | `MEDIO` |
| More than 10 days remaining | `BAJO` |
| Annulled deadline | `BAJO` |

The rule first checks critical conditions. For example, two days with zero active tasks is ALTO. Keep the case's tasks controlled while testing this table.

### Indicators from persistence

The percentage of closed tasks is:

```text
100 × closed / (active + closed)
```

Cancelled tasks are excluded; an empty denominator produces 0. Workload counts PENDIENTE and EN_PROGRESO tasks. Upcoming deadlines are active deadlines due from today through seven days ahead, inclusive. Overdue tasks are active tasks whose deadline is before today.

The collection asserts changes relative to an initial baseline rather than assuming the whole database is empty. Use an otherwise idle development database during this run, because concurrent edits can change those totals. Responsible users receive a restricted view; global roles receive global aggregates.

## 7. Follow one JSON request through the layers

**JSON is the HTTP representation. Inside Java, the request becomes a DTO and then an entity. PostgreSQL receives SQL operations and parameter values, not the original HTTP JSON document.**

### Prepare a focused debug session

1. Start PostgreSQL with `docker compose up -d db`.
2. Start **LegalDeadline Flow - IntelliJ local** using Debug.
3. Set Postman's `base_url` to `http://localhost:8082`.
4. Run Folder 01 and Folder 02 to prepare fresh accounts and an open case.
5. Set the breakpoints below, then send only request `03.01`.
6. Use Step Over to inspect application logic; Step Into is useful for `TareaService` and entity construction. There is no need to step through every Spring/Hibernate framework method.

Prefer thread suspension when available. A debugger pause can hold a transaction and lock the case. Resume the request before sending another write to that case. If Postman times out while you pause, inspect whether the original request eventually committed before resending it.

### Breakpoints and observations

All source paths below are relative to `src/main/java/pe/edu/utp/legaldeadlineflow`.

| Order | Breakpoint | Observe |
|---|---|---|
| 1 | `security/JwtUsuarioConverter.java`, `convert` | Subject/user ID; stored account active flag; stored version versus token version. Do not expose token values in presentation screenshots. |
| 2 | `api/dto/TareaRequest.java`, compact constructor | Raw arguments becoming cleaned title and uppercase type. |
| 3 | `api/TareaController.java`, `crear` | `request` is already a typed, validated DTO. Inspect `request.titulo()` and `request.expedienteId()`. |
| 4 | `service/TareaService.java`, `crear` | Permission checks, open case, active assignable user, and the transaction boundary. |
| 5 | `repository/ExpedienteRepository.java`, inspect its `findByIdForUpdate` declaration | `PESSIMISTIC_WRITE` and JPQL explain the case lock. Interfaces are implemented through Spring proxies, so a breakpoint on the interface may not stop as an ordinary method would. |
| 6 | `service/TareaService.java`, the `tituloNormalizado` assignment and `exigirNoDuplicada` call | The derived uppercase title and the equivalence check. |
| 7 | `domain/Tarea.java`, constructor | DTO IDs have become references to `Expediente` and `Usuario` entities; initial state and timestamps are assigned. |
| 8 | `service/TareaService.java`, immediately after `saveAndFlush` | ID/version are available; INSERT has been flushed, but the surrounding transaction has not yet committed. |
| 9 | `service/TrazabilidadService.java`, `registrar` | Event type, resource ID, authenticated actor, and timestamp. It joins the ongoing business transaction. |
| 10 | `service/TareaService.java`, response mapping | An entity becomes `TareaResponse`; the controller produces the HTTP response. |

### Sequence to describe while stepping

```mermaid
sequenceDiagram
    participant P as Postman
    participant S as Spring Security
    participant C as Controller / DTO
    participant B as TareaService
    participant R as Repositories / Hibernate
    participant D as PostgreSQL
    P->>S: HTTP JSON + Bearer JWT
    S->>D: Check current account and version
    D-->>S: User state
    S->>C: Authenticated request
    C->>C: JSON to record DTO, normalization, validation
    C->>B: crear(request)
    B->>R: Load/lock case; check rules and duplicates
    R->>D: SELECT and lock
    D-->>R: Stored entities/results
    B->>R: Save task and actor audit event
    R->>D: INSERTs within transaction
    R->>D: COMMIT after successful service execution
    B-->>C: Response DTO through transactional proxy
    C-->>P: HTTP 201 + JSON
```

The transaction is managed by Spring's service proxy. `saveAndFlush` sends pending changes to the database; **flush is not commit**. Mapping the response happens inside the service, while the proxy commits before it returns successfully to the controller. Later response serialization is outside that service transaction.

Domain is a shared model used by services and repositories, not an additional HTTP hop. Flyway is an application-startup concern; it does not apply all migrations for each request. JPQL expresses queries over entities; Hibernate translates them to SQL. CRUD repository methods can also produce SQL without an explicit `@Query` annotation.

### Optional SQL logging for this debug run

Add these **Program arguments** to the IntelliJ configuration for the learning session:

```text
--spring.profiles.active=local --logging.level.org.hibernate.SQL=DEBUG
```

This shows SELECT/INSERT/UPDATE statements without enabling parameter-value tracing. Relate each statement to the paused service operation. The exact number of statements depends on account checks, lazy loading, flushes, and the persistence context; do not claim one HTTP request always means one SQL query.

## 8. Failure experiments and transaction rollback

Run the negative examples against fresh lab records and predict where execution stops:

| Experiment | Expected result | Layer responsible |
|---|---|---|
| Remove the Bearer token | 401 | Security before controller execution. |
| Submit malformed JSON | 400, `CUERPO_INVALIDO` | HTTP message conversion. |
| Submit blank task title with a valid token | 400, `VALIDACION_FALLIDA` | DTO construction/Bean Validation before the controller body. |
| Auditor submits a valid creation body | 403 | Authorization checks in the service. |
| Responsible A changes its task's priority | 403 | Service permission rule. |
| Repeat equivalent active task | 409, `TAREA_DUPLICADA` | Service equivalence check; no second task INSERT. |
| Send an old business-record version | 409, `VERSION_DESACTUALIZADA` | Service version check and JPA concurrency protection. |
| Close a case with active children | 422, `EXPEDIENTE_CON_PENDIENTES` | Business rule. |
| Annul with a short reason | 400 | DTO validation. |

Inspect the database afterward: a rejected creation should leave neither a new task nor a task-created audit event. However, a failure **before any write** does not prove that a previously executed write was rolled back.

### A real controlled rollback exercise

The existing integration test `transaccionRevierteCambioYEventoJuntos` creates a case and its audit event inside a transaction, deliberately throws an exception afterward, and verifies that both are absent after rollback. It exercises persistence in the isolated H2 test database, not the shared PostgreSQL demo data.

Run it from the project root:

```powershell
.\mvnw.cmd "-Dtest=ApiIntegrationTest#transaccionRevierteCambioYEventoJuntos" test
```

To understand it in IntelliJ, debug the test and pause immediately before the deliberate `IllegalStateException`. Inspect the creation call and then resume to observe the rollback assertions. Do not add a deliberate production failure endpoint or alter the live database to imitate this test.

For PostgreSQL-specific constraints, use the separate script in section 9. H2 tests do not verify the PostgreSQL-only partial unique index.

## 9. Database evidence, persistence, and demo idempotence

### Open PostgreSQL without printing its password

From the backend root:

```powershell
docker compose exec db sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

In the following SQL, replace `LAB-REPLACE_RUN_ID` with the collection's `case_code`. Leave the SQL quotes in place.

```sql
SELECT id, codigo, asunto, responsable_id, estado, version
FROM expedientes
WHERE codigo = 'LAB-REPLACE_RUN_ID';

SELECT t.id, t.expediente_id, t.titulo, t.titulo_normalizado,
       t.tipo, t.responsable_id, t.prioridad, t.estado, t.version
FROM tareas t
JOIN expedientes e ON e.id = t.expediente_id
WHERE e.codigo = 'LAB-REPLACE_RUN_ID'
ORDER BY t.id;

SELECT p.id, p.estado, p.motivo_anulacion, p.anulado_en, p.version
FROM plazos p
JOIN expedientes e ON e.id = p.expediente_id
WHERE e.codigo = 'LAB-REPLACE_RUN_ID'
ORDER BY p.id;

SELECT ev.tipo, ev.recurso_id, ev.usuario_id, ev.fecha, ev.detalle
FROM eventos ev
JOIN tareas t ON ev.recurso = 'TAREA' AND ev.recurso_id = t.id
JOIN expedientes e ON e.id = t.expediente_id
WHERE e.codigo = 'LAB-REPLACE_RUN_ID'
ORDER BY ev.fecha, ev.id;

SELECT version, description, success
FROM flyway_schema_history
ORDER BY installed_rank;
```

These queries show actual committed data. `titulo_normalizado` is visible in SQL even though it is intentionally absent from the task response DTO.

While paused after a flush but before commit, a separate PostgreSQL connection normally cannot see the new row because it is still uncommitted. Resume and wait for the successful HTTP response, then repeat the SELECT. That distinction is useful evidence of the transaction boundary.

### Compare a JPQL calculation with SQL

```sql
SELECT responsable_id, COUNT(*) AS active_tasks
FROM tareas
WHERE estado IN ('PENDIENTE', 'EN_PROGRESO')
GROUP BY responsable_id
ORDER BY responsable_id;

SELECT
  COUNT(*) FILTER (WHERE estado IN ('PENDIENTE','EN_PROGRESO')) AS active,
  COUNT(*) FILTER (WHERE estado = 'CERRADA') AS closed,
  COUNT(*) FILTER (WHERE estado = 'CANCELADA') AS cancelled
FROM tareas;
```

The first SQL query omits zero-load users; the service merges its JPQL count results with the list of active assignable users so they still appear in the API. Compare global SQL totals with a global-role indicator request, not a responsible user's restricted view.

### Verify PostgreSQL integrity directly

```powershell
Get-Content docs/verificar-integridad-postgresql.sql -Raw | docker compose exec -T db sh -c 'exec psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Expected output includes 12 rejected invalid writes, 4 accepted valid cases, and ROLLBACK. It covers normalization consistency, annulment combinations, and uniqueness of active tasks. It preserves its fixtures only within the transaction; identity sequences may advance even after rollback.

### Show persistence across a restart

1. Capture the lab case's ID, code, state, and task IDs using the SELECTs above.
2. Restart both local services while preserving the volume:

```powershell
docker compose restart db backend
docker compose ps
```

3. Wait for PostgreSQL and the backend to be healthy; restarts can produce a short temporary connection failure.
4. Read the same IDs again from Postman and PostgreSQL. They should still exist, including logically archived/cancelled/annulled records.

Use a global-role token for archived lab data because the lab responsible users are deactivated at the end. If its token expires, log in again. Do not use `docker compose down -v`: that removes the data volume instead of demonstrating persistence.

### Show RF19 seed idempotence

Before and after restarting the backend with demo mode enabled, compare counts limited to the seeded records:

```sql
SELECT COUNT(*) AS demo_users
FROM usuarios
WHERE email IN ('admin@legaldeadline.local','supervisor@legaldeadline.local',
                'responsable@legaldeadline.local','auditor@legaldeadline.local',
                'paola.vargas@legaldeadline.local','diego.ramirez@legaldeadline.local');

SELECT e.codigo, e.estado,
       (SELECT COUNT(*) FROM tareas t WHERE t.expediente_id=e.id) AS tasks,
       (SELECT COUNT(*) FROM plazos p WHERE p.expediente_id=e.id) AS deadlines
FROM expedientes e
WHERE e.codigo IN ('00412-2026-0-1801','00198-2026-0-1801','00057-2026-0-1801','00321-2026-0-1801',
                   '00266-2026-0-1817','00733-2025-0-1801','00981-2024-0-1801')
ORDER BY e.codigo;
```

The second start should not duplicate these rows. In a fresh, otherwise untouched demo seed there are six demo accounts, seven cases (five open, one closed, one archived), seventeen tasks, and eleven deadlines. The case numbers, parties and courts are fictitious. An existing database may have legitimately changed; compare before/after rather than forcing those totals on it. The seed is not a reset function.

The isolated integration test gives reproducible evidence:

```powershell
.\mvnw.cmd "-Dtest=ApiIntegrationTest#demostracionIdempotenteYEscenariosDeIndicadores" test
```

### Complete automated verification

```powershell
.\mvnw.cmd verify
```

Inspect `target/surefire-reports` and `target/site/jacoco/index.html`. The last full project verification before this guide passed 76 tests and the configured coverage threshold. A future run is fresh evidence; an earlier report is not a guarantee that later edits still pass.

For RF02's last-administrator rule, run the existing isolated unit test rather than deactivating the shared demo administrator:

```powershell
.\mvnw.cmd "-Dtest=UsuarioServiceTest#impideDesactivarODegradarUltimoAdministrador" test
```

## 10. Suggested presentation sequence

| Stage | What to show | What to explain |
|---|---|---|
| 1 | Layers diagram and relational model | Each layer has a role; entities correspond to related PostgreSQL tables. |
| 2 | Login, JWT response, anonymous rejection | Credentials establish identity; the token authenticates later calls. |
| 3 | Fresh case and task | DTO validation, service rules, JPA mapping, and committed rows. |
| 4 | Same task with different letter case | Controlled normalization and active equivalence prevent duplicates. |
| 5 | Auditor write and responsible approval attempt | A token and a confirmation flag do not bypass permissions. |
| 6 | Successful supervisor closure | Real identity and the business rule permit the action. |
| 7 | Before/after workload and indicators | Values come from persisted states, not hard-coded mock totals. |
| 8 | Audit row with actor | Business change and traceability are coordinated in one transaction. |
| 9 | Logical finalization and restart | History is retained and data survives process/container restarts. |
| 10 | Debugger walkthrough and rollback test | Explain the request's internal route and what a transaction guarantees. |

For a short presentation, select representative cases; use the RF matrix and automated reports for remaining acceptance criteria. The Postman collection demonstrates backend API behavior. It does not establish completion of the pending web screens, browser compatibility, production HTTPS, or the pending performance target.

## 11. Verification scope and troubleshooting

The included 68-request collection was checked against the local Docker API on port 8081. All its response-status and payload assertions passed, including expected rejection responses. Its scripts were exercised using a local HTTP harness, not the Postman graphical interface. Import and runner behavior in your installed Postman remains a user exercise. See `learning-lab-verification.en.md` for details.

The debug walkthrough, restart exercise, full risk-boundary demonstration, role-change exercise, and named Maven commands are instructions for learning and presentation; they were not all rerun as part of writing this document.

| Symptom | First thing to check |
|---|---|
| 401 on a protected call | Correct Bearer token; expiration; account active/version; rerun the correct login. |
| 403 after successful login | Role and record assignment; the token does not grant global access. |
| 409 on update | Latest `version`, or duplicate code/task. Read `code` in the error response. |
| 422 when creating a task | Case may be closed or archived from a previous completed run. Start a fresh run. |
| No breakpoint hit | Postman must call port 8082 and IntelliJ must be running in Debug. |
| SQL row not visible during a pause | A flush may have happened without a commit. Resume the request. |
| `28P01` on startup | IntelliJ configuration, `.env`, and the actual initialized PostgreSQL credentials must agree. |
| Indicator assertion fails | Check concurrent changes, login role, and whether earlier dependent requests passed. |

Keep evidence tied to a requirement: record the request name, caller role, relevant body, expected/actual status, response fields, and corresponding row or test assertion. This provides a defensible demonstration of the implemented backend rather than only showing that an endpoint responds.
