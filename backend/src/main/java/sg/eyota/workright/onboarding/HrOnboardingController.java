package sg.eyota.workright.onboarding;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import sg.eyota.workright.onboarding.dto.ActivateOnboardingRequest;
import sg.eyota.workright.onboarding.dto.CreateOnboardingDraftRequest;
import sg.eyota.workright.onboarding.dto.OnboardingActivateResponse;
import sg.eyota.workright.onboarding.dto.OnboardingCandidateDto;
import sg.eyota.workright.onboarding.dto.OnboardingDetailDto;
import sg.eyota.workright.onboarding.dto.OnboardingDocumentDto;
import sg.eyota.workright.onboarding.dto.OnboardingSummaryDto;
import sg.eyota.workright.onboarding.dto.PipelineActionRequests;
import sg.eyota.workright.onboarding.entity.OnboardingDocType;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/hr/onboarding")
@PreAuthorize("hasAnyRole('HR','ADMIN')")
public class HrOnboardingController {

    private final OnboardingService onboardingService;
    private final OnboardingPipelineService pipelineService;

    public HrOnboardingController(OnboardingService onboardingService, OnboardingPipelineService pipelineService) {
        this.onboardingService = onboardingService;
        this.pipelineService = pipelineService;
    }

    @GetMapping
    public OnboardingSummaryDto summary() {
        return onboardingService.summary();
    }

    @GetMapping("/{employeeId}")
    public OnboardingDetailDto detail(@PathVariable UUID employeeId) {
        return pipelineService.detail(employeeId);
    }

    @PostMapping("/drafts")
    public OnboardingCandidateDto createDraft(@Valid @RequestBody CreateOnboardingDraftRequest request) {
        return onboardingService.createDraft(request, SecurityUtils.currentUser().getUserId());
    }

    @PostMapping("/{employeeId}/advance")
    public OnboardingCandidateDto advance(@PathVariable UUID employeeId) {
        return onboardingService.advance(employeeId, SecurityUtils.currentUser().getUserId());
    }

    @PostMapping("/{employeeId}/status")
    public OnboardingDetailDto setStatus(
            @PathVariable UUID employeeId,
            @Valid @RequestBody PipelineActionRequests.SetStatusRequest request
    ) {
        return pipelineService.setStatus(employeeId, request, SecurityUtils.currentUser().getUserId());
    }

    @PostMapping("/{employeeId}/mom-application")
    public OnboardingDetailDto momApplication(
            @PathVariable UUID employeeId,
            @Valid @RequestBody PipelineActionRequests.MomApplicationRequest request
    ) {
        return pipelineService.recordMomApplication(employeeId, request, SecurityUtils.currentUser().getUserId());
    }

    @PostMapping("/{employeeId}/ipa")
    public OnboardingDetailDto ipa(
            @PathVariable UUID employeeId,
            @Valid @RequestBody PipelineActionRequests.IpaRecordRequest request
    ) {
        return pipelineService.recordIpa(employeeId, request, SecurityUtils.currentUser().getUserId());
    }

    @PutMapping("/{employeeId}/pre-arrival")
    public OnboardingDetailDto preArrival(
            @PathVariable UUID employeeId,
            @Valid @RequestBody PipelineActionRequests.PreArrivalRequest request
    ) {
        return pipelineService.updatePreArrival(employeeId, request, SecurityUtils.currentUser().getUserId());
    }

    @PutMapping("/{employeeId}/arrival")
    public OnboardingDetailDto arrival(
            @PathVariable UUID employeeId,
            @Valid @RequestBody PipelineActionRequests.ArrivalUpdateRequest request
    ) {
        return pipelineService.updateArrival(employeeId, request, SecurityUtils.currentUser().getUserId());
    }

    @PostMapping("/{employeeId}/appointments")
    public OnboardingDetailDto appointment(
            @PathVariable UUID employeeId,
            @Valid @RequestBody PipelineActionRequests.AppointmentRequest request
    ) {
        return pipelineService.addAppointment(employeeId, request, SecurityUtils.currentUser().getUserId());
    }

    @PutMapping("/{employeeId}/programmes")
    public OnboardingDetailDto programmes(
            @PathVariable UUID employeeId,
            @Valid @RequestBody PipelineActionRequests.ProgrammeStatusRequest request
    ) {
        return pipelineService.updateProgrammes(employeeId, request, SecurityUtils.currentUser().getUserId());
    }

    @PostMapping("/{employeeId}/work-permit")
    public OnboardingDetailDto workPermit(
            @PathVariable UUID employeeId,
            @Valid @RequestBody PipelineActionRequests.WorkPermitIssueRequest request
    ) {
        return pipelineService.issueWorkPermit(employeeId, request, SecurityUtils.currentUser().getUserId());
    }

    @PostMapping("/{employeeId}/ppe")
    public OnboardingDetailDto ppe(
            @PathVariable UUID employeeId,
            @Valid @RequestBody PipelineActionRequests.PpeIssueRequest request
    ) {
        return pipelineService.issuePpe(employeeId, request, SecurityUtils.currentUser().getUserId());
    }

    @PostMapping("/{employeeId}/complete-ready")
    public OnboardingActivateResponse completeReady(
            @PathVariable UUID employeeId,
            @Valid @RequestBody PipelineActionRequests.CompleteReadyRequest request
    ) {
        return pipelineService.completeReady(employeeId, request, SecurityUtils.currentUser().getUserId());
    }

    @PostMapping(value = "/{employeeId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public OnboardingDocumentDto uploadDocument(
            @PathVariable UUID employeeId,
            @RequestPart("file") MultipartFile file,
            @RequestParam("docType") String docType,
            @RequestParam(value = "issueDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate issueDate,
            @RequestParam(value = "expiryDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate,
            @RequestParam(value = "visibility", required = false) String visibility
    ) {
        OnboardingDocType type;
        try {
            type = OnboardingDocType.valueOf(docType.trim().toUpperCase());
        } catch (Exception ex) {
            type = OnboardingDocType.OTHER;
        }
        return pipelineService.uploadDocument(
                employeeId, type, file, issueDate, expiryDate, visibility,
                SecurityUtils.currentUser().getUserId());
    }

    @GetMapping("/{employeeId}/documents/{documentId}/download")
    public ResponseEntity<Resource> download(
            @PathVariable UUID employeeId,
            @PathVariable UUID documentId
    ) {
        Resource resource = pipelineService.downloadDocument(
                employeeId, documentId, false, SecurityUtils.currentUser().getUserId());
        String fileName = pipelineService.documentFileName(documentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @PostMapping("/{employeeId}/activate")
    public OnboardingActivateResponse activate(
            @PathVariable UUID employeeId,
            @Valid @RequestBody ActivateOnboardingRequest request
    ) {
        return onboardingService.activate(employeeId, request, SecurityUtils.currentUser().getUserId());
    }

    @PostMapping("/{employeeId}/send-invitation")
    public OnboardingCandidateDto sendInvitation(@PathVariable UUID employeeId) {
        return onboardingService.sendInvitation(employeeId, SecurityUtils.currentUser().getUserId());
    }
}
