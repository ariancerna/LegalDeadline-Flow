package pe.edu.utp.legaldeadlineflow.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

class DatabaseUrlEnvironmentPostProcessorTest {

    private final DatabaseUrlEnvironmentPostProcessor procesador = new DatabaseUrlEnvironmentPostProcessor();

    @Test
    void convierteLaCadenaDeNeonAPropiedadesJdbc() {
        Map<String, Object> p = DatabaseUrlEnvironmentPostProcessor.convertir(
                "postgresql://neondb_owner:npg_AbC123@ep-calm-sun-a1b2c3.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");
        assertThat(p).containsEntry("spring.datasource.url",
                        "jdbc:postgresql://ep-calm-sun-a1b2c3.sa-east-1.aws.neon.tech/neondb?sslmode=require")
                .containsEntry("spring.datasource.username", "neondb_owner")
                .containsEntry("spring.datasource.password", "npg_AbC123");
    }

    @Test
    void decodificaLaClaveYConservaPuertoYParametros() {
        Map<String, Object> p = DatabaseUrlEnvironmentPostProcessor.convertir(
                "postgres://app:cl%40ve%2Fsegura+1@db.ejemplo.pe:6543/legal?connectTimeout=20");
        assertThat(p).containsEntry("spring.datasource.url",
                        "jdbc:postgresql://db.ejemplo.pe:6543/legal?connectTimeout=20&sslmode=require")
                .containsEntry("spring.datasource.password", "cl@ve/segura+1");
    }

    @Test
    void enLocalNoExigeSsl() {
        Map<String, Object> p = DatabaseUrlEnvironmentPostProcessor.convertir("postgresql://u:p@localhost:5432/legaldeadline");
        assertThat(p).containsEntry("spring.datasource.url", "jdbc:postgresql://localhost:5432/legaldeadline");
    }

    @Test
    void sobrescribeLaConfiguracionCuandoExisteDatabaseUrl() {
        StandardEnvironment env = new StandardEnvironment();
        env.getPropertySources().addLast(new MapPropertySource("app", Map.of(
                "spring.datasource.url", "jdbc:postgresql://localhost:5432/legaldeadline",
                "DATABASE_URL", "postgresql://neon:secreto@ep-x.aws.neon.tech/neondb")));
        procesador.postProcessEnvironment(env, new SpringApplication());
        assertThat(env.getProperty("spring.datasource.url")).isEqualTo("jdbc:postgresql://ep-x.aws.neon.tech/neondb?sslmode=require");
        assertThat(env.getProperty("spring.datasource.username")).isEqualTo("neon");
    }

    @Test
    void sinDatabaseUrlNoCambiaNada() {
        StandardEnvironment env = new StandardEnvironment();
        env.getPropertySources().addLast(new MapPropertySource("app", Map.of("spring.datasource.url", "jdbc:postgresql://db:5432/x")));
        procesador.postProcessEnvironment(env, new SpringApplication());
        assertThat(env.getProperty("spring.datasource.url")).isEqualTo("jdbc:postgresql://db:5432/x");
    }

    @Test
    void rechazaFormatosQueNoSonPostgres() {
        assertThatThrownBy(() -> DatabaseUrlEnvironmentPostProcessor.convertir("mysql://u:p@host/db"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("postgresql://");
        assertThatThrownBy(() -> DatabaseUrlEnvironmentPostProcessor.convertir("postgresql://u:p@host"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("nombre de la base");
    }
}
