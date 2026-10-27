package pe.edu.utp.legaldeadlineflow.api;

import java.util.List;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.RequestParam;
import pe.edu.utp.legaldeadlineflow.domain.EventoTipo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import pe.edu.utp.legaldeadlineflow.api.dto.EventoResponse;
import pe.edu.utp.legaldeadlineflow.service.TrazabilidadService;

@RestController
@RequestMapping("/api/v1/auditoria/eventos")
public class TrazabilidadController {

    private final TrazabilidadService trazabilidadService;

    public TrazabilidadController(TrazabilidadService trazabilidadService) {
        this.trazabilidadService = trazabilidadService;
    }

    @GetMapping
    public Page<EventoResponse> listar(
            @RequestParam(required = false) EventoTipo tipo,
            @RequestParam(required = false) Long usuarioId,
            @RequestParam(required = false) Instant desde,
            @RequestParam(required = false) Instant hasta,
            @PageableDefault(size = 20, sort = "fecha", direction = Sort.Direction.DESC) Pageable pageable) {
        return trazabilidadService.consultar(tipo, usuarioId, desde, hasta, pageable);
    }
}
