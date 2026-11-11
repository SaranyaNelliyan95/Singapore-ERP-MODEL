package sg.eyota.workright.masterdata;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.masterdata.entity.LeaveConfigurationEntity;
import sg.eyota.workright.masterdata.repository.LeaveConfigurationRepository;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/admin/master-data/leave-configurations")
@PreAuthorize("hasRole('ADMIN')")
public class LeaveConfigurationController {

    private final LeaveConfigurationRepository repository;

    public LeaveConfigurationController(LeaveConfigurationRepository repository) {
        this.repository = repository;
    }

    public record LeaveConfigDto(
            UUID id,
            String code,
            String name,
            BigDecimal annualDays,
            String notes,
            boolean statutoryReviewFlag,
            boolean active
    ) {
        static LeaveConfigDto from(LeaveConfigurationEntity e) {
            return new LeaveConfigDto(
                    e.getId(), e.getCode(), e.getName(), e.getAnnualDays(),
                    e.getNotes(), e.isStatutoryReviewFlag(), e.isActive());
        }
    }

    public record LeaveConfigUpdateItem(
            @NotBlank String code,
            @NotNull @DecimalMin("0.0") BigDecimal annualDays,
            String notes
    ) {}

    @GetMapping
    @Transactional(readOnly = true)
    public List<LeaveConfigDto> list() {
        return repository.findAll().stream().map(LeaveConfigDto::from).toList();
    }

    @PutMapping
    @Transactional
    public List<LeaveConfigDto> update(@Valid @RequestBody List<LeaveConfigUpdateItem> items) {
        UUID adminId = SecurityUtils.currentUser().getUserId();
        for (LeaveConfigUpdateItem item : items) {
            LeaveConfigurationEntity entity = repository.findByCodeIgnoreCase(item.code())
                    .orElseThrow(() -> new ApiException(
                            HttpStatus.NOT_FOUND, "Not Found", "Unknown leave config: " + item.code()));
            entity.setAnnualDays(item.annualDays());
            if (item.notes() != null) {
                entity.setNotes(item.notes());
            }
            entity.setUpdatedBy(adminId);
            repository.save(entity);
        }
        return list();
    }
}
