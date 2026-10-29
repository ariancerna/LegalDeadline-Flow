package pe.edu.utp.legaldeadlineflow.service;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.legaldeadlineflow.api.dto.*;
import pe.edu.utp.legaldeadlineflow.domain.*;
import pe.edu.utp.legaldeadlineflow.exception.*;
import pe.edu.utp.legaldeadlineflow.repository.*;
import pe.edu.utp.legaldeadlineflow.security.AccesoService;

@Service
public class ExpedienteService {
    private final ExpedienteRepository expedienteRepository;
    private final TrazabilidadService trazabilidadService;
    private final TareaRepository tareaRepository;
    private final PlazoRepository plazoRepository;
    private final AccesoService acceso;
    private final Clock clock;

    public ExpedienteService(ExpedienteRepository expedienteRepository, TrazabilidadService trazabilidadService,
                             TareaRepository tareaRepository, PlazoRepository plazoRepository,
                             AccesoService acceso, Clock clock) {
        this.expedienteRepository = expedienteRepository;
        this.trazabilidadService = trazabilidadService;
        this.tareaRepository = tareaRepository;
        this.plazoRepository = plazoRepository;
        this.acceso = acceso;
        this.clock = clock;
    }

    @Transactional
    public ExpedienteResponse crear(ExpedienteRequest request) {
        acceso.exigirGestor();
        if (expedienteRepository.existsByCodigo(request.codigo())) {
            throw new ConflictException("EXPEDIENTE_DUPLICADO", "Ya existe un expediente con el código indicado");
        }
        Usuario responsable = acceso.validarResponsable(request.responsableId());
        Expediente expediente = expedienteRepository.saveAndFlush(
                new Expediente(request.codigo(), request.asunto(), responsable, Instant.now(clock)));
        registrar(EventoTipo.EXPEDIENTE_CREADO, expediente, "Expediente " + expediente.getCodigo() + " creado");
        return toResponse(expediente);
    }

    @Transactional(readOnly = true)
    public Page<ExpedienteResponse> listar(int page, int size, ExpedienteEstado estado, Long responsableId, String q) {
        Usuario usuario = acceso.usuarioActual();
        Specification<Expediente> spec = (root, query, cb) -> {
            List<Predicate> filtros = new ArrayList<>();
            if (usuario.getRol() == Rol.RESPONSABLE) {
                filtros.add(cb.equal(root.get("responsable").get("id"), usuario.getId()));
            }
            if (estado != null) filtros.add(cb.equal(root.get("estado"), estado));
            if (responsableId != null) filtros.add(cb.equal(root.get("responsable").get("id"), responsableId));
            if (q != null && !q.isBlank()) {
                String texto = "%" + escaparBusqueda(q.trim().toLowerCase(java.util.Locale.ROOT)) + "%";
                filtros.add(cb.or(cb.like(cb.lower(root.get("codigo")), texto, '\\'),
                                 cb.like(cb.lower(root.get("asunto")), texto, '\\')));
            }
            return cb.and(filtros.toArray(Predicate[]::new));
        };
        Page<Expediente> pagina = expedienteRepository.findAll(spec, pagina(page, size));
        return pagina.map(conSituacion(pagina.getContent()));
    }

    @Transactional(readOnly = true)
    public List<ExpedienteResponse> listar() { return listar(0, 100, null, null, null).getContent(); }

    @Transactional(readOnly = true)
    public ExpedienteResponse obtener(Long id) {
        Expediente expediente = buscarEntidad(id);
        acceso.exigirLecturaExpediente(expediente);
        return toResponse(expediente);
    }

    @Transactional
    public ExpedienteResponse actualizar(Long id, ExpedienteActualizarRequest request) {
        acceso.exigirGestor();
        Expediente expediente = buscarParaActualizar(id);
        exigirAbierto(expediente);
        exigirVersion(expediente.getVersion(), request.version());
        if (expedienteRepository.existsByCodigoAndIdNot(request.codigo(), id)) {
            throw new ConflictException("EXPEDIENTE_DUPLICADO", "Ya existe un expediente con el código indicado");
        }
        expediente.actualizar(request.codigo(), request.asunto(),
                acceso.validarResponsable(request.responsableId()), Instant.now(clock));
        expedienteRepository.saveAndFlush(expediente);
        registrar(EventoTipo.EXPEDIENTE_ACTUALIZADO, expediente, "Datos y asignación del expediente actualizados");
        return toResponse(expediente);
    }

    @Transactional
    public ExpedienteResponse cerrar(Long id, VersionRequest request) {
        acceso.exigirGestor();
        Expediente expediente = buscarParaActualizar(id);
        exigirAbierto(expediente);
        exigirVersion(expediente.getVersion(), request.version());
        exigirSinPendientes(expediente);
        expediente.cambiarEstado(ExpedienteEstado.CERRADO, Instant.now(clock));
        expedienteRepository.saveAndFlush(expediente);
        registrar(EventoTipo.EXPEDIENTE_CERRADO, expediente, "Expediente cerrado sin tareas ni plazos activos");
        return toResponse(expediente);
    }

