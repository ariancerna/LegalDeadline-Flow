package pe.edu.utp.legaldeadlineflow.service;

import java.util.List;
import java.time.Clock;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pe.edu.utp.legaldeadlineflow.api.dto.EventoResponse;
import pe.edu.utp.legaldeadlineflow.domain.Evento;
import pe.edu.utp.legaldeadlineflow.domain.EventoTipo;
import pe.edu.utp.legaldeadlineflow.domain.Plazo;
import pe.edu.utp.legaldeadlineflow.domain.Tarea;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import pe.edu.utp.legaldeadlineflow.repository.EventoRepository;
import pe.edu.utp.legaldeadlineflow.security.AccesoService;

@Service
public class TrazabilidadService {

    private final EventoRepository eventoRepository;
    private final AccesoService accesoService;
    private final Clock clock;

    public TrazabilidadService(EventoRepository eventoRepository, AccesoService accesoService, Clock clock) {
        this.eventoRepository = eventoRepository;
        this.accesoService = accesoService;
        this.clock = clock;
    }

    @Transactional
    public void registrar(EventoTipo tipo, String recurso, Long recursoId, String detalle) {
        eventoRepository.save(new Evento(tipo, recurso, recursoId, detalle, accesoService.usuarioActual(), clock.instant()));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SUPERVISOR','AUDITOR')")
    public List<EventoResponse> listar() {
        return eventoRepository.findAllByOrderByFechaAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SUPERVISOR','AUDITOR')")
    public Page<EventoResponse> consultar(EventoTipo tipo, Long usuarioId, Instant desde,
                                          Instant hasta, Pageable pageable) {
        return consultar(tipo, usuarioId, desde, hasta, null, pageable);
    }

    /**
     * Con {@code expedienteId}, devuelve el historial del expediente: sus propios eventos y los de sus
     * tareas y plazos.
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SUPERVISOR','AUDITOR')")
    public Page<EventoResponse> consultar(EventoTipo tipo, Long usuarioId, Instant desde,
                                          Instant hasta, Long expedienteId, Pageable pageable) {
        Specification<Evento> filtros = (root, query, cb) -> cb.conjunction();
        if (tipo != null) filtros = filtros.and((root, query, cb) -> cb.equal(root.get("tipo"), tipo));
        if (usuarioId != null) filtros = filtros.and((root, query, cb) -> cb.equal(root.get("usuario").get("id"), usuarioId));
        if (desde != null) filtros = filtros.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("fecha"), desde));
        if (hasta != null) filtros = filtros.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("fecha"), hasta));
        if (expedienteId != null) filtros = filtros.and(delExpediente(expedienteId));
        return eventoRepository.findAll(filtros, pageable).map(this::toResponse);
    }

    private static Specification<Evento> delExpediente(Long expedienteId) {
        return (root, query, cb) -> {
            Subquery<Long> tareas = query.subquery(Long.class);
            Root<Tarea> tarea = tareas.from(Tarea.class);
            tareas.select(tarea.get("id")).where(cb.equal(tarea.get("expediente").get("id"), expedienteId));
            Subquery<Long> plazos = query.subquery(Long.class);
            Root<Plazo> plazo = plazos.from(Plazo.class);
            plazos.select(plazo.get("id")).where(cb.equal(plazo.get("expediente").get("id"), expedienteId));
            return cb.or(
                    cb.and(cb.equal(root.get("recurso"), "EXPEDIENTE"), cb.equal(root.get("recursoId"), expedienteId)),
                    cb.and(cb.equal(root.get("recurso"), "TAREA"), root.get("recursoId").in(tareas)),
                    cb.and(cb.equal(root.get("recurso"), "PLAZO"), root.get("recursoId").in(plazos)));
        };
    }

    private EventoResponse toResponse(Evento evento) {
        return new EventoResponse(
                evento.getId(),
                evento.getTipo(),
                evento.getRecurso(),
                evento.getRecursoId(),
                evento.getDetalle(),
                evento.getFecha(),
                evento.getUsuario() == null ? null : evento.getUsuario().getId(),
                evento.getUsuario() == null ? null : evento.getUsuario().getEmail());
    }
}
