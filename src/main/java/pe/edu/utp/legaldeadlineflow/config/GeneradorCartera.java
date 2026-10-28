package pe.edu.utp.legaldeadlineflow.config;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import pe.edu.utp.legaldeadlineflow.domain.EventoTipo;
import pe.edu.utp.legaldeadlineflow.domain.ExpedienteEstado;
import pe.edu.utp.legaldeadlineflow.domain.PlazoEstado;
import pe.edu.utp.legaldeadlineflow.domain.Prioridad;
import pe.edu.utp.legaldeadlineflow.domain.TareaEstado;

/**
 * Genera en memoria una cartera grande y coherente para las pruebas de volumen y la presentación.
 * No toca la base de datos: {@link CarteraVolumenSeeder} inserta las filas.
 *
 * <p>Los datos son ficticios y deterministas (misma semilla, misma cartera). Reglas que respeta:
 * <ul>
 *   <li>Un expediente se cierra cuando termina su duración típica según la materia; los cerrados hace
 *       más de un año suelen estar archivados. Así la mayoría de la cartera es histórica.</li>
 *   <li>Los expedientes cerrados o archivados no tienen tareas activas ni plazos activos (RF06).</li>
 *   <li>En un expediente no hay dos tareas activas con el mismo título y tipo (RF08).</li>
 *   <li>La carga activa de cada responsable se limita para que solo unos pocos superen el umbral (RF16).</li>
 *   <li>Los plazos caen en días hábiles y muy pocos están vencidos.</li>
 * </ul>
 */
final class GeneradorCartera {

    record FilaExpediente(long id, String codigo, String asunto, long responsableId, ExpedienteEstado estado,
                          Instant creadoEn, Instant actualizadoEn) { }

    record FilaTarea(long id, long expedienteId, String titulo, String tipo, long responsableId, Prioridad prioridad,
                     LocalDate fechaLimite, TareaEstado estado, Instant creadoEn, Instant actualizadoEn) { }

    record FilaPlazo(long id, long expedienteId, String tipo, LocalDate fechaLimite, PlazoEstado estado,
                     String motivoAnulacion, Instant creadoEn, Instant actualizadoEn, Instant anuladoEn) { }

    record FilaEvento(EventoTipo tipo, String recurso, long recursoId, String detalle, Instant fecha, Long usuarioId) { }

    record Cartera(List<FilaExpediente> expedientes, List<FilaTarea> tareas, List<FilaPlazo> plazos,
                   List<FilaEvento> eventos) { }

    /**
     * @param cantidad          expedientes a generar
     * @param ahora             instante actual; ninguna fila queda en el futuro
     * @param responsables      ids de usuarios RESPONSABLE a los que se asignan expedientes y tareas
     * @param cargaActual       tareas activas que cada responsable ya tiene
     * @param conCargaAlta      responsables a los que se permite superar el umbral
     * @param gestores          ids de quienes registran y cierran expedientes (administrador, supervisor)
     * @param codigosExistentes códigos ya usados en la base
     * @param idExpediente      primer id libre de expedientes (y así con tareas y plazos)
     */
    record Parametros(int cantidad, long semilla, Instant ahora, LocalDate hoy, ZoneId zona, List<Long> responsables,
                      Map<Long, Long> cargaActual, Set<Long> conCargaAlta, List<Long> gestores,
                      Set<String> codigosExistentes, int umbral, long idExpediente, long idTarea, long idPlazo) { }

    // ---------------------------------------------------------------- catálogos

    private record Actividad(String titulo, String tipo, Prioridad prioridad) { }

    private enum Partes { PERSONA_O_EMPRESA, PERSONA_C_EMPRESA, PERSONA_C_PERSONA, ACREEDOR_C_DEUDOR }

