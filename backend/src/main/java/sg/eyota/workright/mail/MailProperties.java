package sg.eyota.workright.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "eyota.mail")
public record MailProperties(
        boolean enabled,
        String from,
        String fromName
) {}
