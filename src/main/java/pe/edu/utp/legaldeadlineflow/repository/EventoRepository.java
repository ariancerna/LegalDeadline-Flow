package pe.edu.utp.legaldeadlineflow.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import pe.edu.utp.legaldeadlineflow.domain.Evento;

public interface EventoRepository extends JpaRepository<Evento, Long>, JpaSpecificationExecutor<Evento> {

    List<Evento> findAllByOrderByFechaAsc();
}
