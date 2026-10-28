package pe.edu.utp.legaldeadlineflow.api;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import pe.edu.utp.legaldeadlineflow.api.dto.ExpedienteRequest;
import pe.edu.utp.legaldeadlineflow.config.CarteraVolumenSeeder;
import pe.edu.utp.legaldeadlineflow.config.DemoDataSeeder;
import pe.edu.utp.legaldeadlineflow.domain.*;
import pe.edu.utp.legaldeadlineflow.repository.*;
import pe.edu.utp.legaldeadlineflow.security.AuthService;
import pe.edu.utp.legaldeadlineflow.service.ExpedienteService;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTest {
    private static final String PASSWORD="TestPassword123!";
    private static final String HASH=new BCryptPasswordEncoder(4).encode(PASSWORD);
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UsuarioRepository usuarios;
    @Autowired ExpedienteRepository expedientes;
    @Autowired TareaRepository tareas;
    @Autowired PlazoRepository plazos;
    @Autowired EventoRepository eventos;
    @Autowired JwtEncoder encoder;
    @Autowired Clock clock;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired ExpedienteService expedienteService;
    @Autowired JdbcTemplate jdbc;
    private final Map<Rol,Usuario> cuentas=new EnumMap<>(Rol.class);
    private final Map<Rol,String> tokens=new EnumMap<>(Rol.class);
    private Usuario otroResponsable;
    private String otroToken;

    @BeforeEach
    void preparar() throws Exception {
        eventos.deleteAllInBatch(); tareas.deleteAllInBatch(); plazos.deleteAllInBatch();
        expedientes.deleteAllInBatch(); usuarios.deleteAllInBatch();
        for (Rol rol:Rol.values()) {
            Usuario usuario=usuarios.saveAndFlush(new Usuario(rol.name(),rol.name().toLowerCase(Locale.ROOT)+"@test.local",HASH,rol));
            cuentas.put(rol,usuario); tokens.put(rol,login(usuario.getEmail(),PASSWORD));
        }
        otroResponsable=usuarios.saveAndFlush(new Usuario("Otro responsable","otro@test.local",HASH,Rol.RESPONSABLE));
        otroToken=login(otroResponsable.getEmail(),PASSWORD);
    }

    @Test
    void autenticacionYErroresUniformes() throws Exception {
        call(get("/api/v1/expedientes"),null,null,401);
        call(get("/actuator/health"),null,null,200);
        JsonNode actual=call(get("/api/v1/auth/me"),token(Rol.RESPONSABLE),null,200);
        assertThat(actual.get("email").asText()).isEqualTo(cuentas.get(Rol.RESPONSABLE).getEmail());
        assertThat(actual.has("passwordHash")).isFalse();
        call(post("/api/v1/auth/login"),null,Map.of("email","admin@test.local","password","incorrecta"),401);
        call(post("/api/v1/auth/login"),null,Map.of("email","noexiste@test.local","password",PASSWORD),401);
        call(post("/api/v1/auth/login"),null,Map.of("email","invalido","password",""),400);
        call(get("/api/v1/auth/me"),"token-invalido",null,401);
        call(get("/api/v1/auth/me"),token(Rol.SUPERVISOR)+"x",null,401);
    }

    @Test
    void rechazaJwtVencidoEmisorYAudienciaIncorrectos() throws Exception {
        Usuario usuario=cuentas.get(Rol.RESPONSABLE);
        call(get("/api/v1/auth/me"),jwt(usuario,clock.instant().minusSeconds(1),AuthService.ISSUER,AuthService.AUDIENCE),null,401);
        call(get("/api/v1/auth/me"),jwt(usuario,clock.instant().plusSeconds(60),"otro-emisor",AuthService.AUDIENCE),null,401);
        call(get("/api/v1/auth/me"),jwt(usuario,clock.instant().plusSeconds(60),AuthService.ISSUER,"otra-api"),null,401);
        usuario.desactivar(); usuarios.saveAndFlush(usuario);
        call(get("/api/v1/auth/me"),token(Rol.RESPONSABLE),null,401);
        call(post("/api/v1/auth/login"),null,Map.of("email",usuario.getEmail(),"password",PASSWORD),401);
    }

    @Test
    void expedientesCrudVersionesYBajaLogica() throws Exception {
        JsonNode exp=expediente(" exp-01 ",responsableId());
        long id=exp.get("id").asLong();
        assertThat(exp.get("codigo").asText()).isEqualTo("EXP-01");
        call(get("/api/v1/expedientes/"+id),token(Rol.RESPONSABLE),null,200);
        call(post("/api/v1/expedientes"),token(Rol.SUPERVISOR),
                Map.of("codigo","EXP-01","asunto","Duplicado","responsableId",responsableId()),409);
        JsonNode actualizado=call(put("/api/v1/expedientes/"+id),token(Rol.SUPERVISOR),
                Map.of("codigo","EXP-01","asunto","Asunto actualizado","responsableId",responsableId(),"version",version(exp)),200);
        assertThat(version(actualizado)).isGreaterThan(version(exp));
        call(put("/api/v1/expedientes/"+id),token(Rol.SUPERVISOR),
                Map.of("codigo","EXP-01","asunto","Versión antigua","responsableId",responsableId(),"version",version(exp)),409);
        JsonNode cerrado=call(patch("/api/v1/expedientes/"+id+"/cierre"),token(Rol.SUPERVISOR),
                Map.of("version",version(actualizado)),200);
        assertThat(cerrado.get("estado").asText()).isEqualTo("CERRADO");
        call(post("/api/v1/tareas"),token(Rol.SUPERVISOR),tareaBody(id,"Nueva tarea",responsableId(),"MEDIA"),422);
        JsonNode archivado=call(delete("/api/v1/expedientes/"+id),token(Rol.SUPERVISOR),Map.of("version",version(cerrado)),200);
        assertThat(archivado.get("estado").asText()).isEqualTo("ARCHIVADO");
        call(delete("/api/v1/expedientes/"+id),token(Rol.SUPERVISOR),Map.of("version",version(archivado)),422);
        assertThat(expedientes.count()).isEqualTo(1);
    }

    @Test
    void expedientesFiltrosYAsignacionesValidas() throws Exception {
        expediente("EXP-OWN",responsableId()); expediente("EXP-OTHER",otroResponsable.getId());
        JsonNode propia=call(get("/api/v1/expedientes").param("estado","ABIERTO").param("q","exp-own")
                .param("responsableId",responsableId().toString()),token(Rol.RESPONSABLE),null,200);
        assertThat(propia.get("totalElements").asLong()).isEqualTo(1);
        JsonNode ajena=call(get("/api/v1/expedientes").param("responsableId",otroResponsable.getId().toString()),
                token(Rol.RESPONSABLE),null,200);
        assertThat(ajena.get("totalElements").asLong()).isZero();
        call(get("/api/v1/expedientes").param("size","101"),token(Rol.SUPERVISOR),null,400);
        call(get("/api/v1/expedientes").param("page","-1"),token(Rol.SUPERVISOR),null,400);
        call(post("/api/v1/expedientes"),token(Rol.SUPERVISOR),
                Map.of("codigo","EXP-FAKE","asunto","Responsable inexistente","responsableId",999999),404);
        call(post("/api/v1/expedientes"),token(Rol.SUPERVISOR),
                Map.of("codigo","EXP-AUD","asunto","Auditor no asignable","responsableId",cuentas.get(Rol.AUDITOR).getId()),422);
        call(post("/api/v1/expedientes"),token(Rol.RESPONSABLE),
                Map.of("codigo","EXP-NO","asunto","Sin permiso","responsableId",responsableId()),403);
        call(post("/api/v1/expedientes"),token(Rol.SUPERVISOR),
                Map.of("codigo","","asunto"," ","responsableId",0),400);
    }

    @Test
    void tareaAltaExigeSupervisorRealYAuditaAutor() throws Exception {
        JsonNode exp=expediente("EXP-ALTA",responsableId());
        long expedienteId=exp.get("id").asLong();
        JsonNode tarea=call(post("/api/v1/tareas"),token(Rol.RESPONSABLE),tareaBody(expedienteId,"  Preparar   escrito  ",responsableId(),"ALTA"),201);
        long id=tarea.get("id").asLong();
        assertThat(tarea.get("titulo").asText()).isEqualTo("Preparar escrito");
        call(post("/api/v1/tareas"),token(Rol.RESPONSABLE),tareaBody(expedienteId,"preparar escrito",responsableId(),"ALTA"),409);
        call(patch("/api/v1/tareas/"+id+"/estado"),token(Rol.RESPONSABLE),
                Map.of("nuevoEstado","CERRADA","confirmacionSupervisor",true,"version",version(tarea)),403);
        call(patch("/api/v1/tareas/"+id+"/estado"),token(Rol.SUPERVISOR),
                Map.of("nuevoEstado","CERRADA","confirmacionSupervisor",false,"version",version(tarea)),422);
        JsonNode cerrada=call(patch("/api/v1/tareas/"+id+"/estado"),token(Rol.SUPERVISOR),
                Map.of("nuevoEstado","CERRADA","confirmacionSupervisor",true,"version",version(tarea)),200);
        call(patch("/api/v1/tareas/"+id+"/estado"),token(Rol.SUPERVISOR),
                Map.of("nuevoEstado","EN_PROGRESO","version",version(cerrada)),422);
        JsonNode audit=call(get("/api/v1/auditoria/eventos").param("tipo","TAREA_ESTADO_CAMBIADO")
                .param("usuarioId",cuentas.get(Rol.SUPERVISOR).getId().toString())
                .param("desde",clock.instant().minusSeconds(60).toString()).param("hasta",clock.instant().plusSeconds(60).toString()),
                token(Rol.AUDITOR),null,200);
        assertThat(audit.get("totalElements").asLong()).isEqualTo(1);
        assertThat(audit.get("content").get(0).get("usuarioEmail").asText()).isEqualTo("supervisor@test.local");
        call(get("/api/v1/auditoria/eventos"),token(Rol.RESPONSABLE),null,403);
    }

    @Test
    void tareasCrudFiltrosReasignacionYCancelacion() throws Exception {
        JsonNode exp=expediente("EXP-TASK",responsableId());
        long expId=exp.get("id").asLong();
        JsonNode tarea=call(post("/api/v1/tareas"),token(Rol.SUPERVISOR),tareaBody(expId,"Revisar documentos",responsableId(),"MEDIA"),201);
        long id=tarea.get("id").asLong();
        call(get("/api/v1/tareas/"+id),token(Rol.RESPONSABLE),null,200);
        Map<String,Object> body=new HashMap<>(tareaBody(expId,"Revisar expediente",responsableId(),"MEDIA"));
        body.remove("expedienteId"); body.put("version",version(tarea));
        JsonNode editada=call(put("/api/v1/tareas/"+id),token(Rol.RESPONSABLE),body,200);
        body.put("version",version(editada)); body.put("prioridad","ALTA");
        call(put("/api/v1/tareas/"+id),token(Rol.RESPONSABLE),body,403);
        body.put("prioridad","MEDIA"); body.put("responsableId",otroResponsable.getId());
        call(put("/api/v1/tareas/"+id),token(Rol.RESPONSABLE),body,403);
        JsonNode reasignada=call(put("/api/v1/tareas/"+id),token(Rol.SUPERVISOR),body,200);
        JsonNode lista=call(get("/api/v1/tareas").param("expedienteId",Long.toString(expId))
                .param("responsableId",otroResponsable.getId().toString()).param("estado","PENDIENTE").param("prioridad","MEDIA")
                .param("desde",hoy().toString()).param("hasta",hoy().plusDays(5).toString()),otroToken,null,200);
        assertThat(lista.get("totalElements").asLong()).isEqualTo(1);
        JsonNode porExp=call(get("/api/v1/expedientes/"+expId+"/tareas"),token(Rol.RESPONSABLE),null,200);
        assertThat(porExp.size()).isEqualTo(1);
        JsonNode cancelada=call(delete("/api/v1/tareas/"+id),otroToken,Map.of("version",version(reasignada)),200);
        assertThat(cancelada.get("estado").asText()).isEqualTo("CANCELADA");
        body.put("version",version(cancelada));
        call(put("/api/v1/tareas/"+id),token(Rol.SUPERVISOR),body,422);
        call(get("/api/v1/tareas").param("desde","2026-10-20").param("hasta","2026-10-01"),token(Rol.SUPERVISOR),null,400);
    }

    @Test
    void accesoPorRegistroYAditorSinEscritura() throws Exception {
        JsonNode exp=expediente("EXP-PRIVATE",responsableId());
        long expId=exp.get("id").asLong();
        JsonNode tarea=call(post("/api/v1/tareas"),token(Rol.SUPERVISOR),tareaBody(expId,"Actividad privada",responsableId(),"MEDIA"),201);
        JsonNode plazo=plazo(expId,hoy().plusDays(2));
        call(get("/api/v1/expedientes/"+expId),otroToken,null,403);
        call(get("/api/v1/tareas/"+tarea.get("id").asLong()),otroToken,null,403);
        call(get("/api/v1/plazos/"+plazo.get("id").asLong()),otroToken,null,403);
        call(get("/api/v1/plazos/"+plazo.get("id").asLong()+"/riesgo"),otroToken,null,403);
        assertThat(call(get("/api/v1/tareas"),otroToken,null,200).get("totalElements").asLong()).isZero();
        assertThat(call(get("/api/v1/plazos"),otroToken,null,200).get("totalElements").asLong()).isZero();
        call(post("/api/v1/tareas"),token(Rol.AUDITOR),tareaBody(expId,"Actividad prohibida",responsableId(),"MEDIA"),403);
        call(patch("/api/v1/plazos/"+plazo.get("id").asLong()+"/anulacion"),token(Rol.AUDITOR),
                Map.of("motivo","Motivo válido para anulación","version",version(plazo)),403);
        call(get("/api/v1/expedientes/"+expId),token(Rol.AUDITOR),null,200);
    }

    @Test
    void plazosCrudRiesgoLimaYMotivosNormalizados() throws Exception {
        long expId=expediente("EXP-PLAZO",responsableId()).get("id").asLong();
        call(post("/api/v1/tareas"),token(Rol.SUPERVISOR),tareaBody(expId,"Preparar audiencia",responsableId(),"MEDIA"),201);
        JsonNode plazo=plazo(expId,hoy().plusDays(2));
        long id=plazo.get("id").asLong();
        JsonNode riesgo=call(get("/api/v1/plazos/"+id+"/riesgo"),token(Rol.RESPONSABLE),null,200);
        assertThat(riesgo.get("nivel").asText()).isEqualTo("CRITICO");
        assertThat(riesgo.get("diasRestantes").asLong()).isEqualTo(2);
        assertThat(clock.getZone()).isEqualTo(ZoneId.of("America/Lima"));
        JsonNode editado=call(put("/api/v1/plazos/"+id),token(Rol.RESPONSABLE),
                Map.of("tipo","  apelacion  ","fechaLimite",hoy().plusDays(4).toString(),"version",version(plazo)),200);
        call(put("/api/v1/plazos/"+id),token(Rol.SUPERVISOR),
                Map.of("tipo","APELACION","fechaLimite",hoy().plusDays(4).toString(),"version",version(plazo)),409);
        JsonNode lista=call(get("/api/v1/plazos").param("expedienteId",Long.toString(expId)).param("estado","ACTIVO")
                .param("desde",hoy().toString()).param("hasta",hoy().plusDays(5).toString()),token(Rol.RESPONSABLE),null,200);
        assertThat(lista.get("totalElements").asLong()).isEqualTo(1);
        call(patch("/api/v1/plazos/"+id+"/anulacion"),token(Rol.RESPONSABLE),
                Map.of("motivo","x         ","version",version(editado)),400);
        JsonNode anulado=call(patch("/api/v1/plazos/"+id+"/anulacion"),token(Rol.RESPONSABLE),
                Map.of("motivo","a".repeat(250),"version",version(editado)),200);
        assertThat(anulado.get("motivoAnulacion").asText()).hasSize(250);
        call(patch("/api/v1/plazos/"+id+"/anulacion"),token(Rol.RESPONSABLE),
                Map.of("motivo","Segundo intento de anulación","version",version(anulado)),422);
        assertThat(call(get("/api/v1/plazos/"+id+"/riesgo"),token(Rol.RESPONSABLE),null,200).get("nivel").asText()).isEqualTo("BAJO");
        call(get("/api/v1/plazos").param("desde","2026-10-20").param("hasta","2026-10-01"),token(Rol.SUPERVISOR),null,400);
        assertThat(plazos.count()).isEqualTo(1);
    }

    @Test
    void cierreBloqueadoMientrasQuedenTareasOPlazos() throws Exception {
        JsonNode exp=expediente("EXP-PENDING",responsableId()); long id=exp.get("id").asLong();
        JsonNode tarea=call(post("/api/v1/tareas"),token(Rol.SUPERVISOR),tareaBody(id,"Pendiente de cierre",responsableId(),"MEDIA"),201);
        call(patch("/api/v1/expedientes/"+id+"/cierre"),token(Rol.SUPERVISOR),Map.of("version",version(exp)),422);
        call(delete("/api/v1/expedientes/"+id),token(Rol.SUPERVISOR),Map.of("version",version(exp)),422);
        call(delete("/api/v1/tareas/"+tarea.get("id").asLong()),token(Rol.SUPERVISOR),Map.of("version",version(tarea)),200);
        JsonNode plazo=plazo(id,hoy().plusDays(1));
        call(patch("/api/v1/expedientes/"+id+"/cierre"),token(Rol.SUPERVISOR),Map.of("version",version(exp)),422);
        call(delete("/api/v1/plazos/"+plazo.get("id").asLong()),token(Rol.SUPERVISOR),
                Map.of("motivo","Actuación anulada para cerrar el expediente","version",version(plazo)),200);
        call(patch("/api/v1/expedientes/"+id+"/cierre"),token(Rol.SUPERVISOR),Map.of("version",version(exp)),200);
    }

    @Test
    void indicadoresYBalanceDesdePersistenciaConVisibilidad() throws Exception {
        long expId=expediente("EXP-METRIC",responsableId()).get("id").asLong();
        JsonNode cerrable=call(post("/api/v1/tareas"),token(Rol.SUPERVISOR),tareaBody(expId,"Actividad concluida",responsableId(),"MEDIA"),201);
        call(patch("/api/v1/tareas/"+cerrable.get("id").asLong()+"/estado"),token(Rol.RESPONSABLE),
                Map.of("nuevoEstado","CERRADA","version",version(cerrable)),200);
        for(int i=0;i<6;i++) {
            Map<String,Object> body=new HashMap<>(tareaBody(expId,"Actividad activa "+i,responsableId(),"MEDIA"));
            if(i==0) body.put("fechaLimite",hoy().minusDays(1).toString());
            call(post("/api/v1/tareas"),token(Rol.SUPERVISOR),body,201);
        }
        plazo(expId,hoy().minusDays(1)); plazo(expId,hoy().plusDays(2));
        JsonNode anular=plazo(expId,hoy().plusDays(5));
        call(patch("/api/v1/plazos/"+anular.get("id").asLong()+"/anulacion"),token(Rol.SUPERVISOR),
                Map.of("motivo","Plazo anulado para verificar indicadores","version",version(anular)),200);
        JsonNode metric=call(get("/api/v1/indicadores"),token(Rol.AUDITOR),null,200);
        assertThat(metric.get("tareasActivas").asLong()).isEqualTo(6);
        assertThat(metric.get("tareasCerradas").asLong()).isEqualTo(1);
        assertThat(metric.get("tareasVencidas").asLong()).isEqualTo(1);
        assertThat(metric.get("plazosAnulados").asLong()).isEqualTo(1);
        assertThat(metric.get("plazosVencidos").asLong()).isEqualTo(1);
        assertThat(metric.get("plazosProximos").asLong()).isEqualTo(1);
        assertThat(metric.get("riesgoPlazosActivos").get("CRITICO").asLong()).isEqualTo(2);
        assertThat(call(get("/api/v1/indicadores"),otroToken,null,200).get("tareasActivas").asLong()).isZero();
        JsonNode carga=call(get("/api/v1/responsables/carga"),token(Rol.RESPONSABLE),null,200);
        assertThat(carga.size()).isEqualTo(1);
        assertThat(carga.get(0).get("sobrecargado").asBoolean()).isTrue();
        assertThat(carga.get(0).get("nombre").asText()).isNotBlank();
        assertThat(carga.get(0).get("rol").asText()).isEqualTo("RESPONSABLE");
        assertThat(call(get("/api/v1/responsables/carga"),otroToken,null,200).get(0).get("tareasActivas").asLong()).isZero();
        assertThat(call(get("/api/v1/responsables/carga"),token(Rol.SUPERVISOR),null,200).size()).isEqualTo(3);
    }

    @Test
    void usuariosSoloAdminYTokenSeRevocaAlCambiarUsuario() throws Exception {
        call(get("/api/v1/usuarios"),token(Rol.SUPERVISOR),null,403);
        call(get("/api/v1/usuarios"),token(Rol.ADMINISTRADOR),null,200);
        JsonNode creada=call(post("/api/v1/usuarios"),token(Rol.ADMINISTRADOR),
                Map.of("nombre"," Nueva cuenta ","email","  NUEVA@test.local ","password",PASSWORD,"rol","RESPONSABLE"),201);
        long id=creada.get("id").asLong();
        assertThat(creada.get("email").asText()).isEqualTo("nueva@test.local");
        assertThat(creada.has("passwordHash")).isFalse();
        call(get("/api/v1/usuarios/"+id),token(Rol.ADMINISTRADOR),null,200);
        String anterior=login("nueva@test.local",PASSWORD);
        call(put("/api/v1/usuarios/"+id),token(Rol.ADMINISTRADOR),
                Map.of("nombre","Cuenta editada","email","nueva@test.local","rol","AUDITOR","activo",true,"version",version(creada)),200);
        call(get("/api/v1/auth/me"),anterior,null,401);
        call(delete("/api/v1/usuarios/"+id),token(Rol.ADMINISTRADOR),null,204);
        call(post("/api/v1/auth/login"),null,Map.of("email","nueva@test.local","password",PASSWORD),401);
        call(delete("/api/v1/usuarios/"+cuentas.get(Rol.ADMINISTRADOR).getId()),token(Rol.ADMINISTRADOR),null,409);
    }

    @Test
    void formatosInvalidosNoDevuelvenErrorInterno() throws Exception {
        for(String recurso:List.of("expedientes","tareas","plazos")) {
            call(get("/api/v1/"+recurso+"/abc"),token(Rol.SUPERVISOR),null,400);
            call(get("/api/v1/"+recurso+"/999999"),token(Rol.SUPERVISOR),null,404);
        }
        call(get("/api/v1/ruta-inexistente"),token(Rol.SUPERVISOR),null,404);
        call(patch("/api/v1/expedientes"),token(Rol.SUPERVISOR),Map.of(),405);
    }

    @Test
    void transaccionRevierteCambioYEventoJuntos() {
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                cuentas.get(Rol.SUPERVISOR).getId().toString(),"",List.of(new SimpleGrantedAuthority("ROLE_SUPERVISOR"))));
        try {
            assertThatThrownBy(() -> new TransactionTemplate(transactionManager).execute(status -> {
                expedienteService.crear(new ExpedienteRequest("EXP-ROLLBACK","Debe revertirse",responsableId()));
                throw new IllegalStateException("Fallo posterior al evento");
            })).isInstanceOf(IllegalStateException.class);
        } finally { SecurityContextHolder.clearContext(); }
        assertThat(expedientes.existsByCodigo("EXP-ROLLBACK")).isFalse();
        assertThat(eventos.count()).isZero();
    }

    @Test
    void demostracionIdempotenteYEscenariosDeIndicadores() throws Exception {
        DemoDataSeeder seeder=new DemoDataSeeder(usuarios,expedientes,tareas,plazos,eventos,passwordEncoder,clock);
        seeder.run(new DefaultApplicationArguments());
        long usuariosAntes=usuarios.count(); long eventosAntes=eventos.count();
        seeder.run(new DefaultApplicationArguments());
        assertThat(usuarios.count()).isEqualTo(usuariosAntes);
        assertThat(eventos.count()).isEqualTo(eventosAntes);
        assertThat(expedientes.count()).isEqualTo(7);
        assertThat(tareas.count()).isEqualTo(17);
        assertThat(plazos.count()).isEqualTo(11);
        assertThat(expedientes.existsByCodigo("00412-2026-0-1801")).isTrue();
        String demo=login("admin@legaldeadline.local","AdminDemo123!");
        JsonNode metric=call(get("/api/v1/indicadores"),demo,null,200);
        assertThat(metric.get("expedientesCerrados").asLong()).isEqualTo(1);
        assertThat(metric.get("expedientesArchivados").asLong()).isEqualTo(1);
        assertThat(metric.get("tareasCanceladas").asLong()).isEqualTo(1);
    }

    @Test
    void carteraDeVolumenRespetaLasReglasDelNegocioYEsIdempotente() throws Exception {
        new DemoDataSeeder(usuarios,expedientes,tareas,plazos,eventos,passwordEncoder,clock).run(new DefaultApplicationArguments());
        CarteraVolumenSeeder volumen=new CarteraVolumenSeeder(jdbc,transactionManager,passwordEncoder,clock,600,5);
        volumen.run(new DefaultApplicationArguments());
        assertThat(expedientes.count()).isEqualTo(600);
        long tareasAntes=tareas.count(), plazosAntes=plazos.count(), eventosAntes=eventos.count(), usuariosAntes=usuarios.count();
        volumen.run(new DefaultApplicationArguments());
        assertThat(expedientes.count()).isEqualTo(600);
        assertThat(tareas.count()).isEqualTo(tareasAntes);
        assertThat(plazos.count()).isEqualTo(plazosAntes);
        assertThat(eventos.count()).isEqualTo(eventosAntes);
        assertThat(usuarios.count()).isEqualTo(usuariosAntes);

        // RF06: un expediente cerrado o archivado no conserva tareas ni plazos activos.
        assertThat(jdbc.queryForObject("""
                select count(*) from tareas t join expedientes e on e.id = t.expediente_id
                where e.estado <> 'ABIERTO' and t.estado in ('PENDIENTE', 'EN_PROGRESO')""", Long.class)).isZero();
        assertThat(jdbc.queryForObject("""
                select count(*) from plazos p join expedientes e on e.id = p.expediente_id
                where e.estado <> 'ABIERTO' and p.estado = 'ACTIVO'""", Long.class)).isZero();
        // RF08: sin tareas activas equivalentes en un mismo expediente.
        assertThat(jdbc.queryForObject("""
                select count(*) from (select expediente_id from tareas where estado in ('PENDIENTE', 'EN_PROGRESO')
                group by expediente_id, titulo_normalizado, tipo having count(*) > 1) duplicadas""", Long.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from eventos where fecha > ?", Long.class,
                clock.instant().atOffset(java.time.ZoneOffset.UTC))).isZero();

        String supervisor=login("supervisor@legaldeadline.local","SupervisorDemo123!");
        JsonNode carga=call(get("/api/v1/responsables/carga"),supervisor,null,200);
        long sobrecargados=0; for (JsonNode r:carga) if (r.get("sobrecargado").asBoolean()) sobrecargados++;
        assertThat(carga.size()).isGreaterThan(30);
        assertThat(sobrecargados).isPositive().isLessThan(carga.size()/4);
        // Los responsables nuevos entran con la contraseña de la demo.
        String nuevo=jdbc.queryForObject("select max(email) from usuarios where rol = 'RESPONSABLE' and email like '%@legaldeadline.local'",String.class);
        login(nuevo,"ResponsableDemo123!");

        // La identidad continúa después de los ids insertados por lotes.
        JsonNode creado=expediente("EXP-TRAS-VOLUMEN",responsableId());
        assertThat(creado.get("id").asLong()).isGreaterThan(jdbc.queryForObject("select max(id) from expedientes where codigo <> 'EXP-TRAS-VOLUMEN'",Long.class));
        assertThat(call(get("/api/v1/expedientes").param("q","juzgado civil").param("size","5"),supervisor,null,200).get("totalElements").asLong()).isPositive();

        // Los listados traen el riesgo (RN04) y el código del expediente: no hace falta una consulta por fila.
        JsonNode pagina=call(get("/api/v1/plazos").param("estado","ACTIVO").param("size","100"),supervisor,null,200);
        assertThat(pagina.get("content").size()).isPositive();
        for (JsonNode plazo:pagina.get("content")) {
            JsonNode riesgo=call(get("/api/v1/plazos/"+plazo.get("id").asLong()+"/riesgo"),supervisor,null,200);
            assertThat(plazo.get("nivelRiesgo").asText()).isEqualTo(riesgo.get("nivel").asText());
            assertThat(plazo.get("tareasPendientes").asLong()).isEqualTo(riesgo.get("tareasPendientes").asLong());
            assertThat(plazo.get("expedienteCodigo").asText()).isNotBlank();
        }
        JsonNode tarea=call(get("/api/v1/tareas").param("size","1"),supervisor,null,200).get("content").get(0);
        assertThat(tarea.get("expedienteCodigo").asText()).isNotBlank();

        // Historial de un expediente: sus eventos y los de sus tareas y plazos, sin mezclar otros.
        long expedienteId=pagina.get("content").get(0).get("expedienteId").asLong();
        JsonNode historial=call(get("/api/v1/auditoria/eventos").param("expedienteId",String.valueOf(expedienteId)).param("size","100"),supervisor,null,200);
        Set<Long> tareasDel=new HashSet<>(jdbc.queryForList("select id from tareas where expediente_id = ?",Long.class,expedienteId));
        Set<Long> plazosDel=new HashSet<>(jdbc.queryForList("select id from plazos where expediente_id = ?",Long.class,expedienteId));
        assertThat(historial.get("totalElements").asLong()).isGreaterThanOrEqualTo(2);
        for (JsonNode e:historial.get("content")) {
            long recursoId=e.get("recursoId").asLong();
            switch (e.get("recurso").asText()) {
                case "EXPEDIENTE" -> assertThat(recursoId).isEqualTo(expedienteId);
                case "TAREA" -> assertThat(tareasDel).contains(recursoId);
                case "PLAZO" -> assertThat(plazosDel).contains(recursoId);
                default -> fail("Recurso inesperado "+e);
            }
        }
    }

    private JsonNode expediente(String codigo,Long responsable) throws Exception {
        return call(post("/api/v1/expedientes"),token(Rol.SUPERVISOR),
                Map.of("codigo",codigo,"asunto","Asunto de prueba","responsableId",responsable),201);
    }
    private JsonNode plazo(long expedienteId,LocalDate fecha) throws Exception {
        return call(post("/api/v1/plazos"),token(Rol.SUPERVISOR),
                Map.of("expedienteId",expedienteId,"tipo","AUDIENCIA","fechaLimite",fecha.toString()),201);
    }
    private Map<String,Object> tareaBody(long expedienteId,String titulo,Long responsable,String prioridad) {
        return Map.of("expedienteId",expedienteId,"titulo",titulo,"tipo","ESCRITO","responsableId",responsable,
                "prioridad",prioridad,"fechaLimite",hoy().plusDays(2).toString());
    }
    private String login(String email,String password) throws Exception {
        return call(post("/api/v1/auth/login"),null,Map.of("email",email,"password",password),200).get("accessToken").asText();
    }
    private JsonNode call(MockHttpServletRequestBuilder builder,String token,Object body,int expected) throws Exception {
        if(token!=null) builder.header(HttpHeaders.AUTHORIZATION,"Bearer "+token);
        if(body!=null) builder.contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body));
        String json=mvc.perform(builder).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
        return json.isBlank()?mapper.nullNode():mapper.readTree(json);
    }
    private String jwt(Usuario usuario,Instant expiry,String issuer,String audience) {
        JwtClaimsSet claims=JwtClaimsSet.builder().issuer(issuer).audience(List.of(audience)).subject(usuario.getId().toString())
                .issuedAt(clock.instant().minusSeconds(120)).expiresAt(expiry).claim("version",usuario.getVersion()).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue();
    }
    private Long responsableId(){ return cuentas.get(Rol.RESPONSABLE).getId(); }
    private String token(Rol rol){ return tokens.get(rol); }
    private long version(JsonNode node){ return node.get("version").asLong(); }
    private LocalDate hoy(){ return LocalDate.now(clock); }
}

