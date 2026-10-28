package sg.eyota.workright.masterdata;

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
import sg.eyota.workright.masterdata.entity.DepartmentEntity;
import sg.eyota.workright.masterdata.entity.DesignationEntity;
import sg.eyota.workright.masterdata.repository.DepartmentRepository;
import sg.eyota.workright.masterdata.repository.DesignationRepository;

@RestController
@RequestMapping("/api/v1/masterdata")
public class MasterDataController {

    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;

    public MasterDataController(DepartmentRepository departmentRepository, DesignationRepository designationRepository) {
        this.departmentRepository = departmentRepository;
        this.designationRepository = designationRepository;
    }

    @GetMapping("/departments")
    public List<DepartmentEntity> departments() {
        return departmentRepository.findAll();
    }

    @PostMapping("/departments")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public DepartmentEntity createDepartment(@RequestBody DepartmentEntity entity) {
        entity.setId(null);
        return departmentRepository.save(entity);
    }

    @PutMapping("/departments/{id}")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public DepartmentEntity updateDepartment(@PathVariable UUID id, @RequestBody DepartmentEntity entity) {
        entity.setId(id);
        return departmentRepository.save(entity);
    }

    @GetMapping("/designations")
    public List<DesignationEntity> designations() {
        return designationRepository.findAll();
    }

    @PostMapping("/designations")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public DesignationEntity createDesignation(@RequestBody DesignationEntity entity) {
        entity.setId(null);
        return designationRepository.save(entity);
    }

    @PutMapping("/designations/{id}")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public DesignationEntity updateDesignation(@PathVariable UUID id, @RequestBody DesignationEntity entity) {
        entity.setId(id);
        return designationRepository.save(entity);
    }
}
