package pe.edu.utp.legaldeadlineflow.api;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import pe.edu.utp.legaldeadlineflow.api.dto.CargaTrabajoResponse;
import pe.edu.utp.legaldeadlineflow.service.CargaTrabajoService;

@RestController
@RequestMapping("/api/v1/responsables/carga")
public class CargaTrabajoController {

    private final CargaTrabajoService cargaTrabajoService;

    public CargaTrabajoController(CargaTrabajoService cargaTrabajoService) {
        this.cargaTrabajoService = cargaTrabajoService;
    }

    @GetMapping
    public List<CargaTrabajoResponse> consultar() {
        return cargaTrabajoService.consultar();
    }
}