    /** Órgano jurisdiccional, código de distrito, duración típica del proceso y su catálogo de trabajo. */
    private enum Area {
        CIVIL("Juzgado Civil de Lima", false, 32, "1801", 6, 22, Partes.PERSONA_O_EMPRESA,
                List.of("CONTESTACION", "EXCEPCIONES", "OFRECIMIENTO_PRUEBAS", "AUDIENCIA_SANEAMIENTO",
                        "AUDIENCIA", "ALEGATOS", "PERICIA", "APELACION", "SUBSANACION"),
                List.of(new Actividad("Contestar la demanda", "ESCRITO", Prioridad.ALTA),
                        new Actividad("Deducir excepciones procesales", "ESCRITO", Prioridad.ALTA),
                        new Actividad("Ofrecer medios probatorios documentales", "ESCRITO", Prioridad.MEDIA),
                        new Actividad("Absolver el traslado de la excepción", "ESCRITO", Prioridad.MEDIA),
                        new Actividad("Preparar los alegatos finales", "ESCRITO", Prioridad.MEDIA),
                        new Actividad("Revisar el dictamen pericial", "REVISION", Prioridad.MEDIA),
                        new Actividad("Coordinar la declaración del testigo", "REUNION", Prioridad.BAJA),
                        new Actividad("Asistir a la audiencia de pruebas", "AUDIENCIA", Prioridad.ALTA),
                        new Actividad("Interponer recurso de apelación", "ESCRITO", Prioridad.ALTA),
                        new Actividad("Solicitar medida cautelar de embargo", "ESCRITO", Prioridad.ALTA))),
        SALA("Sala Civil de Lima", true, 8, "1801", 3, 9, Partes.PERSONA_O_EMPRESA,
                List.of("INFORME_ORAL", "CASACION", "ALEGATOS"),
                List.of(new Actividad("Preparar el informe oral", "REVISION", Prioridad.ALTA),
                        new Actividad("Presentar alegato escrito ante la Sala", "ESCRITO", Prioridad.MEDIA),
                        new Actividad("Evaluar la interposición del recurso de casación", "REVISION", Prioridad.ALTA),
                        new Actividad("Revisar la resolución de vista", "REVISION", Prioridad.MEDIA))),
        LABORAL("Juzgado Especializado de Trabajo de Lima", false, 24, "1801", 5, 16, Partes.PERSONA_C_EMPRESA,
                List.of("AUDIENCIA_CONCILIACION", "AUDIENCIA_JUZGAMIENTO", "CONTESTACION", "APELACION"),
                List.of(new Actividad("Calcular los beneficios sociales adeudados", "REVISION", Prioridad.ALTA),
                        new Actividad("Validar las boletas de pago con el cliente", "REUNION", Prioridad.MEDIA),
                        new Actividad("Revisar la planilla electrónica", "REVISION", Prioridad.MEDIA),
                        new Actividad("Asistir a la audiencia de conciliación", "AUDIENCIA", Prioridad.ALTA),
                        new Actividad("Preparar la teoría del caso para el juzgamiento", "REVISION", Prioridad.ALTA),
                        new Actividad("Presentar la liquidación de devengados", "ESCRITO", Prioridad.MEDIA),
                        new Actividad("Contestar la demanda laboral", "ESCRITO", Prioridad.ALTA))),
        FAMILIA("Juzgado de Familia de Lima", false, 20, "1801", 4, 12, Partes.PERSONA_C_PERSONA,
                List.of("AUDIENCIA_UNICA", "CONTESTACION", "PERICIA", "APELACION"),
                List.of(new Actividad("Coordinar la evaluación psicológica", "REUNION", Prioridad.MEDIA),
                        new Actividad("Presentar el informe socioeconómico", "ESCRITO", Prioridad.MEDIA),
                        new Actividad("Asistir a la audiencia única", "AUDIENCIA", Prioridad.ALTA),
                        new Actividad("Presentar la propuesta de régimen de visitas", "ESCRITO", Prioridad.MEDIA),
                        new Actividad("Revisar el informe del equipo multidisciplinario", "REVISION", Prioridad.MEDIA))),
        PAZ_LETRADO("Juzgado de Paz Letrado de Lima", false, 12, "1801", 2, 8, Partes.PERSONA_C_PERSONA,
                List.of("AUDIENCIA_UNICA", "CONTESTACION", "APELACION"),
                List.of(new Actividad("Presentar la liquidación de pensiones devengadas", "ESCRITO", Prioridad.MEDIA),
                        new Actividad("Acreditar los ingresos del demandado", "REVISION", Prioridad.MEDIA),
                        new Actividad("Solicitar la asignación anticipada", "ESCRITO", Prioridad.ALTA),
                        new Actividad("Asistir a la audiencia única", "AUDIENCIA", Prioridad.ALTA))),
        COMERCIAL("Juzgado Comercial de Lima", false, 17, "1817", 4, 14, Partes.ACREEDOR_C_DEUDOR,
                List.of("CONTRADICCION", "EXCEPCIONES", "PERICIA", "AUDIENCIA", "APELACION"),
                List.of(new Actividad("Verificar la tasación del inmueble", "REVISION", Prioridad.MEDIA),
                        new Actividad("Absolver la contradicción al mandato de ejecución", "ESCRITO", Prioridad.ALTA),
                        new Actividad("Revisar la liquidación del saldo deudor", "REVISION", Prioridad.MEDIA),
                        new Actividad("Solicitar la convocatoria a remate", "ESCRITO", Prioridad.MEDIA),
                        new Actividad("Inscribir la medida cautelar en Registros Públicos", "ESCRITO", Prioridad.MEDIA)));

