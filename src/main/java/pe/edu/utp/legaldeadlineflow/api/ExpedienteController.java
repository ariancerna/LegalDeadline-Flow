package pe.edu.utp.legaldeadlineflow.api;

import java.net.URI;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.legaldeadlineflow.api.dto.*;
import pe.edu.utp.legaldeadlineflow.domain.ExpedienteEstado;
import pe.edu.utp.legaldeadlineflow.service.ExpedienteService;

@Validated
@RestController
@RequestMapping("/api/v1/expedientes")
public class ExpedienteController {
    private final ExpedienteService expedienteService;
    public ExpedienteController(ExpedienteService expedienteService) { this.expedienteService = expedienteService; }

    @PostMapping
    public ResponseEntity<ExpedienteResponse> crear(@Valid @RequestBody ExpedienteRequest request) {
        ExpedienteResponse response = expedienteService.crear(request);
        return ResponseEntity.created(URI.create("/api/v1/expedientes/" + response.id())).body(response);
    }
    @GetMapping
    public Page<ExpedienteResponse> listar(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) ExpedienteEstado estado,
            @RequestParam(required = false) @Positive Long responsableId,
            @RequestParam(required = false) @Size(max = 255) String q) {
        return expedienteService.listar(page, size, estado, responsableId, q);
    }
    @GetMapping("/{id}")
    public ExpedienteResponse obtener(@PathVariable @Positive Long id) {
        return expedienteService.obtener(id);
    }
    @PutMapping("/{id}")
    public ExpedienteResponse actualizar(@PathVariable @Positive Long id,
                                         @Valid @RequestBody ExpedienteActualizarRequest request) {
        return expedienteService.actualizar(id, request);
    }
    @PatchMapping("/{id}/cierre")
    public ExpedienteResponse cerrar(@PathVariable @Positive Long id,
                                     @Valid @RequestBody VersionRequest request) {
        return expedienteService.cerrar(id, request);
    }
    @DeleteMapping("/{id}")
    public ExpedienteResponse archivar(@PathVariable @Positive Long id,
                                       @Valid @RequestBody VersionRequest request) {
        return expedienteService.archivar(id, request);
    }
}

