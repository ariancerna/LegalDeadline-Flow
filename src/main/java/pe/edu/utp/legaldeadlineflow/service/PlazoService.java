package pe.edu.utp.legaldeadlineflow.service;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.legaldeadlineflow.api.dto.*;
import pe.edu.utp.legaldeadlineflow.domain.*;
import pe.edu.utp.legaldeadlineflow.exception.*;
import pe.edu.utp.legaldeadlineflow.repository.*;
import pe.edu.utp.legaldeadlineflow.security.AccesoService;

@Service
public class PlazoService {
    private final PlazoRepository plazoRepository;
    private final TareaRepository tareaRepository;
    private final ExpedienteService expedienteService;
    private final TrazabilidadService trazabilidadService;
    private final Clock clock;
    private final AccesoService acceso;

    public PlazoService(PlazoRepository plazoRepository, TareaRepository tareaRepository,
                        ExpedienteService expedienteService, TrazabilidadService trazabilidadService,
                        Clock clock, AccesoService acceso) {
        this.plazoRepository = plazoRepository;
        this.tareaRepository = tareaRepository;
        this.expedienteService = expedienteService;
        this.trazabilidadService = trazabilidadService;
        this.clock = clock;
        this.acceso = acceso;
    }

    @Transactional
    public PlazoResponse crear(PlazoRequest request) {
        Expediente expediente = expedienteService.buscarParaActualizar(request.expedienteId());
        acceso.exigirEscrituraExpediente(expediente);
        expedienteService.exigirAbierto(expediente);
        Plazo plazo = plazoRepository.saveAndFlush(new Plazo(expediente,
                request.tipo(), request.fechaLimite(), Instant.now(clock)));
        registrar(EventoTipo.PLAZO_CREADO, plazo, "Plazo creado en el expediente " + expediente.getCodigo());
        return toResponse(plazo);
    }

    @Transactional(readOnly = true)
    public PlazoResponse obtener(Long id) {
        Plazo plazo = buscar(id);
        acceso.exigirLecturaExpediente(plazo.getExpediente());
        return toResponse(plazo);
    }

    @Transactional(readOnly = true)
    public Page<PlazoResponse> listar(int page, int size, Long expedienteId, PlazoEstado estado,
                                     LocalDate desde, LocalDate hasta) {
        TareaService.validarFechas(desde, hasta);
        Usuario usuario = acceso.usuarioActual();
        Specification<Plazo> spec = (root, query, cb) -> {
            List<Predicate> filtros = new ArrayList<>();
            if (usuario.getRol() == Rol.RESPONSABLE) {
                filtros.add(cb.equal(root.get("expediente").get("responsable").get("id"), usuario.getId()));
            }
            if (expedienteId != null) filtros.add(cb.equal(root.get("expediente").get("id"), expedienteId));
            if (estado != null) filtros.add(cb.equal(root.get("estado"), estado));
            if (desde != null) filtros.add(cb.greaterThanOrEqualTo(root.get("fechaLimite"), desde));
            if (hasta != null) filtros.add(cb.lessThanOrEqualTo(root.get("fechaLimite"), hasta));
            return cb.and(filtros.toArray(Predicate[]::new));
        };
        return plazoRepository.findAll(spec, ExpedienteService.pagina(page, size)).map(this::toResponse);
    }

    @Transactional
    public PlazoResponse actualizar(Long id, PlazoActualizarRequest request) {
        Plazo plazo = prepararEscritura(id);
        exigirActivo(plazo);
        ExpedienteService.exigirVersion(plazo.getVersion(), request.version());
        plazo.actualizar(request.tipo(), request.fechaLimite(), Instant.now(clock));
        plazoRepository.saveAndFlush(plazo);
        registrar(EventoTipo.PLAZO_ACTUALIZADO, plazo, "Tipo y fecha límite del plazo actualizados");
        return toResponse(plazo);
    }

    @Transactional
    public PlazoResponse anular(Long id, AnulacionPlazoRequest request) {
        Plazo plazo = prepararEscritura(id);
        exigirActivo(plazo);
        ExpedienteService.exigirVersion(plazo.getVersion(), request.version());
        plazo.anular(request.motivo(), Instant.now(clock));
        plazoRepository.saveAndFlush(plazo);
        registrar(EventoTipo.PLAZO_ANULADO, plazo, "Plazo anulado: " + plazo.getMotivoAnulacion());
        return toResponse(plazo);
    }

    @Transactional(readOnly = true)
    public RiesgoPlazoResponse calcularRiesgo(Long id) {
        Plazo plazo = buscar(id);
        acceso.exigirLecturaExpediente(plazo.getExpediente());
        long diasRestantes = ChronoUnit.DAYS.between(LocalDate.now(clock), plazo.getFechaLimite());
        long tareasPendientes = tareaRepository.countByExpedienteIdAndEstadoIn(
                plazo.getExpediente().getId(), TareaService.ESTADOS_ACTIVOS);
        return new RiesgoPlazoResponse(plazo.getId(), plazo.getEstado(),
                clasificar(plazo.getEstado(), diasRestantes, tareasPendientes), diasRestantes, tareasPendientes);
    }

    NivelRiesgo clasificar(PlazoEstado estado, long diasRestantes, long tareasPendientes) {
        if (estado == PlazoEstado.ANULADO) return NivelRiesgo.BAJO;
        if (diasRestantes < 0 || (diasRestantes <= 2 && tareasPendientes > 0)) return NivelRiesgo.CRITICO;
        if (diasRestantes <= 5) return NivelRiesgo.ALTO;
        if (diasRestantes <= 10) return NivelRiesgo.MEDIO;
        return NivelRiesgo.BAJO;
    }

    private Plazo prepararEscritura(Long id) {
        Plazo plazo = buscar(id);
        acceso.exigirEscrituraExpediente(plazo.getExpediente());
        Expediente expediente = expedienteService.buscarParaActualizar(plazo.getExpediente().getId());
        expedienteService.exigirAbierto(expediente);
        return plazo;
    }
    private Plazo buscar(Long id) {
        return plazoRepository.findById(id).orElseThrow(() -> new NotFoundException(
                "PLAZO_NO_ENCONTRADO", "No existe el plazo con identificador " + id));
    }
    private void exigirActivo(Plazo plazo) {
        if (plazo.getEstado() == PlazoEstado.ANULADO) {
            throw new UnprocessableEntityException("PLAZO_YA_ANULADO", "El plazo ya se encuentra anulado");
        }
    }
    private void registrar(EventoTipo tipo, Plazo plazo, String detalle) {
        trazabilidadService.registrar(tipo, "PLAZO", plazo.getId(), detalle);
    }
    private PlazoResponse toResponse(Plazo plazo) {
        return new PlazoResponse(plazo.getId(), plazo.getExpediente().getId(), plazo.getTipo(), plazo.getFechaLimite(),
                plazo.getEstado(), plazo.getMotivoAnulacion(), plazo.getCreadoEn(), plazo.getAnuladoEn(),
                plazo.getActualizadoEn(), plazo.getVersion());
    }
}

