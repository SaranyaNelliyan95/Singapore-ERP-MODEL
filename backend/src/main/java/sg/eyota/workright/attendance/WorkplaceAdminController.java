package sg.eyota.workright.attendance;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.attendance.dto.WorkplaceDto;
import sg.eyota.workright.attendance.dto.WorkplaceUpsertRequest;

@RestController
@RequestMapping("/api/v1/admin/workplaces")
@PreAuthorize("hasRole('ADMIN')")
public class WorkplaceAdminController {

    private final WorkplaceService workplaceService;

    public WorkplaceAdminController(WorkplaceService workplaceService) {
        this.workplaceService = workplaceService;
    }

    @GetMapping
    public List<WorkplaceDto> list() {
        return workplaceService.list();
    }

    @GetMapping("/{id}")
    public WorkplaceDto get(@PathVariable UUID id) {
        return workplaceService.get(id);
    }

    @PostMapping
    public WorkplaceDto create(@Valid @RequestBody WorkplaceUpsertRequest request) {
        return workplaceService.create(request);
    }

    @PutMapping("/{id}")
    public WorkplaceDto update(@PathVariable UUID id, @Valid @RequestBody WorkplaceUpsertRequest request) {
        return workplaceService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        workplaceService.delete(id);
    }
}
