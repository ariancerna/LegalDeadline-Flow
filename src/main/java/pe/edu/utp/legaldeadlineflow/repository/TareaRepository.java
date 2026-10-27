package pe.edu.utp.legaldeadlineflow.repository;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import pe.edu.utp.legaldeadlineflow.domain.Tarea;
import pe.edu.utp.legaldeadlineflow.domain.TareaEstado;

public interface TareaRepository extends JpaRepository<Tarea, Long>, JpaSpecificationExecutor<Tarea> {
    boolean existsByExpedienteIdAndTituloNormalizadoAndTipoAndEstadoIn(
            Long expedienteId, String tituloNormalizado, String tipo, Collection<TareaEstado> estados);
    boolean existsByExpedienteIdAndTituloNormalizadoAndTipoAndEstadoInAndIdNot(
            Long expedienteId, String tituloNormalizado, String tipo, Collection<TareaEstado> estados, Long id);
    List<Tarea> findByExpedienteIdOrderByCreadoEnAsc(Long expedienteId);
    long countByExpedienteIdAndEstadoIn(Long expedienteId, Collection<TareaEstado> estados);

    @Query("""
            select t.responsable.id, count(t)
            from Tarea t
            where t.estado in :estados
            group by t.responsable.id
            order by t.responsable.id
            """)
    List<Object[]> contarCargaActivaPorResponsable(@Param("estados") Collection<TareaEstado> estados);
}

