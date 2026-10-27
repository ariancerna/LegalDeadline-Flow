package pe.edu.utp.legaldeadlineflow.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;

@Entity
@Table(name = "eventos")
public class Evento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private EventoTipo tipo;

    @Column(nullable = false, length = 30)
    private String recurso;

    @Column(nullable = false)
    private Long recursoId;

    @Column(nullable = false, columnDefinition = "text")
    private String detalle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(nullable = false, updatable = false)
    private Instant fecha;

    protected Evento() {
    }

    public Evento(EventoTipo tipo, String recurso, Long recursoId, String detalle) {
        this(tipo, recurso, recursoId, detalle, null, Instant.now());
    }

    public Evento(EventoTipo tipo, String recurso, Long recursoId, String detalle,
                  Usuario usuario, Instant fecha) {
        this.tipo = tipo;
        this.recurso = recurso;
        this.recursoId = recursoId;
        this.detalle = detalle;
        this.usuario = usuario;
        this.fecha = fecha;
    }

    public Long getId() {
        return id;
    }

    public EventoTipo getTipo() {
        return tipo;
    }

    public String getRecurso() {
        return recurso;
    }

    public Long getRecursoId() {
        return recursoId;
    }

    public String getDetalle() {
        return detalle;
    }

    public Instant getFecha() {
        return fecha;
    }

    public Usuario getUsuario() {
        return usuario;
    }
}
