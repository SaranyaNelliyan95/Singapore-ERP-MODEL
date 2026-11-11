package sg.eyota.workright.onboarding;

import java.util.List;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.onboarding.dto.OnboardingDetailDto;
import sg.eyota.workright.onboarding.dto.OnboardingLatestRequestDto;
import sg.eyota.workright.onboarding.notify.OnboardingSecureLinkService;
import sg.eyota.workright.security.SecurityUtils;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/v1/employee/onboarding")
@PreAuthorize("hasRole('EMPLOYEE')")
public class EmployeeOnboardingController {

    private final OnboardingPipelineService pipelineService;
    private final OnboardingSecureLinkService secureLinkService;

    public EmployeeOnboardingController(
            OnboardingPipelineService pipelineService,
            OnboardingSecureLinkService secureLinkService
    ) {
        this.pipelineService = pipelineService;
        this.secureLinkService = secureLinkService;
    }

    @GetMapping("/me")
    public OnboardingDetailDto me() {
        return pipelineService.employeeSelfDetail(requireEmployeeId());
    }

    /** In-app feed for confirmation emails (CONTRACT / PPE) — does not replace email/WhatsApp. */
    @GetMapping("/latest-requests")
    public List<OnboardingLatestRequestDto> latestRequests() {
        return pipelineService.employeeLatestRequests(requireEmployeeId());
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

    @PostMapping(value = "/confirm-ppe-photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public OnboardingDetailDto confirmPpePhoto(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "t", required = false) String token
    ) {
        UUID employeeId = requireEmployeeId();
        sg.eyota.workright.onboarding.entity.OnboardingSecureLinkEntity link = null;
        if (token != null && !token.isBlank()) {
            link = secureLinkService.requireValidToken(token);
            if (!employeeId.equals(link.getEmployeeId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Forbidden",
                        "This confirmation link belongs to a different employee account.");
            }
            if (!OnboardingSecureLinkService.ACTION_PPE.equalsIgnoreCase(link.getActionType())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                        "This link is not a PPE confirmation link.");
            }
        }
        OnboardingDetailDto detail = pipelineService.employeeConfirmPpeWithPhoto(employeeId, file);
        if (link != null) {
            secureLinkService.markUsed(link);
        }
        return detail;
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
