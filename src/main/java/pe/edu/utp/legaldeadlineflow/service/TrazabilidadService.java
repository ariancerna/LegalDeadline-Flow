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
        Specification<Evento> filtros = (root, query, cb) -> cb.conjunction();
        if (tipo != null) filtros = filtros.and((root, query, cb) -> cb.equal(root.get("tipo"), tipo));
        if (usuarioId != null) filtros = filtros.and((root, query, cb) -> cb.equal(root.get("usuario").get("id"), usuarioId));
        if (desde != null) filtros = filtros.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("fecha"), desde));
        if (hasta != null) filtros = filtros.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("fecha"), hasta));
        return eventoRepository.findAll(filtros, pageable).map(this::toResponse);
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
