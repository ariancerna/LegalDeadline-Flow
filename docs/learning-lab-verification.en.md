# Learning lab verification

Checked on 12 October 2026 at 20:59:57 (America/Lima).

## Result

All **68 requests** and their response assertions passed against `http://localhost:8081`. Expected rejection responses were checked as negative tests; they are not application-test failures.

The imported collection data, variable substitutions, pre-request initialization and post-response scripts were exercised with a local HTTP harness. The Postman desktop import/runner UI was not automated. No claim is made that this run alone exhaustively verifies every acceptance criterion of RF01–RF19.

Run ID: `MV619Q7S`.

## Synthetic fixtures

| Fixture | Database ID | End of completed run |
|---|---:|---|
| Case | 5 | ARCHIVADO, retained |
| Main task | 14 | CERRADA, retained |
| Main deadline | 8 | ANULADO, retained |
| Responsible A | 6 | Deactivated; token rejected |
| Responsible B | 7 | Deactivated |

The collection also creates and cancels a second task and annuls a second deadline. Existing demo administrator, supervisor and auditor accounts are used for login and were not edited by the collection. Tokens and passwords returned at runtime are not included in this report.

## Per-request evidence

| Request | Observed HTTP status | Assertions |
|---|---:|---|
| 01.01 Health and initialize this run | 200 | PASS |
| 01.02 Missing JWT is rejected | 401 | PASS |
| 01.03 Wrong login password | 401 | PASS |
| 01.04 Login as administrator | 200 | PASS |
| 01.05 Login as supervisor | 200 | PASS |
| 01.06 Login as auditor | 200 | PASS |
| 01.07 Create isolated responsible A | 201 | PASS |
| 01.08 Create isolated responsible B | 201 | PASS |
| 01.09 Login as responsible A | 200 | PASS |
| 01.10 Login as responsible B | 200 | PASS |
| 01.11 Read current responsible | 200 | PASS |
| 01.12 Auditor cannot manage users | 403 | PASS |
| 01.13 List users without password data | 200 | PASS |
| 01.14 Read isolated user | 200 | PASS |
| 01.15 Capture indicator baseline | 200 | PASS |
| 02.01 Create an open case | 201 | PASS |
| 02.02 Read the case | 200 | PASS |
| 02.03 Reject duplicate case code | 409 | PASS |
| 02.04 Find the case with paging and filters | 200 | PASS |
| 02.05 Unassigned responsible cannot read it | 403 | PASS |
| 02.06 Missing case | 404 | PASS |
| 02.07 Edit and reassign to B | 200 | PASS |
| 02.08 Reject outdated version | 409 | PASS |
| 02.09 Reassign back to A | 200 | PASS |
| 03.01 Create a high priority task | 201 | PASS |
| 03.02 Reject equivalent active task | 409 | PASS |
| 03.03 DTO rejects a blank title | 400 | PASS |
| 03.04 Auditor cannot create a task | 403 | PASS |
| 03.05 List tasks with filters | 200 | PASS |
| 03.06 List the tasks of the case | 200 | PASS |
| 03.07 Responsible cannot change priority | 403 | PASS |
| 03.08 Manager edits and reassigns task | 200 | PASS |
| 03.09 Reject stale task version | 409 | PASS |
| 03.10 Restore A and high priority | 200 | PASS |
| 03.11 Create a task to cancel | 201 | PASS |
| 04.01 Create an active deadline | 201 | PASS |
| 04.02 Two days plus active tasks means critical | 200 | PASS |
| 04.03 List deadlines with filters | 200 | PASS |
| 04.04 Edit deadline to eight days | 200 | PASS |
| 04.05 Eight days means medium risk | 200 | PASS |
| 04.06 Create deadline for DELETE example | 201 | PASS |
| 04.07 Workload includes a zero-load user | 200 | PASS |
| 04.08 Indicators reflect the new tasks | 200 | PASS |
| 05.01 Case closure blocked by active children | 422 | PASS |
| 05.02 Transition task to IN PROGRESS | 200 | PASS |
| 05.03 High priority closure needs confirmation | 422 | PASS |
| 05.04 Checkbox does not grant supervisor authority | 403 | PASS |
| 05.05 Supervisor closes the high priority task | 200 | PASS |
| 05.06 Finalized task cannot transition again | 422 | PASS |
| 05.07 Cancel the second task | 200 | PASS |
| 05.08 Cancelled task can still be read | 200 | PASS |
| 05.09 Deadline reason is too short | 400 | PASS |
| 05.10 Annul deadline with a reason | 200 | PASS |
| 05.11 Annul another deadline using DELETE | 200 | PASS |
| 05.12 Read retained annulled deadline | 200 | PASS |
| 05.13 Close case after all children are finalized | 200 | PASS |
| 05.14 Archive the case | 200 | PASS |
| 05.15 Read the retained archived case | 200 | PASS |
| 05.16 Cannot add a task to an archived case | 422 | PASS |
| 06.01 Auditor reads filtered events with actor | 200 | PASS |
| 06.02 Responsible cannot read global audit | 403 | PASS |
| 06.03 Final indicators reflect finalization | 200 | PASS |
| 06.04 Change isolated A password | 200 | PASS |
| 06.05 Old A token is revoked | 401 | PASS |
| 06.06 Login A with the new password | 200 | PASS |
| 06.07 Deactivate isolated A | 204 | PASS |
| 06.08 Deactivated A token is rejected | 401 | PASS |
| 06.09 Deactivate isolated B | 204 | PASS |

## Additional evidence required

Use the main guide for the debugger walkthrough, full risk boundaries, overload threshold, role-change experiment, PostgreSQL integrity script, restart/idempotence exercise, and named isolated JUnit tests. These are documented exercises and separate evidence, not results attributed to this 68-request run.

