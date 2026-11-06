package sg.eyota.workright.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import sg.eyota.workright.mail.MailProperties;

@Configuration
@EnableConfigurationProperties(MailProperties.class)
public class MailConfig {
    // JavaMailSender is auto-configured when spring.mail.host is set
}
