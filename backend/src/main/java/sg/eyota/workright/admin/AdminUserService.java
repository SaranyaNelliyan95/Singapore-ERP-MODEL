package sg.eyota.workright.admin;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.admin.dto.AdminUserDto;
import sg.eyota.workright.admin.dto.RoleSummaryDto;
import sg.eyota.workright.auth.entity.AppUserEntity;
import sg.eyota.workright.auth.repository.AppUserRepository;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.common.model.UserRole;
import sg.eyota.workright.config.EyotaProperties;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;

@Service
public class AdminUserService {

    private final AppUserRepository appUserRepository;
    private final EmployeeRepository employeeRepository;
    private final EyotaProperties properties;

    public AdminUserService(
            AppUserRepository appUserRepository,
            EmployeeRepository employeeRepository,
            EyotaProperties properties
    ) {
        this.appUserRepository = appUserRepository;
        this.employeeRepository = employeeRepository;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public List<AdminUserDto> listUsers() {
        return appUserRepository.findAll().stream()
                .sorted(Comparator.comparing(AppUserEntity::getEmail, String.CASE_INSENSITIVE_ORDER))
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RoleSummaryDto> roleSummary() {
        List<AppUserEntity> users = appUserRepository.findAll();
        return Arrays.stream(UserRole.values())
                .map(role -> {
                    long count = users.stream().filter(u -> u.getRole() == role).count();
                    long active = users.stream().filter(u -> u.getRole() == role && u.isActive()).count();
                    return new RoleSummaryDto(role, count, active);
                })
                .filter(row -> row.count() > 0)
                .toList();
    }

    @Transactional
    public AdminUserDto setActive(UUID userId, boolean active, UUID actorUserId) {
        AppUserEntity user = appUserRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "User not found"));
        if (actorUserId != null && actorUserId.equals(userId) && !active) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "You cannot deactivate your own account");
        }
        if (!active && user.getRole() == UserRole.ADMIN) {
            long otherActiveAdmins = appUserRepository.findAll().stream()
                    .filter(u -> u.getRole() == UserRole.ADMIN && u.isActive() && !u.getId().equals(userId))
                    .count();
            if (otherActiveAdmins == 0) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST, "Bad Request", "Cannot deactivate the last active admin account");
            }
        }
        user.setActive(active);
        appUserRepository.save(user);
        if (user.getEmployeeId() != null) {
            employeeRepository.findById(user.getEmployeeId()).ifPresent(emp -> {
                emp.setActive(active);
                employeeRepository.save(emp);
            });
        }
        return toDto(user);
    }

    @Transactional(readOnly = true)
    public String resolveAdminContactEmail() {
        String configured = properties.security().bootstrapAdminEmail();
        if (configured != null && !configured.isBlank()) {
            return configured.trim().toLowerCase();
        }
        return appUserRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ADMIN && u.isActive())
                .map(AppUserEntity::getEmail)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .findFirst()
                .orElseGet(() -> appUserRepository.findAll().stream()
                        .filter(u -> u.getRole() == UserRole.ADMIN)
                        .map(AppUserEntity::getEmail)
                        .sorted(String.CASE_INSENSITIVE_ORDER)
                        .findFirst()
                        .orElse("admin@eyota.sg"));
    }

    private AdminUserDto toDto(AppUserEntity user) {
        String displayName = user.getEmail();
        String employeeCode = null;
        if (user.getEmployeeId() != null) {
            EmployeeEntity emp = employeeRepository.findById(user.getEmployeeId()).orElse(null);
            if (emp != null) {
                displayName = emp.getFullName();
                employeeCode = emp.getEmployeeCode();
            }
        } else if (user.getRole() == UserRole.ADMIN) {
            displayName = "System Admin";
        }
        return new AdminUserDto(
                user.getId(),
                user.getEmail(),
                displayName,
                user.getRole(),
                user.getEmployeeId(),
                employeeCode,
                user.isActive(),
                user.isActive() ? "Active" : "Inactive"
        );
    }
}
