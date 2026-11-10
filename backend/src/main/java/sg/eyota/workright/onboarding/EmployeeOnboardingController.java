package sg.eyota.workright.onboarding;

import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.onboarding.dto.OnboardingDetailDto;
import sg.eyota.workright.security.SecurityUtils;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/v1/employee/onboarding")
@PreAuthorize("hasRole('EMPLOYEE')")
public class EmployeeOnboardingController {

    private final OnboardingPipelineService pipelineService;

    public EmployeeOnboardingController(OnboardingPipelineService pipelineService) {
        this.pipelineService = pipelineService;
    }

    @GetMapping("/me")
    public OnboardingDetailDto me() {
        return pipelineService.employeeSelfDetail(requireEmployeeId());
    }

    @PostMapping("/confirm-arrival")
    public OnboardingDetailDto confirmArrival() {
        return pipelineService.employeeConfirmArrival(requireEmployeeId());
    }

    @PostMapping("/ack-contract")
    public OnboardingDetailDto ackContract() {
        return pipelineService.employeeAckContract(requireEmployeeId(), null);
    }

    @PostMapping("/confirm-ppe")
    public OnboardingDetailDto confirmPpe() {
        return pipelineService.employeeConfirmPpe(requireEmployeeId());
    }

    @GetMapping("/documents/{documentId}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID documentId) {
        UUID employeeId = requireEmployeeId();
        Resource resource = pipelineService.downloadDocument(
                employeeId, documentId, true, SecurityUtils.currentUser().getUserId());
        String fileName = pipelineService.documentFileName(documentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    private UUID requireEmployeeId() {
        UUID employeeId = SecurityUtils.currentUser().getUser().getEmployeeId();
        if (employeeId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "No employee profile linked");
        }
        return employeeId;
    }
}
