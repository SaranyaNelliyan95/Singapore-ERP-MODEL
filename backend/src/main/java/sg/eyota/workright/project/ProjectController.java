package sg.eyota.workright.project;

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
import sg.eyota.workright.project.entity.ManpowerRequestEntity;
import sg.eyota.workright.project.entity.ProjectAllocationEntity;
import sg.eyota.workright.project.entity.ProjectEntity;
import sg.eyota.workright.project.repository.ManpowerRequestRepository;
import sg.eyota.workright.project.repository.ProjectAllocationRepository;
import sg.eyota.workright.project.repository.ProjectRepository;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final ManpowerRequestRepository manpowerRequestRepository;
    private final ProjectAllocationRepository allocationRepository;

    public ProjectController(
            ProjectRepository projectRepository,
            ManpowerRequestRepository manpowerRequestRepository,
            ProjectAllocationRepository allocationRepository
    ) {
        this.projectRepository = projectRepository;
        this.manpowerRequestRepository = manpowerRequestRepository;
        this.allocationRepository = allocationRepository;
    }

    @GetMapping
    public List<ProjectEntity> list() {
        return projectRepository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public ProjectEntity create(@RequestBody ProjectEntity project) {
        project.setId(null);
        return projectRepository.save(project);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public ProjectEntity update(@PathVariable UUID id, @RequestBody ProjectEntity project) {
        project.setId(id);
        return projectRepository.save(project);
    }

    @GetMapping("/{projectId}/manpower-requests")
    public List<ManpowerRequestEntity> manpower(@PathVariable UUID projectId) {
        return manpowerRequestRepository.findByProjectId(projectId);
    }

    @PostMapping("/{projectId}/manpower-requests")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public ManpowerRequestEntity createManpower(@PathVariable UUID projectId, @RequestBody ManpowerRequestEntity req) {
        req.setId(null);
        req.setProjectId(projectId);
        req.setRequestedBy(SecurityUtils.currentUser().getUserId());
        return manpowerRequestRepository.save(req);
    }

    @GetMapping("/allocations/me")
    public List<ProjectAllocationEntity> myAllocations() {
        UUID employeeId = SecurityUtils.currentUser().getUser().getEmployeeId();
        return allocationRepository.findByEmployeeId(employeeId);
    }

    @PostMapping("/allocations")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public ProjectAllocationEntity createAllocation(@RequestBody ProjectAllocationEntity allocation) {
        allocation.setId(null);
        return allocationRepository.save(allocation);
    }
}
