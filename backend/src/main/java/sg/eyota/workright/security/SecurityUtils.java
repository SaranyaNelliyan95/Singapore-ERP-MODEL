package sg.eyota.workright.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static WorkrightUserDetails currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof WorkrightUserDetails details)) {
            throw new IllegalStateException("No authenticated user");
        }
        return details;
    }
}
