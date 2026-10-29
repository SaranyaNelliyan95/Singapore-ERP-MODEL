package sg.eyota.workright.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import sg.eyota.workright.auth.repository.AppUserRepository;

@Service
public class WorkrightUserDetailsService implements UserDetailsService {

    private final AppUserRepository appUserRepository;

    public WorkrightUserDetailsService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return appUserRepository.findByEmailIgnoreCase(username)
                .map(WorkrightUserDetails::new)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
