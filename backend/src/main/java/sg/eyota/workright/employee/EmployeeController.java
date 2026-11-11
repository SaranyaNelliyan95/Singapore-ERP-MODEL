package sg.eyota.workright.employee;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.employee.dossier.EmployeeDossierExportMode;
import sg.eyota.workright.employee.dossier.EmployeeDossierResult;
import sg.eyota.workright.employee.dossier.EmployeeDossierService;
import sg.eyota.workright.employee.dto.EmployeeDto;
import sg.eyota.workright.employee.dto.EmployeeProfileUpdateRequest;
import sg.eyota.workright.employee.dto.EmployeeUpsertRequest;
import sg.eyota.workright.employee.dto.SetEmployeeActiveRequest;
import sg.eyota.workright.security.SecurityUtils;
import sg.eyota.workright.security.WorkrightUserDetails;

@RestController
@RequestMapping("/api/v1/employees")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeDossierService dossierService;

    public EmployeeController(EmployeeService employeeService, EmployeeDossierService dossierService) {
        this.employeeService = employeeService;
        this.dossierService = dossierService;
    }

    @GetMapping("/me")
    public EmployeeDto me() {
        WorkrightUserDetails user = SecurityUtils.currentUser();
        return employeeService.me(user.getUser().getEmployeeId());
    }

    @PutMapping("/me/profile")
    public EmployeeDto updateMyProfile(@Valid @RequestBody EmployeeProfileUpdateRequest request) {
        WorkrightUserDetails user = SecurityUtils.currentUser();
        return employeeService.updateMyProfile(user.getUser().getEmployeeId(), request);
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

    /**
     * Premium Employee Master Dossier PDF.
     * {@code mode=COMPLETE} includes masked banking; {@code mode=EMPLOYEE_COPY} excludes it.
     */
    @GetMapping("/{id}/export/dossier")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public ResponseEntity<byte[]> exportDossier(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "COMPLETE") String mode
    ) {
        WorkrightUserDetails actor = SecurityUtils.currentUser();
        EmployeeDossierExportMode exportMode = EmployeeDossierExportMode.fromParam(mode);
        // COMPLETE (with banking) is HR+ADMIN; EMPLOYEE_COPY also HR+ADMIN on this endpoint.
        EmployeeDossierResult result = dossierService.export(id, exportMode, actor);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + result.fileName() + "\"")
                .header("X-Eyota-Report-Ref", result.reportReference())
                .contentType(MediaType.APPLICATION_PDF)
                .body(result.pdfBytes());
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

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public EmployeeDto setStatus(@PathVariable UUID id, @Valid @RequestBody SetEmployeeActiveRequest request) {
        return employeeService.setLoginActive(id, request.active());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public void delete(@PathVariable UUID id) {
        WorkrightUserDetails actor = SecurityUtils.currentUser();
        employeeService.delete(id, actor.getUserId());
    }
}
