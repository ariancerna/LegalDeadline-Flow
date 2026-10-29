package pe.edu.utp.legaldeadlineflow.repository;

import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import pe.edu.utp.legaldeadlineflow.domain.Plazo;
import pe.edu.utp.legaldeadlineflow.domain.PlazoEstado;

public interface PlazoRepository extends JpaRepository<Plazo, Long>, JpaSpecificationExecutor<Plazo> {
    long countByExpedienteIdAndEstado(Long expedienteId, PlazoEstado estado);

    @Query("""
            select p from Plazo p
            where p.expediente.id in :expedientes and p.estado = :estado
            order by p.fechaLimite asc, p.id asc
            """)
    List<Plazo> findByExpedientesAndEstadoOrdenados(@Param("expedientes") Collection<Long> expedientes,
                                                     @Param("estado") PlazoEstado estado);

    /** Los listados muestran el código del expediente: se carga en la misma consulta. */
    @Override
    @EntityGraph(attributePaths = "expediente")
    Page<Plazo> findAll(Specification<Plazo> spec, Pageable pageable);
}
