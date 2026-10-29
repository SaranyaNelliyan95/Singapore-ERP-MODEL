package sg.eyota.workright.audit;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.audit.entity.AuditEventEntity;

@RestController
@RequestMapping("/api/v1/audit")
@PreAuthorize("hasAnyRole('HR','ADMIN')")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping("/events")
    public List<AuditEventEntity> events() {
        return auditService.list();
    }
}
