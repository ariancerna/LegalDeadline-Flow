package pe.edu.utp.legaldeadlineflow.domain;

import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Rol rol;

    @Column(nullable = false)
    private boolean activo = true;

    @Version
    @Column(nullable = false)
    private Long version;

    protected Usuario() {
    }

    public Usuario(String nombre, String email, String passwordHash, Rol rol) {
        this.nombre = nombre.trim();
        this.email = normalizarEmail(email);
        this.passwordHash = passwordHash;
        this.rol = rol;
    }

    public void actualizar(String nombre, String email, Rol rol, boolean activo) {
        this.nombre = nombre.trim();
        this.email = normalizarEmail(email);
        this.rol = rol;
        this.activo = activo;
    }

    public void cambiarPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void desactivar() {
        this.activo = false;
    }

    private static String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public String getEmail() {
        return email;
    }

    @JsonIgnore
    public String getPasswordHash() {
        return passwordHash;
    }

    public Rol getRol() {
        return rol;
    }

    public boolean isActivo() {
        return activo;
    }

    public Long getVersion() {
        return version;
    }
}
