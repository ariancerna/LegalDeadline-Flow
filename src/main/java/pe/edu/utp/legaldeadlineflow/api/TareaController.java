package pe.edu.utp.legaldeadlineflow.api;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.legaldeadlineflow.api.dto.*;
import pe.edu.utp.legaldeadlineflow.domain.*;
import pe.edu.utp.legaldeadlineflow.service.TareaService;

@Validated
@RestController
@RequestMapping("/api/v1")
public class TareaController {
    private final TareaService tareaService;
    public TareaController(TareaService tareaService) { this.tareaService = tareaService; }

    @PostMapping("/tareas")
    public ResponseEntity<TareaResponse> crear(@Valid @RequestBody TareaRequest request) {
        TareaResponse response = tareaService.crear(request);
        return ResponseEntity.created(URI.create("/api/v1/tareas/" + response.id())).body(response);
    }
    @GetMapping("/tareas")
    public Page<TareaResponse> listar(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) @Positive Long expedienteId,
            @RequestParam(required = false) @Positive Long responsableId,
            @RequestParam(required = false) TareaEstado estado,
            @RequestParam(required = false) Prioridad prioridad,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "false") boolean activas) {
        return tareaService.listar(page, size, expedienteId, responsableId, estado, prioridad, desde, hasta, activas);
    }
    @GetMapping("/tareas/{id}")
    public TareaResponse obtener(@PathVariable @Positive Long id) { return tareaService.obtener(id); }
    @PutMapping("/tareas/{id}")
    public TareaResponse actualizar(@PathVariable @Positive Long id,
                                    @Valid @RequestBody TareaActualizarRequest request) {
        return tareaService.actualizar(id, request);
    }
    @PatchMapping("/tareas/{id}/estado")
    public TareaResponse cambiarEstado(@PathVariable @Positive Long id,
                                      @Valid @RequestBody CambioEstadoTareaRequest request) {
        return tareaService.cambiarEstado(id, request);
    }
    @DeleteMapping("/tareas/{id}")
    public TareaResponse cancelar(@PathVariable @Positive Long id,
                                 @Valid @RequestBody VersionRequest request) {
        return tareaService.cancelar(id, request);
    }
    @GetMapping("/expedientes/{id}/tareas")
    public List<TareaResponse> listarPorExpediente(@PathVariable @Positive Long id) {
        return tareaService.listarPorExpediente(id);
    }
}

