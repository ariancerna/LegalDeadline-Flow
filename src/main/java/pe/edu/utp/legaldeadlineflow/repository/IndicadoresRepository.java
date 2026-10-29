package pe.edu.utp.legaldeadlineflow.repository;

import java.time.LocalDate;
import java.util.List;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;
import pe.edu.utp.legaldeadlineflow.domain.Plazo;
import pe.edu.utp.legaldeadlineflow.domain.TareaEstado;

@Repository
public class IndicadoresRepository {
    private final EntityManager entityManager;

    public IndicadoresRepository(EntityManager entityManager) { this.entityManager = entityManager; }

    public List<Object[]> expedientesPorEstado(boolean global, Long usuarioId) {
        return entityManager.createQuery("""
                select e.estado, count(e) from Expediente e
                where (:global = true or e.responsable.id = :usuarioId) group by e.estado
                """, Object[].class).setParameter("global", global).setParameter("usuarioId", usuarioId).getResultList();
    }

    public List<Object[]> tareasPorEstado(boolean global, Long usuarioId) {
        return entityManager.createQuery("""
                select t.estado, count(t) from Tarea t
                where (:global = true or t.responsable.id = :usuarioId or t.expediente.responsable.id = :usuarioId)
                group by t.estado
                """, Object[].class).setParameter("global", global).setParameter("usuarioId", usuarioId).getResultList();
    }

    public long tareasVencidas(boolean global, Long usuarioId, LocalDate hoy) {
        return entityManager.createQuery("""
                select count(t) from Tarea t
                where (:global = true or t.responsable.id = :usuarioId or t.expediente.responsable.id = :usuarioId)
                and t.estado in :estados and t.fechaLimite < :hoy
                """, Long.class).setParameter("global", global).setParameter("usuarioId", usuarioId)
                .setParameter("estados", List.of(TareaEstado.PENDIENTE, TareaEstado.EN_PROGRESO))
                .setParameter("hoy", hoy).getSingleResult();
    }

    public List<Plazo> plazos(boolean global, Long usuarioId) {
        return entityManager.createQuery("""
                select p from Plazo p join fetch p.expediente e
                where (:global = true or e.responsable.id = :usuarioId)
                """, Plazo.class).setParameter("global", global).setParameter("usuarioId", usuarioId).getResultList();
    }

    /** Fechas de ingreso y de conclusión de los expedientes con movimiento desde {@code desde}. */
    public List<Object[]> movimientoExpedientes(boolean global, Long usuarioId, java.time.Instant desde) {
        return entityManager.createQuery("""
                select e.creadoEn, e.estado, e.actualizadoEn from Expediente e
                where (:global = true or e.responsable.id = :usuarioId)
                and (e.creadoEn >= :desde or (e.estado <> :abierto and e.actualizadoEn >= :desde))
                """, Object[].class).setParameter("global", global).setParameter("usuarioId", usuarioId)
                .setParameter("desde", desde)
                .setParameter("abierto", pe.edu.utp.legaldeadlineflow.domain.ExpedienteEstado.ABIERTO)
                .getResultList();
    }

    public List<Object[]> tareasActivasPorExpediente(boolean global, Long usuarioId) {
        return entityManager.createQuery("""
                select t.expediente.id, count(t) from Tarea t
                where (:global = true or t.expediente.responsable.id = :usuarioId)
                and t.estado in :estados group by t.expediente.id
                """, Object[].class).setParameter("global", global).setParameter("usuarioId", usuarioId)
                .setParameter("estados", List.of(TareaEstado.PENDIENTE, TareaEstado.EN_PROGRESO)).getResultList();
    }
}