    @Transactional
    public ExpedienteResponse archivar(Long id, VersionRequest request) {
        acceso.exigirGestor();
        Expediente expediente = buscarParaActualizar(id);
        exigirVersion(expediente.getVersion(), request.version());
        if (expediente.getEstado() == ExpedienteEstado.ARCHIVADO) {
            throw new UnprocessableEntityException("EXPEDIENTE_YA_ARCHIVADO", "El expediente ya está archivado");
        }
        exigirSinPendientes(expediente);
        expediente.cambiarEstado(ExpedienteEstado.ARCHIVADO, Instant.now(clock));
        expedienteRepository.saveAndFlush(expediente);
        registrar(EventoTipo.EXPEDIENTE_ARCHIVADO, expediente, "Expediente archivado conservando su historial");
        return toResponse(expediente);
    }

    @Transactional(readOnly = true)
    public Expediente buscarEntidad(Long id) {
        return expedienteRepository.findById(id).orElseThrow(() -> noEncontrado(id));
    }

    @Transactional
    public Expediente buscarParaActualizar(Long id) {
        return expedienteRepository.findByIdForUpdate(id).orElseThrow(() -> noEncontrado(id));
    }

    public void exigirAbierto(Expediente expediente) {
        if (expediente.getEstado() != ExpedienteEstado.ABIERTO) {
            throw new UnprocessableEntityException("EXPEDIENTE_FINALIZADO", "El expediente debe estar abierto para modificarse");
        }
    }

    static void exigirVersion(Long actual, Long recibida) {
        if (recibida == null || !Objects.equals(actual, recibida)) {
            throw new ConflictException("VERSION_DESACTUALIZADA",
                    "El registro cambió; consulta su versión actual antes de volver a modificarlo");
        }
    }

    static Pageable pagina(int page, int size) {
        return pagina(page, size, Sort.by(Sort.Direction.DESC, "id"));
    }

    static Pageable pagina(int page, int size, Sort orden) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "PAGINACION_INVALIDA",
                    "page debe ser mayor o igual a 0 y size debe estar entre 1 y 100");
        }
        return PageRequest.of(page, size, orden);
    }

    private static String escaparBusqueda(String texto) {
        return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private void exigirSinPendientes(Expediente expediente) {
        if (tareaRepository.countByExpedienteIdAndEstadoIn(expediente.getId(), TareaService.ESTADOS_ACTIVOS) > 0
                || plazoRepository.countByExpedienteIdAndEstado(expediente.getId(), PlazoEstado.ACTIVO) > 0) {
            throw new UnprocessableEntityException("EXPEDIENTE_CON_PENDIENTES",
                    "Debes cerrar o cancelar las tareas y anular los plazos activos antes de finalizar el expediente");
        }
    }

    private NotFoundException noEncontrado(Long id) {
        return new NotFoundException("EXPEDIENTE_NO_ENCONTRADO", "No existe el expediente con identificador " + id);
    }
    private void registrar(EventoTipo tipo, Expediente expediente, String detalle) {
        trazabilidadService.registrar(tipo, "EXPEDIENTE", expediente.getId(), detalle);
    }
    private ExpedienteResponse toResponse(Expediente expediente) {
        return conSituacion(List.of(expediente)).apply(expediente);
    }

    /**
     * Prepara la situación de un grupo de expedientes con dos consultas (tareas activas agrupadas y
     * plazos activos ordenados), en lugar de dos consultas por expediente.
     */
    private java.util.function.Function<Expediente, ExpedienteResponse> conSituacion(List<Expediente> expedientes) {
        List<Long> ids = expedientes.stream().map(Expediente::getId).toList();
        java.util.Map<Long, Long> tareas = new java.util.HashMap<>();
        java.util.Map<Long, Plazo> proximos = new java.util.HashMap<>();
        if (!ids.isEmpty()) {
            tareaRepository.contarActivasPorExpediente(ids, TareaService.ESTADOS_ACTIVOS)
                    .forEach(r -> tareas.put((Long) r[0], ((Number) r[1]).longValue()));
            for (Plazo p : plazoRepository.findByExpedientesAndEstadoOrdenados(ids, PlazoEstado.ACTIVO)) {
                proximos.putIfAbsent(p.getExpediente().getId(), p);
            }
        }
        java.time.LocalDate hoy = java.time.LocalDate.now(clock);
        return e -> {
            long activas = tareas.getOrDefault(e.getId(), 0L);
            Plazo p = proximos.get(e.getId());
            ExpedienteResponse.ProximoPlazo proximo = null;
            if (p != null) {
                long dias = java.time.temporal.ChronoUnit.DAYS.between(hoy, p.getFechaLimite());
                proximo = new ExpedienteResponse.ProximoPlazo(p.getId(), p.getTipo(), p.getFechaLimite(), dias,
                        PlazoService.clasificar(p.getEstado(), dias, activas));
            }
            return new ExpedienteResponse(e.getId(), e.getCodigo(), e.getAsunto(), e.getResponsableId(),
                    e.getEstado(), e.getCreadoEn(), e.getActualizadoEn(), e.getVersion(), activas, proximo);
        };
    }
}

