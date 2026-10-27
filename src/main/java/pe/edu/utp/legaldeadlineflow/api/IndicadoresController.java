package pe.edu.utp.legaldeadlineflow.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.legaldeadlineflow.api.dto.IndicadoresResponse;
import pe.edu.utp.legaldeadlineflow.service.IndicadoresService;

@RestController
@RequestMapping("/api/v1/indicadores")
public class IndicadoresController {
    private final IndicadoresService service;
    public IndicadoresController(IndicadoresService service) { this.service = service; }
    @GetMapping
    public IndicadoresResponse consultar() { return service.consultar(); }
}
