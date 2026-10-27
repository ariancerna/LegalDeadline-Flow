package pe.edu.utp.legaldeadlineflow.domain;

import java.time.Instant;
import java.time.LocalDate;
import jakarta.persistence.*;

@Entity
@Table(name = "plazos")
public class Plazo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expediente_id", nullable = false)
    private Expediente expediente;
    @Column(nullable = false, length = 50)
    private String tipo;
    @Column(nullable = false)
    private LocalDate fechaLimite;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private PlazoEstado estado;
    @Column(length = 250)
    private String motivoAnulacion;
    @Column(nullable = false, updatable = false)
    private Instant creadoEn;
    @Column(nullable = false)
    private Instant actualizadoEn;
    private Instant anuladoEn;
    @Version @Column(nullable = false)
    private Long version;

    protected Plazo() { }

    public Plazo(Expediente expediente, String tipo, LocalDate fechaLimite) {
        this(expediente, tipo, fechaLimite, Instant.now());
    }
    public Plazo(Expediente expediente, String tipo, LocalDate fechaLimite, Instant ahora) {
        this.expediente = expediente;
        this.tipo = tipo;
        this.fechaLimite = fechaLimite;
        this.estado = PlazoEstado.ACTIVO;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
    }

    public void actualizar(String tipo, LocalDate fechaLimite, Instant ahora) {
        this.tipo = tipo;
        this.fechaLimite = fechaLimite;
        this.actualizadoEn = ahora;
    }
    public void anular(String motivo) { anular(motivo, Instant.now()); }
    public void anular(String motivo, Instant ahora) {
        this.estado = PlazoEstado.ANULADO;
        this.motivoAnulacion = motivo;
        this.anuladoEn = ahora;
        this.actualizadoEn = ahora;
    }

    public Long getId() { return id; }
    public Expediente getExpediente() { return expediente; }
    public String getTipo() { return tipo; }
    public LocalDate getFechaLimite() { return fechaLimite; }
    public PlazoEstado getEstado() { return estado; }
    public String getMotivoAnulacion() { return motivoAnulacion; }
    public Instant getCreadoEn() { return creadoEn; }
    public Instant getActualizadoEn() { return actualizadoEn; }
    public Instant getAnuladoEn() { return anuladoEn; }
    public Long getVersion() { return version; }
}

