package pe.edu.utp.legaldeadlineflow.repository;

import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import pe.edu.utp.legaldeadlineflow.domain.Expediente;

public interface ExpedienteRepository extends JpaRepository<Expediente, Long>,
                                              JpaSpecificationExecutor<Expediente> {
    boolean existsByCodigo(String codigo);
    boolean existsByCodigoAndIdNot(String codigo, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Expediente e where e.id = :id")
    Optional<Expediente> findByIdForUpdate(@Param("id") Long id);
}

