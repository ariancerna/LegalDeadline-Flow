package pe.edu.utp.legaldeadlineflow.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.legaldeadlineflow.api.dto.*;
import pe.edu.utp.legaldeadlineflow.domain.*;
import pe.edu.utp.legaldeadlineflow.exception.*;
import pe.edu.utp.legaldeadlineflow.repository.TareaRepository;
import pe.edu.utp.legaldeadlineflow.security.AccesoService;

@Service
public class TareaService {
    public static final Set<TareaEstado> ESTADOS_ACTIVOS =
            Collections.unmodifiableSet(EnumSet.of(TareaEstado.PENDIENTE, TareaEstado.EN_PROGRESO));
    private final TareaRepository tareaRepository;
    private final ExpedienteService expedienteService;
    private final TrazabilidadService trazabilidadService;
    private final AccesoService acceso;
    private final Clock clock;

    public TareaService(TareaRepository tareaRepository, ExpedienteService expedienteService,
                        TrazabilidadService trazabilidadService, AccesoService acceso, Clock clock) {
        this.tareaRepository = tareaRepository;
        this.expedienteService = expedienteService;
        this.trazabilidadService = trazabilidadService;
        this.acceso = acceso;
        this.clock = clock;
    }

    @Transactional
    public TareaResponse crear(TareaRequest request) {
        Expediente expediente = expedienteService.buscarParaActualizar(request.expedienteId());
        acceso.exigirEscrituraExpediente(expediente);
        expedienteService.exigirAbierto(expediente);
        exigirAsignacionPermitida(request.responsableId(), acceso.usuarioActual().getId());
        Usuario responsable = acceso.validarResponsable(request.responsableId());
        String tituloNormalizado = request.titulo().toUpperCase(Locale.ROOT);
        exigirNoDuplicada(expediente.getId(), tituloNormalizado, request.tipo(), null);
        Tarea tarea = tareaRepository.saveAndFlush(new Tarea(expediente, request.titulo(), tituloNormalizado,
                request.tipo(), responsable, request.prioridad(), request.fechaLimite(), Instant.now(clock)));
        registrar(EventoTipo.TAREA_CREADA, tarea, "Tarea creada en el expediente " + expediente.getCodigo());
        return toResponse(tarea);
    }

    @Transactional(readOnly = true)
    public TareaResponse obtener(Long id) {
        Tarea tarea = buscar(id);
        acceso.exigirLecturaTarea(tarea);
        return toResponse(tarea);
    }

    @Transactional(readOnly = true)
    public Page<TareaResponse> listar(int page, int size, Long expedienteId, Long responsableId,
                                     TareaEstado estado, Prioridad prioridad, LocalDate desde, LocalDate hasta) {
        validarFechas(desde, hasta);
        Usuario usuario = acceso.usuarioActual();
        Specification<Tarea> spec = (root, query, cb) -> {
            List<Predicate> filtros = new ArrayList<>();
            if (usuario.getRol() == Rol.RESPONSABLE) {
                filtros.add(cb.or(cb.equal(root.get("responsable").get("id"), usuario.getId()),
                        cb.equal(root.get("expediente").get("responsable").get("id"), usuario.getId())));
            }
            if (expedienteId != null) filtros.add(cb.equal(root.get("expediente").get("id"), expedienteId));
            if (responsableId != null) filtros.add(cb.equal(root.get("responsable").get("id"), responsableId));
            if (estado != null) filtros.add(cb.equal(root.get("estado"), estado));
            if (prioridad != null) filtros.add(cb.equal(root.get("prioridad"), prioridad));
            if (desde != null) filtros.add(cb.greaterThanOrEqualTo(root.get("fechaLimite"), desde));
            if (hasta != null) filtros.add(cb.lessThanOrEqualTo(root.get("fechaLimite"), hasta));
            return cb.and(filtros.toArray(Predicate[]::new));
        };
        return tareaRepository.findAll(spec, ExpedienteService.pagina(page, size)).map(this::toResponse);
    }

    @Transactional
    public TareaResponse actualizar(Long id, TareaActualizarRequest request) {
        Tarea tarea = prepararEscritura(id);
        exigirActiva(tarea);
        ExpedienteService.exigirVersion(tarea.getVersion(), request.version());
        exigirAsignacionPermitida(request.responsableId(), tarea.getResponsableId());
        if (request.prioridad() != tarea.getPrioridad()) acceso.exigirGestor();
        Usuario responsable = acceso.validarResponsable(request.responsableId());
        String tituloNormalizado = request.titulo().toUpperCase(Locale.ROOT);
        exigirNoDuplicada(tarea.getExpediente().getId(), tituloNormalizado, request.tipo(), id);
        tarea.actualizar(request.titulo(), tituloNormalizado, request.tipo(), responsable,
                request.prioridad(), request.fechaLimite(), Instant.now(clock));
        tareaRepository.saveAndFlush(tarea);
        registrar(EventoTipo.TAREA_ACTUALIZADA, tarea, "Datos y asignación de la tarea actualizados");
        return toResponse(tarea);
    }

