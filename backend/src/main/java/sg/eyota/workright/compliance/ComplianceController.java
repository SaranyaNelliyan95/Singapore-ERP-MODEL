package sg.eyota.workright.compliance;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.compliance.entity.ComplianceItemEntity;
import sg.eyota.workright.compliance.repository.ComplianceItemRepository;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/compliance")
public class ComplianceController {

    private final ComplianceItemRepository repository;

    public ComplianceController(ComplianceItemRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/me")
    public List<ComplianceItemEntity> myItems() {
        UUID employeeId = SecurityUtils.currentUser().getUser().getEmployeeId();
        return repository.findByEmployeeId(employeeId);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public List<ComplianceItemEntity> list() {
        return repository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public ComplianceItemEntity create(@RequestBody ComplianceItemEntity item) {
        item.setId(null);
        return repository.save(item);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public ComplianceItemEntity update(@PathVariable UUID id, @RequestBody ComplianceItemEntity item) {
        item.setId(id);
        return repository.save(item);
    }
}