        final String organo;
        final boolean femenino;
        final int juzgados;
        final String distrito;
        final int mesesMin;
        final int mesesMax;
        final Partes partes;
        final List<String> plazos;
        final List<Actividad> actividades;

        Area(String organo, boolean femenino, int juzgados, String distrito, int mesesMin, int mesesMax,
             Partes partes, List<String> plazos, List<Actividad> actividades) {
            this.organo = organo; this.femenino = femenino; this.juzgados = juzgados; this.distrito = distrito;
            this.mesesMin = mesesMin; this.mesesMax = mesesMax; this.partes = partes; this.plazos = plazos;
            this.actividades = actividades;
        }
    }

    private record Materia(String nombre, Area area, int peso) { }

    private static final List<Materia> MATERIAS = List.of(
            new Materia("Obligación de dar suma de dinero", Area.CIVIL, 10),
            new Materia("Indemnización por daños y perjuicios", Area.CIVIL, 8),
            new Materia("Desalojo por ocupación precaria", Area.CIVIL, 7),
            new Materia("Nulidad de acto jurídico", Area.CIVIL, 5),
            new Materia("Resolución de contrato", Area.CIVIL, 5),
            new Materia("Desalojo por vencimiento de contrato", Area.CIVIL, 4),
            new Materia("Prescripción adquisitiva de dominio", Area.CIVIL, 4),
            new Materia("Otorgamiento de escritura pública", Area.CIVIL, 4),
            new Materia("Reivindicación", Area.CIVIL, 3),
            new Materia("División y partición", Area.CIVIL, 3),
            new Materia("Mejor derecho de propiedad", Area.CIVIL, 2),
            new Materia("Apelación de sentencia", Area.SALA, 5),
            new Materia("Pago de beneficios sociales", Area.LABORAL, 9),
            new Materia("Desnaturalización de contrato", Area.LABORAL, 6),
            new Materia("Reposición por despido incausado", Area.LABORAL, 5),
            new Materia("Indemnización por despido arbitrario", Area.LABORAL, 4),
            new Materia("Pago de horas extras", Area.LABORAL, 3),
            new Materia("Tenencia y custodia", Area.FAMILIA, 4),
            new Materia("Divorcio por causal", Area.FAMILIA, 4),
            new Materia("Régimen de visitas", Area.FAMILIA, 3),
            new Materia("Alimentos", Area.PAZ_LETRADO, 8),
            new Materia("Aumento de alimentos", Area.PAZ_LETRADO, 3),
            new Materia("Exoneración de alimentos", Area.PAZ_LETRADO, 2),
            new Materia("Ejecución de garantías", Area.COMERCIAL, 5),
            new Materia("Ejecución de títulos valores", Area.COMERCIAL, 4),
            new Materia("Indemnización por incumplimiento contractual", Area.COMERCIAL, 2));

    /** Trabajo que aparece en cualquier materia. */
    private static final List<Actividad> COMUNES = List.of(
            new Actividad("Revisar la notificación de la última resolución", "REVISION", Prioridad.MEDIA),
            new Actividad("Presentar escrito de apersonamiento", "ESCRITO", Prioridad.MEDIA),
            new Actividad("Diligenciar la cédula de notificación", "NOTIFICACION", Prioridad.MEDIA),
            new Actividad("Solicitar copias certificadas", "ESCRITO", Prioridad.BAJA),
            new Actividad("Informar al cliente el estado del proceso", "REUNION", Prioridad.BAJA),
            new Actividad("Actualizar el legajo interno del caso", "REVISION", Prioridad.BAJA));

