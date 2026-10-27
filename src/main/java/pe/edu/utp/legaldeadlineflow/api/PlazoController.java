package pe.edu.utp.legaldeadlineflow.api;

import java.net.URI;
import java.time.LocalDate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.legaldeadlineflow.api.dto.*;
import pe.edu.utp.legaldeadlineflow.domain.PlazoEstado;
import pe.edu.utp.legaldeadlineflow.service.PlazoService;

@Validated
@RestController
@RequestMapping("/api/v1/plazos")
public class PlazoController {
    private final PlazoService plazoService;
    public PlazoController(PlazoService plazoService) { this.plazoService = plazoService; }

    @PostMapping
    public ResponseEntity<PlazoResponse> crear(@Valid @RequestBody PlazoRequest request) {
        PlazoResponse response = plazoService.crear(request);
        return ResponseEntity.created(URI.create("/api/v1/plazos/" + response.id())).body(response);
    }
    @GetMapping
    public Page<PlazoResponse> listar(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) @Positive Long expedienteId,
            @RequestParam(required = false) PlazoEstado estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return plazoService.listar(page, size, expedienteId, estado, desde, hasta);
    }
    @GetMapping("/{id}")
    public PlazoResponse obtener(@PathVariable @Positive Long id) { return plazoService.obtener(id); }
    @PutMapping("/{id}")
    public PlazoResponse actualizar(@PathVariable @Positive Long id,
                                    @Valid @RequestBody PlazoActualizarRequest request) {
        return plazoService.actualizar(id, request);
    }
    @PatchMapping("/{id}/anulacion")
    public PlazoResponse anular(@PathVariable @Positive Long id,
                                @Valid @RequestBody AnulacionPlazoRequest request) {
        return plazoService.anular(id, request);
    }
    @DeleteMapping("/{id}")
    public PlazoResponse eliminar(@PathVariable @Positive Long id,
                                  @Valid @RequestBody AnulacionPlazoRequest request) {
        return plazoService.anular(id, request);
    }
    @GetMapping("/{id}/riesgo")
    public RiesgoPlazoResponse calcularRiesgo(@PathVariable @Positive Long id) {
        return plazoService.calcularRiesgo(id);
    }
}

