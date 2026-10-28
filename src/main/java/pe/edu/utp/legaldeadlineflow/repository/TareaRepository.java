package pe.edu.utp.legaldeadlineflow.repository;

import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
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
            select t.expediente.id, count(t) from Tarea t
            where t.expediente.id in :expedientes and t.estado in :estados
            group by t.expediente.id
            """)
    List<Object[]> contarActivasPorExpediente(@Param("expedientes") Collection<Long> expedientes,
                                              @Param("estados") Collection<TareaEstado> estados);

    /** Los listados muestran el código del expediente: se carga en la misma consulta. */
    @Override
    @EntityGraph(attributePaths = "expediente")
    Page<Tarea> findAll(Specification<Tarea> spec, Pageable pageable);

    @Query("""
            select t.responsable.id, count(t)
            from Tarea t
            where t.estado in :estados
            group by t.responsable.id
            order by t.responsable.id
            """)
    List<Object[]> contarCargaActivaPorResponsable(@Param("estados") Collection<TareaEstado> estados);
}