    private static final List<String> APELLIDOS = List.of(
            "Quispe", "Flores", "Sánchez", "Rodríguez", "García", "Rojas", "Mamani", "Huamán", "Vásquez", "Chávez",
            "Ramírez", "Torres", "Díaz", "Mendoza", "Gutiérrez", "Castillo", "Espinoza", "Vargas", "Fernández",
            "Ramos", "López", "Gonzales", "Salazar", "Cruz", "Pérez", "Ríos", "Romero", "Silva", "Morales",
            "Herrera", "Medina", "Aguilar", "Castro", "Ruiz", "Paredes", "Cárdenas", "Soto", "Valverde", "Alvarado",
            "Palomino", "Zapata", "Cáceres", "Navarro", "Condori", "Ticona", "Arévalo", "Villanueva", "Saavedra",
            "Benites", "Lozano", "Gamarra", "Pacheco", "Meza", "Oré", "Tello", "Jiménez", "Delgado", "Campos",
            "Huaranga", "Ccori", "Inga", "Yupanqui", "Bustamante", "Escobar", "Valdivia", "Montoya", "Tapia");

    private static final List<String> EMPRESA_RUBRO = List.of(
            "Inversiones", "Constructora", "Distribuidora", "Inmobiliaria", "Transportes", "Comercial",
            "Agroindustrial", "Corporación", "Servicios Generales", "Textil", "Importadora", "Consorcio",
            "Grupo", "Clínica", "Logística", "Ferretería");
    private static final List<String> EMPRESA_NOMBRE = List.of(
            "Los Andes", "Pacífico Sur", "San Martín", "Santa Rosa", "Rímac", "Miraflores", "Chavín", "Amazonía",
            "Huascarán", "Costa Verde", "El Sol Naciente", "Norte Grande", "La Molina", "Libertad", "Wari",
            "Titicaca", "Puerto Callao", "Lurín", "Valle Sagrado", "Paracas", "Cordillera Blanca", "Mantaro");
    private static final List<String> EMPRESA_FORMA = List.of("S.A.C.", "S.A.C.", "S.A.", "E.I.R.L.", "S.R.L.");
    private static final List<String> ACREEDORES = List.of(
            "Banco Andino del Perú", "Caja Municipal del Sur", "Financiera Progreso Andino",
            "Caja Rural Señor del Mar", "Cooperativa de Ahorro Valle Fértil");

    private static final List<String> MOTIVOS_ANULACION = List.of(
            "Audiencia reprogramada por el juzgado mediante la Resolución N.º %d",
            "El juzgado concedió prórroga del plazo mediante la Resolución N.º %d",
            "Plazo registrado por duplicado; se conserva el plazo vigente",
            "Se dejó sin efecto el acto procesal por nulidad declarada en la Resolución N.º %d",
            "Proceso suspendido a pedido de ambas partes según la Resolución N.º %d");

    // ---------------------------------------------------------------- generación

    private final Parametros p;
    private final Random azar;
    private final Instant ahora;
    private final Map<Long, Long> carga;
    private final Map<Long, Integer> limiteCarga = new HashMap<>();
    private final double[] pesosResponsables;
    private final Set<String> codigos;
    private final int pesoMaterias;

    private long idExpediente;
    private long idTarea;
    private long idPlazo;

    private final List<FilaExpediente> expedientes = new ArrayList<>();
    private final List<FilaTarea> tareas = new ArrayList<>();
    private final List<FilaPlazo> plazos = new ArrayList<>();
    private final List<FilaEvento> eventos = new ArrayList<>();

    private GeneradorCartera(Parametros p) {
        if (p.responsables().isEmpty() || p.gestores().isEmpty()) {
            throw new IllegalArgumentException("Se necesita al menos un responsable y un gestor");
        }
        this.p = p;
        this.azar = new Random(p.semilla());
        this.ahora = p.ahora();
        this.carga = new HashMap<>(p.cargaActual());
        this.codigos = new HashSet<>(p.codigosExistentes());
        this.idExpediente = p.idExpediente();
        this.idTarea = p.idTarea();
        this.idPlazo = p.idPlazo();
        this.pesosResponsables = new double[p.responsables().size()];
        for (int i = 0; i < pesosResponsables.length; i++) {
            Long id = p.responsables().get(i);
            // Unos pocos con carga alta superan el umbral; el resto queda en el umbral o por debajo.
            limiteCarga.put(id, p.conCargaAlta().contains(id) ? p.umbral() + 2 + azar.nextInt(3) : p.umbral() - azar.nextInt(3));
            pesosResponsables[i] = 0.6 + azar.nextDouble() * 0.8;
        }
        this.pesoMaterias = MATERIAS.stream().mapToInt(Materia::peso).sum();
    }

