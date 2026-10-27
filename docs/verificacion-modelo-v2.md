# Verificación del modelo de base de datos — 12 de octubre de 2026

- Maven `verify`: 76 pruebas, 0 fallos, 0 errores; umbral de cobertura satisfecho.
- Compilación del contenedor: correcta con JDK 17 y ejecución con JRE 17.
- PostgreSQL: Flyway V1, V2 y V3 aplicadas correctamente sobre la base existente.
- Copia previa: `target/modelo-v2-previo.dump`, formato PostgreSQL custom (firma PGDMP). Es una copia local de verificación; `mvn clean` elimina target.
- `docs/verificar-integridad-postgresql.sql`: 12 escrituras inválidas rechazadas por la restricción esperada y 4 casos válidos aceptados. Transacción revertida al terminar.
- Verificaciones negativas: correo en mayúsculas o con espacios exteriores; código en minúsculas; título normalizado inconsistente; seis combinaciones inválidas de anulación; inserción activa equivalente; reactivación que duplica una tarea activa.
- Verificaciones positivas: anulación completa; tarea del mismo título con distinto tipo; equivalentes CANCELADA y CERRADA.
- Estado final: contenedores `db` y `backend` saludables; `/actuator/health` en el puerto 8081 responde `UP`.

No se reescribió V1 ni se eliminaron registros existentes. V2 falla ante datos incompatibles y V3 ante duplicados activos; no corrigen silenciosamente esas situaciones. H2 no ejecuta el índice parcial de V3: su comportamiento se verificó en PostgreSQL real.
