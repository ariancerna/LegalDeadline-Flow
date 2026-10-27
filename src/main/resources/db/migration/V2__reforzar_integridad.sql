-- Conserva los datos: si hay filas incompatibles, la migracion falla y se
-- deben revisar esas filas antes de reintentar. No normaliza ni borra datos.
ALTER TABLE usuarios ADD CONSTRAINT ck_usuarios_email_normalizado
    CHECK (email = LOWER(TRIM(email)) AND CHAR_LENGTH(TRIM(email)) > 0);

ALTER TABLE expedientes ADD CONSTRAINT ck_expedientes_codigo_normalizado
    CHECK (codigo = UPPER(TRIM(codigo)) AND CHAR_LENGTH(TRIM(codigo)) > 0);

-- Redundancia controlada para la comparacion de tareas equivalentes.
ALTER TABLE tareas ADD CONSTRAINT ck_tareas_titulo_normalizado
    CHECK (titulo_normalizado = UPPER(titulo));

ALTER TABLE plazos ADD CONSTRAINT ck_plazos_anulacion_coherente
    CHECK (
        (estado = 'ACTIVO' AND motivo_anulacion IS NULL AND anulado_en IS NULL)
        OR
        (estado = 'ANULADO' AND motivo_anulacion IS NOT NULL
            AND CHAR_LENGTH(TRIM(motivo_anulacion)) > 0 AND anulado_en IS NOT NULL)
    );