    static Cartera generar(Parametros parametros) {
        GeneradorCartera g = new GeneradorCartera(parametros);
        for (int i = 0; i < parametros.cantidad(); i++) g.expediente();
        g.eventos.sort((a, b) -> a.fecha().compareTo(b.fecha()));
        return new Cartera(g.expedientes, g.tareas, g.plazos, g.eventos);
    }

    private void expediente() {
        Materia materia = materia();
        Area area = materia.area();
        LocalDate creado = fechaCreacion();
        LocalDate fin = creado.plusMonths(area.mesesMin + azar.nextInt(area.mesesMax - area.mesesMin + 1))
                .plusDays(azar.nextInt(28));
        ExpedienteEstado estado = ExpedienteEstado.ABIERTO;
        if (fin.isBefore(p.hoy())) {
            boolean antiguo = ChronoUnit.DAYS.between(fin, p.hoy()) > 365;
            estado = antiguo && azar.nextInt(100) < 75 ? ExpedienteEstado.ARCHIVADO : ExpedienteEstado.CERRADO;
        }
        long responsable = responsable();
        long gestor = elegir(p.gestores());
        long id = idExpediente++;
        String codigo = codigo(creado, area);
        Instant creadoEn = instante(creado);
        LocalDate cierre = estado == ExpedienteEstado.ABIERTO ? null : fin;
        LocalDate archivo = estado == ExpedienteEstado.ARCHIVADO
                ? minimo(fin.plusDays(30 + azar.nextInt(120)), p.hoy().minusDays(1)) : null;
        Instant cierreEn = cierre == null ? null : instanteDesde(cierre, creadoEn);
        Instant archivoEn = archivo == null ? null : instanteDesde(archivo, cierreEn);
        Instant actualizadoEn = archivoEn != null ? archivoEn : cierreEn != null ? cierreEn
                : instanteDesde(entre(creado, p.hoy().minusDays(1)), creadoEn);
        expedientes.add(new FilaExpediente(id, codigo, asunto(materia), responsable, estado, creadoEn, actualizadoEn));

        eventos.add(new FilaEvento(EventoTipo.EXPEDIENTE_CREADO, "EXPEDIENTE", id,
                "Expediente " + codigo + " creado", creadoEn, gestor));
        if (cierreEn != null) {
            eventos.add(new FilaEvento(EventoTipo.EXPEDIENTE_CERRADO, "EXPEDIENTE", id,
                    "Expediente cerrado sin tareas ni plazos activos", cierreEn, gestor));
        }
        if (archivoEn != null) {
            eventos.add(new FilaEvento(EventoTipo.EXPEDIENTE_ARCHIVADO, "EXPEDIENTE", id,
                    "Expediente archivado conservando su historial", archivoEn, gestor));
        }

        List<Actividad> catalogo = new ArrayList<>(area.actividades);
        catalogo.addAll(COMUNES);
        java.util.Collections.shuffle(catalogo, azar);
        int usadas = 0;

        // Historial: trabajo ya terminado durante la vida del expediente.
        LocalDate finHistorial = minimo(cierre != null ? cierre : p.hoy().minusDays(2), p.hoy().minusDays(2));
        int historicas = 1 + azar.nextInt(3);
        for (int i = 0; i < historicas && usadas < catalogo.size(); i++) {
            if (!finHistorial.isAfter(creado)) break;
            tareaHistorica(id, codigo, catalogo.get(usadas++), responsable, creado, finHistorial);
        }

        if (estado != ExpedienteEstado.ABIERTO) return;

        // Trabajo en curso: solo en expedientes abiertos y sin pasar el límite de carga.
        int r = azar.nextInt(100);
        int activas = r < 45 ? 0 : r < 85 ? 1 : 2;
        for (int i = 0; i < activas && usadas < catalogo.size(); i++) {
            long asignado = azar.nextInt(100) < 88 ? responsable : responsable();
            if (carga.getOrDefault(asignado, 0L) >= limiteCarga.getOrDefault(asignado, p.umbral())) continue;
            tareaActiva(id, codigo, catalogo.get(usadas++), asignado, creado);
        }

        // Plazos en días hábiles: la mayoría por venir, muy pocos vencidos.
        List<String> tipos = new ArrayList<>(area.plazos);
        java.util.Collections.shuffle(tipos, azar);
        r = azar.nextInt(100);
        int cantidadPlazos = r < 40 ? 0 : r < 88 ? 1 : 2;
        LocalDate desde = p.hoy();
        for (int i = 0; i < cantidadPlazos; i++) {
            int dias = azar.nextInt(1000) < 15 ? -(1 + azar.nextInt(6)) : azar.nextInt(180);
            LocalDate fecha = habil(desde.plusDays(dias));
            plazo(id, codigo, tipos.get(i), fecha, creado, responsable, null);
            desde = fecha.plusDays(7);
        }
        if (azar.nextInt(100) < 6) {
            String motivo = String.format(Locale.ROOT, MOTIVOS_ANULACION.get(azar.nextInt(MOTIVOS_ANULACION.size())),
                    2 + azar.nextInt(14));
            plazo(id, codigo, tipos.get(tipos.size() - 1), habil(p.hoy().plusDays(azar.nextInt(40) - 10)),
                    creado, gestor, motivo);
        }
    }

