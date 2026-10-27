package pe.edu.utp.legaldeadlineflow.config;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.legaldeadlineflow.domain.*;
import pe.edu.utp.legaldeadlineflow.repository.*;

@Component
@ConditionalOnProperty(name = "legaldeadline.demo.enabled", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {
    private final UsuarioRepository usuarios;
    private final ExpedienteRepository expedientes;
    private final TareaRepository tareas;
    private final PlazoRepository plazos;
    private final EventoRepository eventos;
    private final PasswordEncoder encoder;
    private final Clock clock;

    public DemoDataSeeder(UsuarioRepository usuarios, ExpedienteRepository expedientes, TareaRepository tareas,
                          PlazoRepository plazos, EventoRepository eventos, PasswordEncoder encoder, Clock clock) {
        this.usuarios=usuarios; this.expedientes=expedientes; this.tareas=tareas; this.plazos=plazos;
        this.eventos=eventos; this.encoder=encoder; this.clock=clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        Usuario admin = usuario("Administrador Demo", "admin@legaldeadline.local", "AdminDemo123!", Rol.ADMINISTRADOR);
        usuario("Supervisor Demo", "supervisor@legaldeadline.local", "SupervisorDemo123!", Rol.SUPERVISOR);
        Usuario responsable = usuario("Responsable Demo", "responsable@legaldeadline.local", "ResponsableDemo123!", Rol.RESPONSABLE);
        usuario("Auditor Demo", "auditor@legaldeadline.local", "AuditorDemo123!", Rol.AUDITOR);
        if (expedientes.existsByCodigo("DEMO-001")) return;
        Instant ahora = clock.instant();
        LocalDate hoy = LocalDate.now(clock);
        Expediente principal = expedientes.save(new Expediente("DEMO-001", "Audiencia y escritos pendientes", responsable, ahora));
        Expediente cerrado = new Expediente("DEMO-002", "Expediente concluido de demostración", responsable, ahora);
        cerrado.cambiarEstado(ExpedienteEstado.CERRADO, ahora);
        expedientes.save(cerrado);
        Expediente archivado = new Expediente("DEMO-003", "Expediente archivado de demostración", responsable, ahora);
        archivado.cambiarEstado(ExpedienteEstado.ARCHIVADO, ahora);
        expedientes.save(archivado);
        for (int i=1; i<=6; i++) {
            String titulo = "Actividad de demostración " + i;
            Tarea tarea = new Tarea(principal, titulo, titulo.toUpperCase(Locale.ROOT), "ESCRITO", responsable,
                    i == 1 ? Prioridad.ALTA : Prioridad.MEDIA, hoy.plusDays(i-2L), ahora);
            if (i == 2) tarea.cambiarEstado(TareaEstado.EN_PROGRESO, ahora);
            tareas.save(tarea);
        }
        Tarea terminada = new Tarea(principal, "Revisión concluida", "REVISIÓN CONCLUIDA", "REVISION", responsable,
                Prioridad.BAJA, hoy.minusDays(1), ahora);
        terminada.cambiarEstado(TareaEstado.CERRADA, ahora);
        tareas.save(terminada);
        Tarea cancelada = new Tarea(principal, "Actuación cancelada", "ACTUACIÓN CANCELADA", "REVISION", responsable,
                Prioridad.BAJA, hoy.plusDays(3), ahora);
        cancelada.cambiarEstado(TareaEstado.CANCELADA, ahora);
        tareas.save(cancelada);
        for (int dias : new int[]{-1,2,4,8,15}) {
            plazos.save(new Plazo(principal, "PLAZO_DEMO_" + (dias < 0 ? "VENCIDO" : dias), hoy.plusDays(dias), ahora));
        }
        Plazo anulado = new Plazo(principal, "AUDIENCIA_REPROGRAMADA", hoy.plusDays(5), ahora);
        anulado.anular("Audiencia reprogramada para la demostración", ahora);
        plazos.save(anulado);
        eventos.save(new Evento(EventoTipo.EXPEDIENTE_CREADO, "EXPEDIENTE", principal.getId(),
                "Datos iniciales cargados en modo demostración", admin, ahora));
    }

    private Usuario usuario(String nombre, String email, String password, Rol rol) {
        return usuarios.findByEmailIgnoreCase(email).orElseGet(() -> usuarios.save(
                new Usuario(nombre, email, encoder.encode(password), rol)));
    }
}
