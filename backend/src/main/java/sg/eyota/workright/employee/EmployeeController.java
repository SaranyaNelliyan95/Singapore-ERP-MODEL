package sg.eyota.workright.employee;

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
import sg.eyota.workright.employee.dto.EmployeeDto;
import sg.eyota.workright.employee.dto.EmployeeUpsertRequest;
import sg.eyota.workright.security.SecurityUtils;
import sg.eyota.workright.security.WorkrightUserDetails;

@RestController
@RequestMapping("/api/v1/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping("/me")
    public EmployeeDto me() {
        WorkrightUserDetails user = SecurityUtils.currentUser();
        return employeeService.me(user.getUser().getEmployeeId());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public List<EmployeeDto> list() {
        return employeeService.listAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public EmployeeDto get(@PathVariable UUID id) {
        return employeeService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public EmployeeDto create(@Valid @RequestBody EmployeeUpsertRequest request) {
        return employeeService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public EmployeeDto update(@PathVariable UUID id, @Valid @RequestBody EmployeeUpsertRequest request) {
        return employeeService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable UUID id) {
        employeeService.delete(id);
    }
}