    private void tareaHistorica(long expediente, String codigo, Actividad a, long responsable,
                                LocalDate desde, LocalDate hasta) {
        LocalDate creada = entre(desde, hasta);
        LocalDate limite = habil(creada.plusDays(3 + azar.nextInt(18)));
        LocalDate cerrada = minimo(limite.minusDays(azar.nextInt(4)), p.hoy().minusDays(1));
        if (cerrada.isBefore(creada)) cerrada = creada;
        TareaEstado estado = azar.nextInt(100) < 88 ? TareaEstado.CERRADA : TareaEstado.CANCELADA;
        long id = idTarea++;
        Instant creadoEn = instante(creada);
        Instant actualizadoEn = instanteDesde(cerrada, creadoEn);
        tareas.add(new FilaTarea(id, expediente, a.titulo(), a.tipo(), responsable, a.prioridad(), limite, estado,
                creadoEn, actualizadoEn));
        // La bitácora detalla solo los últimos tres meses; lo anterior queda en el registro del expediente.
        if (creada.isAfter(p.hoy().minusDays(90))) {
            eventos.add(new FilaEvento(EventoTipo.TAREA_CREADA, "TAREA", id,
                    "Tarea creada en el expediente " + codigo, creadoEn, responsable));
        }
        if (cerrada.isAfter(p.hoy().minusDays(90))) {
            eventos.add(estado == TareaEstado.CANCELADA
                    ? new FilaEvento(EventoTipo.TAREA_CANCELADA, "TAREA", id,
                        "Estado cambiado de PENDIENTE a CANCELADA", actualizadoEn, responsable)
                    : new FilaEvento(EventoTipo.TAREA_ESTADO_CAMBIADO, "TAREA", id,
                        "Estado cambiado de EN_PROGRESO a CERRADA", actualizadoEn, responsable));
        }
    }

    private void tareaActiva(long expediente, String codigo, Actividad a, long responsable, LocalDate creadoExpediente) {
        int dias = azar.nextInt(100) < 5 ? -(1 + azar.nextInt(4)) : azar.nextInt(26);
        LocalDate limite = habil(p.hoy().plusDays(dias));
        LocalDate creada = maximo(creadoExpediente, p.hoy().minusDays(1 + azar.nextInt(15)));
        boolean enProgreso = azar.nextInt(100) < 35;
        Prioridad prioridad = dias <= 3 && a.prioridad() == Prioridad.MEDIA ? Prioridad.ALTA : a.prioridad();
        long id = idTarea++;
        Instant creadoEn = instante(creada);
        Instant actualizadoEn = enProgreso ? instanteDesde(entre(creada, p.hoy()), creadoEn) : creadoEn;
        tareas.add(new FilaTarea(id, expediente, a.titulo(), a.tipo(), responsable, prioridad, limite,
                enProgreso ? TareaEstado.EN_PROGRESO : TareaEstado.PENDIENTE, creadoEn, actualizadoEn));
        carga.merge(responsable, 1L, Long::sum);
        eventos.add(new FilaEvento(EventoTipo.TAREA_CREADA, "TAREA", id,
                "Tarea creada en el expediente " + codigo, creadoEn, responsable));
        if (enProgreso) {
            eventos.add(new FilaEvento(EventoTipo.TAREA_ESTADO_CAMBIADO, "TAREA", id,
                    "Estado cambiado de PENDIENTE a EN_PROGRESO", actualizadoEn, responsable));
        }
    }

