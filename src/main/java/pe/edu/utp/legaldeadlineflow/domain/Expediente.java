package pe.edu.utp.legaldeadlineflow.domain;

import java.time.Instant;
import jakarta.persistence.*;

@Entity
@Table(name = "expedientes")
public class Expediente {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 20)
    private String codigo;
    @Column(nullable = false, length = 255)
    private String asunto;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "responsable_id", nullable = false)
    private Usuario responsable;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private ExpedienteEstado estado;
    @Column(nullable = false, updatable = false)
    private Instant creadoEn;
    @Column(nullable = false)
    private Instant actualizadoEn;
    @Version @Column(nullable = false)
    private Long version;

    protected Expediente() { }

    public Expediente(String codigo, String asunto, Usuario responsable) {
        this(codigo, asunto, responsable, Instant.now());
    }
    public Expediente(String codigo, String asunto, Usuario responsable, Instant ahora) {
        this.codigo = codigo;
        this.asunto = asunto;
        this.responsable = responsable;
        this.estado = ExpedienteEstado.ABIERTO;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
    }

    public void actualizar(String codigo, String asunto, Usuario responsable, Instant ahora) {
        this.codigo = codigo;
        this.asunto = asunto;
        this.responsable = responsable;
        this.actualizadoEn = ahora;
    }
    public void cambiarEstado(ExpedienteEstado estado, Instant ahora) {
        this.estado = estado;
        this.actualizadoEn = ahora;
    }

    public Long getId() { return id; }
    public String getCodigo() { return codigo; }
    public String getAsunto() { return asunto; }
    public Usuario getResponsable() { return responsable; }
    public Long getResponsableId() { return responsable.getId(); }
    public ExpedienteEstado getEstado() { return estado; }
    public Instant getCreadoEn() { return creadoEn; }
    public Instant getActualizadoEn() { return actualizadoEn; }
    public Long getVersion() { return version; }
}

