package sg.eyota.workright.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration
@EnableConfigurationProperties(EyotaProperties.class)
@EnableJpaAuditing
public class AppConfig {

    @Bean
    Clock clock(EyotaProperties properties) {
        ZoneId zone = ZoneId.of(properties.timezone() != null ? properties.timezone() : "Asia/Singapore");
        return Clock.system(zone);
    }
}
