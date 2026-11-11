package sg.eyota.workright.admin;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.admin.dto.AdminUserDto;
import sg.eyota.workright.admin.dto.RoleSummaryDto;
import sg.eyota.workright.admin.dto.SetActiveRequest;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping("/users")
    public List<AdminUserDto> listUsers() {
        return adminUserService.listUsers();
    }

    @GetMapping("/roles")
    public List<RoleSummaryDto> roles() {
        return adminUserService.roleSummary();
    }

    @PutMapping("/users/{id}/status")
    public AdminUserDto setStatus(@PathVariable UUID id, @Valid @RequestBody SetActiveRequest request) {
        UUID actorId = SecurityUtils.currentUser().getUserId();
        return adminUserService.setActive(id, request.active(), actorId);
    }
}