    private void plazo(long expediente, String codigo, String tipo, LocalDate fecha, LocalDate creadoExpediente,
                       long autor, String motivoAnulacion) {
        LocalDate registro = maximo(creadoExpediente, minimo(fecha.minusDays(5 + azar.nextInt(40)), p.hoy().minusDays(1)));
        if (registro.isAfter(p.hoy().minusDays(1))) registro = p.hoy().minusDays(1);
        long id = idPlazo++;
        Instant creadoEn = instante(registro);
        eventos.add(new FilaEvento(EventoTipo.PLAZO_CREADO, "PLAZO", id,
                "Plazo creado en el expediente " + codigo, creadoEn, autor));
        if (motivoAnulacion == null) {
            plazos.add(new FilaPlazo(id, expediente, tipo, fecha, PlazoEstado.ACTIVO, null, creadoEn, creadoEn, null));
            return;
        }
        Instant anuladoEn = instanteDesde(entre(registro, p.hoy().minusDays(1)), creadoEn);
        plazos.add(new FilaPlazo(id, expediente, tipo, fecha, PlazoEstado.ANULADO, motivoAnulacion, creadoEn,
                anuladoEn, anuladoEn));
        eventos.add(new FilaEvento(EventoTipo.PLAZO_ANULADO, "PLAZO", id, "Plazo anulado: " + motivoAnulacion,
                anuladoEn, autor));
    }

    // ---------------------------------------------------------------- piezas

    private Materia materia() {
        int x = azar.nextInt(pesoMaterias);
        for (Materia m : MATERIAS) {
            x -= m.peso();
            if (x < 0) return m;
        }
        return MATERIAS.get(0);
    }

    /** Fecha de ingreso: de 2019 a hoy, con más expedientes en los años recientes. */
    private LocalDate fechaCreacion() {
        int[] pesos = {8, 9, 11, 13, 14, 15, 16, 14};
        int primerAnio = p.hoy().getYear() - pesos.length + 1;
        int total = 0;
        for (int w : pesos) total += w;
        int x = azar.nextInt(total);
        int anio = primerAnio;
        for (int w : pesos) {
            x -= w;
            if (x < 0) break;
            anio++;
        }
        LocalDate inicio = LocalDate.of(anio, 1, 1);
        LocalDate fin = minimo(LocalDate.of(anio, 12, 31), p.hoy().minusDays(3));
        return habil(entre(inicio, fin));
    }

    private String codigo(LocalDate creado, Area area) {
        // El número crece a lo largo del año, como el correlativo de la mesa de partes.
        int base = (creado.getDayOfYear() - 1) * 27;
        String codigo;
        do {
            codigo = String.format(Locale.ROOT, "%05d-%d-0-%s", base + 1 + azar.nextInt(27), creado.getYear(), area.distrito);
            base += 27;
        } while (!codigos.add(codigo));
        return codigo;
    }

    private String asunto(Materia materia) {
        Area area = materia.area();
        String partes = switch (area.partes) {
            case PERSONA_C_PERSONA -> persona() + " c. " + persona();
            case PERSONA_C_EMPRESA -> persona() + " c. " + empresa();
            case ACREEDOR_C_DEUDOR -> (azar.nextInt(100) < 60 ? elegir(ACREEDORES) : empresa()) + " c. "
                    + (azar.nextBoolean() ? empresa() : persona());
            case PERSONA_O_EMPRESA -> {
                String demandante = azar.nextInt(100) < 8 ? "Sucesión " + persona()
                        : azar.nextInt(100) < 60 ? persona() : empresa();
                yield demandante + " c. " + (azar.nextBoolean() ? persona() : empresa());
            }
        };
        int numero = 1 + azar.nextInt(area.juzgados);
        return materia.nombre() + " · " + partes + " · " + ordinal(numero, area.femenino) + " " + area.organo;
    }

