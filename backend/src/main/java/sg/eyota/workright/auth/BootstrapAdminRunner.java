package sg.eyota.workright.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.auth.entity.AppUserEntity;
import sg.eyota.workright.auth.repository.AppUserRepository;
import sg.eyota.workright.common.model.UserRole;
import sg.eyota.workright.config.EyotaProperties;

@Component
public class BootstrapAdminRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapAdminRunner.class);

    private final EyotaProperties properties;
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public BootstrapAdminRunner(
            EyotaProperties properties,
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.properties = properties;
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String email = properties.security().bootstrapAdminEmail();
        String password = properties.security().bootstrapAdminPassword();
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return;
        }
        if (appUserRepository.existsByRole(UserRole.ADMIN)) {
            return;
        }
        AppUserEntity admin = new AppUserEntity();
        admin.setEmail(email.trim().toLowerCase());
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setRole(UserRole.ADMIN);
        admin.setActive(true);
        appUserRepository.save(admin);
        log.info("Bootstrap admin user created for email {}", admin.getEmail());
    }
}
