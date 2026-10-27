-- PostgreSQL: protege tambien escrituras que no pasan por el servicio Java.
-- Permite conservar tareas equivalentes CERRADAS o CANCELADAS.
CREATE UNIQUE INDEX uk_tareas_activas_equivalentes
    ON tareas (expediente_id, titulo_normalizado, tipo)
    WHERE estado IN ('PENDIENTE', 'EN_PROGRESO');
