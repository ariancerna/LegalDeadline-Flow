-- Ejecutar con psql -v ON_ERROR_STOP=1 despues de migrar a V3.
-- Prueba SQL directo: ninguna validacion depende de servicios Java.
BEGIN;
DO $$
DECLARE
    usuario BIGINT;
    expediente BIGINT;
    tarea BIGINT;
    plazo BIGINT;
    finalizada BIGINT;
    caso RECORD;
    restriccion TEXT;
    comprobaciones INTEGER := 0;
BEGIN
    INSERT INTO usuarios(nombre,email,password_hash,rol)
    VALUES ('Verificacion transaccional', 'verify-' || md5(random()::text) || '@test.local',
            'hash-solo-prueba', 'RESPONSABLE') RETURNING id INTO usuario;
    INSERT INTO expedientes(codigo,asunto,responsable_id,estado,creado_en,actualizado_en)
    VALUES ('VERIFY-' || upper(substr(md5(random()::text),1,12)), 'Prueba de integridad',
            usuario, 'ABIERTO', now(), now()) RETURNING id INTO expediente;
    INSERT INTO tareas(expediente_id,titulo,titulo_normalizado,tipo,responsable_id,
                       prioridad,fecha_limite,estado,creado_en,actualizado_en)
    VALUES (expediente,'Revisar escrito','REVISAR ESCRITO','ESCRITO',usuario,
            'MEDIA',current_date,'PENDIENTE',now(),now()) RETURNING id INTO tarea;
    INSERT INTO plazos(expediente_id,tipo,fecha_limite,estado,creado_en,actualizado_en)
    VALUES (expediente,'LEGAL',current_date,'ACTIVO',now(),now()) RETURNING id INTO plazo;

    FOR caso IN SELECT * FROM (VALUES
        (format('UPDATE usuarios SET email=upper(email) WHERE id=%s',usuario), 'ck_usuarios_email_normalizado'),
        (format('UPDATE usuarios SET email='' '' || email WHERE id=%s',usuario), 'ck_usuarios_email_normalizado'),
        (format('UPDATE expedientes SET codigo=lower(codigo) WHERE id=%s',expediente), 'ck_expedientes_codigo_normalizado'),
        (format('UPDATE tareas SET titulo_normalizado=''OTRO TITULO'' WHERE id=%s',tarea), 'ck_tareas_titulo_normalizado'),
        (format('UPDATE plazos SET estado=''ANULADO'' WHERE id=%s',plazo), 'ck_plazos_anulacion_coherente'),
        (format('UPDATE plazos SET estado=''ANULADO'',motivo_anulacion=''Motivo valido'' WHERE id=%s',plazo), 'ck_plazos_anulacion_coherente'),
        (format('UPDATE plazos SET estado=''ANULADO'',anulado_en=now() WHERE id=%s',plazo), 'ck_plazos_anulacion_coherente'),
        (format('UPDATE plazos SET estado=''ANULADO'',motivo_anulacion=''   '',anulado_en=now() WHERE id=%s',plazo), 'ck_plazos_anulacion_coherente'),
        (format('UPDATE plazos SET motivo_anulacion=''Motivo incompatible'' WHERE id=%s',plazo), 'ck_plazos_anulacion_coherente'),
        (format('UPDATE plazos SET anulado_en=now() WHERE id=%s',plazo), 'ck_plazos_anulacion_coherente'),
        (format('INSERT INTO tareas(expediente_id,titulo,titulo_normalizado,tipo,responsable_id,prioridad,fecha_limite,estado,creado_en,actualizado_en) SELECT expediente_id,titulo,titulo_normalizado,tipo,responsable_id,prioridad,fecha_limite,''EN_PROGRESO'',now(),now() FROM tareas WHERE id=%s',tarea), 'uk_tareas_activas_equivalentes')
    ) AS pruebas(sentencia, esperada)
    LOOP
        BEGIN
            EXECUTE caso.sentencia;
            RAISE EXCEPTION 'La BD acepto una escritura invalida: %', caso.esperada;
        EXCEPTION WHEN check_violation OR unique_violation THEN
            GET STACKED DIAGNOSTICS restriccion = CONSTRAINT_NAME;
            IF restriccion <> caso.esperada THEN
                RAISE EXCEPTION 'Restriccion incorrecta: %, esperada %', restriccion, caso.esperada;
            END IF;
            comprobaciones := comprobaciones + 1;
        END;
    END LOOP;

    -- Una anulacion completa es valida.
    UPDATE plazos SET estado='ANULADO',motivo_anulacion='Prueba justificada',anulado_en=now()
    WHERE id=plazo;

    -- Mismo titulo con otro tipo, y equivalentes finalizadas, son validos.
    INSERT INTO tareas(expediente_id,titulo,titulo_normalizado,tipo,responsable_id,
                       prioridad,fecha_limite,estado,creado_en,actualizado_en)
    VALUES (expediente,'Revisar escrito','REVISAR ESCRITO','AUDIENCIA',usuario,
            'MEDIA',current_date,'PENDIENTE',now(),now()),
           (expediente,'Revisar escrito','REVISAR ESCRITO','ESCRITO',usuario,
            'MEDIA',current_date,'CANCELADA',now(),now());
    INSERT INTO tareas(expediente_id,titulo,titulo_normalizado,tipo,responsable_id,
                       prioridad,fecha_limite,estado,creado_en,actualizado_en)
    VALUES (expediente,'Revisar escrito','REVISAR ESCRITO','ESCRITO',usuario,
            'MEDIA',current_date,'CERRADA',now(),now()) RETURNING id INTO finalizada;
    BEGIN
        UPDATE tareas SET estado='PENDIENTE' WHERE id=finalizada;
        RAISE EXCEPTION 'La BD permitio reactivar una tarea equivalente';
    EXCEPTION WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS restriccion = CONSTRAINT_NAME;
        IF restriccion <> 'uk_tareas_activas_equivalentes' THEN RAISE; END IF;
        comprobaciones := comprobaciones + 1;
    END;
    RAISE NOTICE 'OK: % escrituras invalidas rechazadas y 4 casos validos aceptados', comprobaciones;
END $$;
ROLLBACK;
