package pe.edu.utp.legaldeadlineflow.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pe.edu.utp.legaldeadlineflow.api.dto.CargaTrabajoResponse;
import pe.edu.utp.legaldeadlineflow.repository.TareaRepository;
import pe.edu.utp.legaldeadlineflow.repository.UsuarioRepository;
import pe.edu.utp.legaldeadlineflow.domain.Rol;
import pe.edu.utp.legaldeadlineflow.domain.Usuario;
import pe.edu.utp.legaldeadlineflow.security.AccesoService;

@Service
public class CargaTrabajoService {

    private final TareaRepository tareaRepository;
    private final int umbral;
    private final UsuarioRepository usuarioRepository;
    private final AccesoService accesoService;

    public CargaTrabajoService(TareaRepository tareaRepository,
                               UsuarioRepository usuarioRepository,
                               AccesoService accesoService,
                               @Value("${legaldeadline.carga.umbral:5}") int umbral) {
        this.tareaRepository = tareaRepository;
        this.usuarioRepository = usuarioRepository;
        this.accesoService = accesoService;
        this.umbral = umbral;
    }

    @Transactional(readOnly = true)
    public List<CargaTrabajoResponse> consultar() {
        Usuario actual = accesoService.usuarioActual();
        Map<Long, Long> cargas = tareaRepository.contarCargaActivaPorResponsable(TareaService.ESTADOS_ACTIVOS).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        return usuarioRepository.findAll().stream()
                .filter(Usuario::isActivo)
                .filter(u -> u.getRol() == Rol.RESPONSABLE || u.getRol() == Rol.SUPERVISOR)
                .filter(u -> actual.getRol() != Rol.RESPONSABLE || actual.getId().equals(u.getId()))
                .map(u -> new CargaTrabajoResponse(u.getId(), u.getNombre(), u.getRol(), cargas.getOrDefault(u.getId(), 0L), umbral,
                        cargas.getOrDefault(u.getId(), 0L) > umbral))
                .toList();
    }
}
