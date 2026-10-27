package pe.edu.utp.legaldeadlineflow.domain;

import java.time.Instant;
import java.time.LocalDate;
import jakarta.persistence.*;

@Entity
@Table(name = "tareas")
public class Tarea {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expediente_id", nullable = false)
    private Expediente expediente;
    @Column(nullable = false, length = 120)
    private String titulo;
    @Column(nullable = false, length = 120)
    private String tituloNormalizado;
    @Column(nullable = false, length = 50)
    private String tipo;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "responsable_id", nullable = false)
    private Usuario responsable;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10)
    private Prioridad prioridad;
    @Column(nullable = false)
    private LocalDate fechaLimite;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private TareaEstado estado;
    @Column(nullable = false, updatable = false)
    private Instant creadoEn;
    @Column(nullable = false)
    private Instant actualizadoEn;
    @Version @Column(nullable = false)
    private Long version;

    protected Tarea() { }

    public Tarea(Expediente expediente, String titulo, String tituloNormalizado, String tipo,
                 Usuario responsable, Prioridad prioridad, LocalDate fechaLimite) {
        this(expediente, titulo, tituloNormalizado, tipo, responsable, prioridad, fechaLimite, Instant.now());
    }
    public Tarea(Expediente expediente, String titulo, String tituloNormalizado, String tipo,
                 Usuario responsable, Prioridad prioridad, LocalDate fechaLimite, Instant ahora) {
        this.expediente = expediente;
        this.titulo = titulo;
        this.tituloNormalizado = tituloNormalizado;
        this.tipo = tipo;
        this.responsable = responsable;
        this.prioridad = prioridad;
        this.fechaLimite = fechaLimite;
        this.estado = TareaEstado.PENDIENTE;
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
    }

    public void actualizar(String titulo, String tituloNormalizado, String tipo, Usuario responsable,
                           Prioridad prioridad, LocalDate fechaLimite, Instant ahora) {
        this.titulo = titulo;
        this.tituloNormalizado = tituloNormalizado;
        this.tipo = tipo;
        this.responsable = responsable;
        this.prioridad = prioridad;
        this.fechaLimite = fechaLimite;
        this.actualizadoEn = ahora;
    }
    public void cambiarEstado(TareaEstado nuevoEstado) { cambiarEstado(nuevoEstado, Instant.now()); }
    public void cambiarEstado(TareaEstado nuevoEstado, Instant ahora) {
        this.estado = nuevoEstado;
        this.actualizadoEn = ahora;
    }

    public Long getId() { return id; }
    public Expediente getExpediente() { return expediente; }
    public String getTitulo() { return titulo; }
    public String getTituloNormalizado() { return tituloNormalizado; }
    public String getTipo() { return tipo; }
    public Usuario getResponsable() { return responsable; }
    public Long getResponsableId() { return responsable.getId(); }
    public Prioridad getPrioridad() { return prioridad; }
    public LocalDate getFechaLimite() { return fechaLimite; }
    public TareaEstado getEstado() { return estado; }
    public Instant getCreadoEn() { return creadoEn; }
    public Instant getActualizadoEn() { return actualizadoEn; }
    public Long getVersion() { return version; }
}

