package sg.eyota.workright.claims;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.claims.entity.ClaimRequestEntity;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/claims")
public class ClaimController {

    private final ClaimService claimService;

    public ClaimController(ClaimService claimService) {
        this.claimService = claimService;
    }

    @GetMapping("/me")
    public List<ClaimRequestEntity> myClaims() {
        return claimService.myClaims(SecurityUtils.currentUser().getUser().getEmployeeId());
    }

    @PostMapping
    public ClaimRequestEntity create(@RequestBody ClaimRequestEntity claim) {
        return claimService.create(SecurityUtils.currentUser().getUser().getEmployeeId(), claim);
    }

    @PostMapping("/{id}/submit")
    public ClaimRequestEntity submit(@PathVariable UUID id) {
        return claimService.submit(id, SecurityUtils.currentUser().getUser().getEmployeeId());
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public List<ClaimRequestEntity> pending() {
        return claimService.pending();
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public ClaimRequestEntity approve(@PathVariable UUID id, @RequestBody(required = false) Map<String, String> body) {
        return claimService.decide(id, SecurityUtils.currentUser().getUserId(), true,
                body != null ? body.get("note") : null);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public ClaimRequestEntity reject(@PathVariable UUID id, @RequestBody(required = false) Map<String, String> body) {
        return claimService.decide(id, SecurityUtils.currentUser().getUserId(), false,
                body != null ? body.get("note") : null);
    }
}
