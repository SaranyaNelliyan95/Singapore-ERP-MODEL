package sg.eyota.workright.config;

import java.io.IOException;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Loads {@code backend/.env} into the Spring Environment so MAIL_/SMTP_ settings
 * work for {@code start-dev.ps1}, Maven, and IntelliJ Run.
 *
 * <p>Registered via {@code META-INF/spring.factories} under
 * {@code org.springframework.boot.EnvironmentPostProcessor} (Spring Boot 4).
 *
 * <p>.env values are added with highest precedence so a stale IntelliJ/OS
 * {@code MAIL_ENABLED=false} cannot silently disable SMTP while {@code .env} says true.
 */
public class DotEnvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Path envFile = resolveEnvFile();
        if (envFile == null || !Files.isRegularFile(envFile)) {
            System.err.println(
                    "[dotenv] backend/.env not found (cwd="
                            + Path.of("").toAbsolutePath()
                            + "). Set MAIL_ENABLED/SMTP_* or place .env under backend/.");
            return;
        }
        try {
            Map<String, Object> values = new LinkedHashMap<>();
            for (String raw : Files.readAllLines(envFile)) {
                String line = raw.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                int eq = line.indexOf('=');
                if (eq <= 0) {
                    continue;
                }
                String key = line.substring(0, eq).trim();
                String value = stripQuotes(line.substring(eq + 1).trim());
                if ("SMTP_PASSWORD".equals(key)) {
                    value = value.replace(" ", "");
                }
                values.put(key, value);
            }

            // Bridge SMTP_* → spring.mail.* so JavaMailSender auto-config always sees host/user/pass
            // even if placeholder resolution for ${SMTP_HOST} is skipped in some profiles.
            copyAlias(values, "SMTP_HOST", "spring.mail.host");
            copyAlias(values, "SMTP_PORT", "spring.mail.port");
            copyAlias(values, "SMTP_USERNAME", "spring.mail.username");
            copyAlias(values, "SMTP_PASSWORD", "spring.mail.password");
            copyAlias(values, "MAIL_FROM", "spring.mail.properties.mail.smtp.from");

            if (!values.isEmpty()) {
                environment.getPropertySources().addFirst(new MapPropertySource("dotenv", values));
                System.out.println(
                        "[dotenv] Loaded "
                                + envFile.toAbsolutePath()
                                + " (MAIL_ENABLED="
                                + values.getOrDefault("MAIL_ENABLED", "(unset)")
                                + ", SMTP_HOST="
                                + values.getOrDefault("SMTP_HOST", "(unset)")
                                + ", smtpUserSet="
                                + hasText(values.get("SMTP_USERNAME"))
                                + ", smtpPassSet="
                                + hasText(values.get("SMTP_PASSWORD"))
                                + ")");
            }
        } catch (IOException ex) {
            System.err.println("[dotenv] Failed to read " + envFile + ": " + ex.getMessage());
        }
    }

    private static void copyAlias(Map<String, Object> values, String fromKey, String toKey) {
        Object v = values.get(fromKey);
        if (v != null && hasText(v) && !values.containsKey(toKey)) {
            values.put(toKey, v);
        }
    }

    private static boolean hasText(Object v) {
        return v != null && !String.valueOf(v).isBlank();
    }

    private static String stripQuotes(String value) {
        if (value.length() >= 2) {
            char a = value.charAt(0);
            char b = value.charAt(value.length() - 1);
            if ((a == '"' && b == '"') || (a == '\'' && b == '\'')) {
                return value.substring(1, value.length() - 1);
            }
        }
        return value;
    }

    private static Path resolveEnvFile() {
        Set<Path> candidates = new LinkedHashSet<>();

        Path cwd = Path.of("").toAbsolutePath().normalize();
        collectFromWalk(cwd, candidates);
        collectFromCodeSource(candidates);

        // Explicit OneDrive/workspace-relative fallback when cwd is a temp/IDE folder
        String userDir = System.getProperty("user.dir");
        if (userDir != null && !userDir.isBlank()) {
            collectFromWalk(Path.of(userDir).toAbsolutePath().normalize(), candidates);
        }

        for (Path candidate : candidates) {
            if (Files.isRegularFile(candidate) && looksLikeBackendEnv(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    private static void collectFromWalk(Path start, Set<Path> candidates) {
        Path dir = start;
        for (int i = 0; i < 12 && dir != null; i++) {
            candidates.add(dir.resolve(".env"));
            candidates.add(dir.resolve("backend").resolve(".env"));
            dir = dir.getParent();
        }
    }

    /**
     * IntelliJ often uses {@code backend/target/classes} as the code location —
     * walk up from there to {@code backend/.env} even if cwd is elsewhere.
     */
    private static void collectFromCodeSource(Set<Path> candidates) {
        try {
            URL loc = DotEnvEnvironmentPostProcessor.class.getProtectionDomain().getCodeSource().getLocation();
            if (loc == null) {
                return;
            }
            Path codePath = Path.of(loc.toURI()).toAbsolutePath().normalize();
            if (Files.isRegularFile(codePath)) {
                codePath = codePath.getParent();
            }
            collectFromWalk(codePath, candidates);
        } catch (URISyntaxException | RuntimeException ignored) {
            // Fall back to cwd walk only
        }
    }

    private static boolean looksLikeBackendEnv(Path envFile) {
        try {
            Path parent = envFile.getParent();
            if (parent != null && "backend".equalsIgnoreCase(parent.getFileName().toString())) {
                return true;
            }
            String text = Files.readString(envFile);
            return text.contains("MAIL_ENABLED") || text.contains("SMTP_HOST") || text.contains("DB_URL");
        } catch (IOException ex) {
            return false;
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
