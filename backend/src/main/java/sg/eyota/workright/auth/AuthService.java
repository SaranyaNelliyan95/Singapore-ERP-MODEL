package sg.eyota.workright.auth;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.auth.dto.AuthUserDto;
import sg.eyota.workright.auth.dto.LoginRequest;
import sg.eyota.workright.auth.dto.LoginResponse;
import sg.eyota.workright.auth.entity.AppUserEntity;
import sg.eyota.workright.auth.repository.AppUserRepository;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;
import sg.eyota.workright.security.JwtService;
import sg.eyota.workright.security.WorkrightUserDetails;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AppUserRepository appUserRepository;
    private final EmployeeRepository employeeRepository;

    public AuthService(
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            AppUserRepository appUserRepository,
            EmployeeRepository employeeRepository
    ) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.appUserRepository = appUserRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        AppUserEntity user = appUserRepository.findByEmailIgnoreCase(request.email()).orElseThrow();
        String token = jwtService.generateToken(user);
        return new LoginResponse(token, "Bearer", jwtService.expirationMinutes(), toUserDto(user));
    }

    @Transactional(readOnly = true)
    public AuthUserDto me(WorkrightUserDetails principal) {
        return toUserDto(principal.getUser());
    }

    private AuthUserDto toUserDto(AppUserEntity user) {
        String code = null;
        String name = user.getEmail();
        if (user.getEmployeeId() != null) {
            EmployeeEntity emp = employeeRepository.findById(user.getEmployeeId()).orElse(null);
            if (emp != null) {
                code = emp.getEmployeeCode();
                name = emp.getFullName();
            }
        }
        return new AuthUserDto(user.getEmail(), user.getRole(), user.getEmployeeId(), code, name);
    }
}