    @Transactional
    public TareaResponse cambiarEstado(Long id, CambioEstadoTareaRequest request) {
        Tarea tarea = prepararEscritura(id);
        ExpedienteService.exigirVersion(tarea.getVersion(), request.version());
        validarTransicion(tarea.getEstado(), request.nuevoEstado());
        if (request.nuevoEstado() == TareaEstado.CERRADA && tarea.getPrioridad() == Prioridad.ALTA) {
            if (!request.tieneConfirmacionSupervisor()) {
                throw new UnprocessableEntityException("CIERRE_REQUIERE_CONFIRMACION",
                        "Una tarea de prioridad ALTA requiere confirmación del supervisor para cerrarse");
            }
            acceso.exigirGestor();
        }
        TareaEstado anterior = tarea.getEstado();
        tarea.cambiarEstado(request.nuevoEstado(), Instant.now(clock));
        tareaRepository.saveAndFlush(tarea);
        registrar(request.nuevoEstado() == TareaEstado.CANCELADA ? EventoTipo.TAREA_CANCELADA
                        : EventoTipo.TAREA_ESTADO_CAMBIADO,
                tarea, "Estado cambiado de " + anterior + " a " + tarea.getEstado());
        return toResponse(tarea);
    }

    @Transactional
    public TareaResponse cancelar(Long id, VersionRequest request) {
        Tarea tarea = prepararEscritura(id);
        exigirActiva(tarea);
        ExpedienteService.exigirVersion(tarea.getVersion(), request.version());
        tarea.cambiarEstado(TareaEstado.CANCELADA, Instant.now(clock));
        tareaRepository.saveAndFlush(tarea);
        registrar(EventoTipo.TAREA_CANCELADA, tarea, "Tarea cancelada conservando su historial");
        return toResponse(tarea);
    }

    @Transactional(readOnly = true)
    public List<TareaResponse> listarPorExpediente(Long expedienteId) {
        Expediente expediente = expedienteService.buscarEntidad(expedienteId);
        acceso.exigirLecturaExpediente(expediente);
        return tareaRepository.findByExpedienteIdOrderByCreadoEnAsc(expedienteId).stream()
                .map(this::toResponse).toList();
    }

    private Tarea prepararEscritura(Long id) {
        Tarea tarea = buscar(id);
        acceso.exigirEscrituraTarea(tarea);
        Expediente expediente = expedienteService.buscarParaActualizar(tarea.getExpediente().getId());
        expedienteService.exigirAbierto(expediente);
        return tarea;
    }

    private Tarea buscar(Long id) {
        return tareaRepository.findById(id).orElseThrow(() -> new NotFoundException(
                "TAREA_NO_ENCONTRADA", "No existe la tarea con identificador " + id));
    }
    private void exigirAsignacionPermitida(Long nuevoResponsableId, Long responsablePermitido) {
        if (!Objects.equals(nuevoResponsableId, responsablePermitido)) acceso.exigirGestor();
    }
    private void exigirActiva(Tarea tarea) {
        if (!ESTADOS_ACTIVOS.contains(tarea.getEstado())) {
            throw new UnprocessableEntityException("TAREA_FINALIZADA", "Una tarea finalizada no se puede modificar");
        }
    }
    private void exigirNoDuplicada(Long expedienteId, String titulo, String tipo, Long excluida) {
        boolean duplicada = excluida == null
                ? tareaRepository.existsByExpedienteIdAndTituloNormalizadoAndTipoAndEstadoIn(
                        expedienteId, titulo, tipo, ESTADOS_ACTIVOS)
                : tareaRepository.existsByExpedienteIdAndTituloNormalizadoAndTipoAndEstadoInAndIdNot(
                        expedienteId, titulo, tipo, ESTADOS_ACTIVOS, excluida);
        if (duplicada) {
            throw new ConflictException("TAREA_DUPLICADA", "Ya existe una tarea activa equivalente en el expediente");
        }
    }
    private void validarTransicion(TareaEstado actual, TareaEstado nueva) {
        boolean permitida = switch (actual) {
            case PENDIENTE -> nueva == TareaEstado.EN_PROGRESO || nueva == TareaEstado.CERRADA
                    || nueva == TareaEstado.CANCELADA;
            case EN_PROGRESO -> nueva == TareaEstado.PENDIENTE || nueva == TareaEstado.CERRADA
                    || nueva == TareaEstado.CANCELADA;
            case CERRADA, CANCELADA -> false;
        };
        if (!permitida) {
            throw new UnprocessableEntityException("TRANSICION_NO_PERMITIDA",
                    "No se permite cambiar una tarea de " + actual + " a " + nueva);
        }
    }
    static void validarFechas(LocalDate desde, LocalDate hasta) {
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "RANGO_FECHAS_INVALIDO", "La fecha desde no puede ser posterior a hasta");
        }
    }
    private void registrar(EventoTipo tipo, Tarea tarea, String detalle) {
        trazabilidadService.registrar(tipo, "TAREA", tarea.getId(), detalle);
    }
    private TareaResponse toResponse(Tarea tarea) {
        return new TareaResponse(tarea.getId(), tarea.getExpediente().getId(), tarea.getTitulo(), tarea.getTipo(),
                tarea.getResponsableId(), tarea.getPrioridad(), tarea.getFechaLimite(), tarea.getEstado(),
                tarea.getCreadoEn(), tarea.getActualizadoEn(), tarea.getVersion());
    }
}