    private String persona() {
        String primero = elegir(APELLIDOS);
        String segundo;
        do { segundo = elegir(APELLIDOS); } while (segundo.equals(primero));
        return primero + " " + segundo;
    }

    private String empresa() {
        return elegir(EMPRESA_RUBRO) + " " + elegir(EMPRESA_NOMBRE) + " " + elegir(EMPRESA_FORMA);
    }

    static String ordinal(int n, boolean femenino) {
        if (femenino) return n + ".ª";
        boolean apocope = (n % 10 == 1 && n % 100 != 11) || n % 10 == 3;
        return n + (apocope ? ".er" : ".º");
    }

    private long responsable() {
        double total = 0;
        for (double w : pesosResponsables) total += w;
        double x = azar.nextDouble() * total;
        for (int i = 0; i < pesosResponsables.length; i++) {
            x -= pesosResponsables[i];
            if (x < 0) return p.responsables().get(i);
        }
        return p.responsables().get(p.responsables().size() - 1);
    }

    private <T> T elegir(List<T> lista) {
        return lista.get(azar.nextInt(lista.size()));
    }

    private LocalDate entre(LocalDate desde, LocalDate hasta) {
        if (!hasta.isAfter(desde)) return desde;
        return desde.plusDays(azar.nextInt((int) ChronoUnit.DAYS.between(desde, hasta) + 1));
    }

    /** Hora de oficina (8:00 a 18:59) del día indicado. */
    private Instant instante(LocalDate dia) {
        Instant instante = dia.atTime(8 + azar.nextInt(11), azar.nextInt(60)).atZone(p.zona()).toInstant();
        return instante.isAfter(ahora) ? ahora.minusSeconds(60L * (1 + azar.nextInt(90))) : instante;
    }

    /** Como {@link #instante}, pero nunca antes de {@code minimo} (p. ej., el cierre después del registro). */
    private Instant instanteDesde(LocalDate dia, Instant minimo) {
        Instant instante = instante(dia);
        if (!instante.isBefore(minimo)) return instante;
        Instant despues = minimo.plusSeconds(60L * (5 + azar.nextInt(120)));
        return despues.isAfter(ahora) ? minimo : despues;
    }

    /** Traslada sábados y domingos al lunes siguiente. */
    static LocalDate habil(LocalDate fecha) {
        if (fecha.getDayOfWeek() == DayOfWeek.SATURDAY) return fecha.plusDays(2);
        if (fecha.getDayOfWeek() == DayOfWeek.SUNDAY) return fecha.plusDays(1);
        return fecha;
    }

    private static LocalDate minimo(LocalDate a, LocalDate b) { return a.isBefore(b) ? a : b; }
    private static LocalDate maximo(LocalDate a, LocalDate b) { return a.isAfter(b) ? a : b; }

    /** Nombres de los responsables adicionales de la cartera grande (ficticios). */
    static List<String> nombresResponsables(int cantidad, long semilla) {
        List<String> nombres = List.of("Ana", "Luis", "María", "José", "Carmen", "Miguel", "Rosa", "Juan", "Patricia",
                "Gabriela", "Renzo", "Valeria", "Fernando", "Milagros", "Ricardo", "Daniela", "Héctor", "Claudia",
                "Óscar", "Karina", "Javier", "Sofía", "Alonso", "Fiorella", "Gustavo", "Lorena", "Raúl", "Mónica",
                "Sergio", "Verónica", "César", "Silvia", "Martín", "Elena", "Iván", "Natalia", "Eduardo", "Pilar",
                "Rodrigo", "Cecilia", "Manuel", "Jimena", "Alberto", "Teresa");
        Random r = new Random(semilla);
        Set<String> resultado = new LinkedHashSet<>();
        List<String> pila = new ArrayList<>(nombres);
        java.util.Collections.shuffle(pila, r);
        int i = 0;
        while (resultado.size() < cantidad) {
            String nombre = pila.get(i % pila.size());
            String a = APELLIDOS.get(r.nextInt(APELLIDOS.size()));
            String b;
            do { b = APELLIDOS.get(r.nextInt(APELLIDOS.size())); } while (b.equals(a));
            resultado.add(nombre + " " + a + " " + b);
            i++;
        }
        return new ArrayList<>(resultado);
    }
}
