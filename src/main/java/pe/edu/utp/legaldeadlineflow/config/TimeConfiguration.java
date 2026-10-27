package pe.edu.utp.legaldeadlineflow.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class TimeConfiguration {

    @Bean
    Clock systemClock(@Value("${legaldeadline.time-zone:America/Lima}") String timeZone) {
        return Clock.system(ZoneId.of(timeZone));
    }
}
