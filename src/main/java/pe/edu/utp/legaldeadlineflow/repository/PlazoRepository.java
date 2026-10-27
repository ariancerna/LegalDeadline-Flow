package pe.edu.utp.legaldeadlineflow.repository;

import org.springframework.data.jpa.repository.*;
import pe.edu.utp.legaldeadlineflow.domain.Plazo;
import pe.edu.utp.legaldeadlineflow.domain.PlazoEstado;

public interface PlazoRepository extends JpaRepository<Plazo, Long>, JpaSpecificationExecutor<Plazo> {
    long countByExpedienteIdAndEstado(Long expedienteId, PlazoEstado estado);
}

