package sg.eyota.workright.onboarding.notify;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.employee.repository.EmployeeRepository;
import sg.eyota.workright.onboarding.OnboardingPipelineService;
import sg.eyota.workright.onboarding.entity.OnboardingSecureLinkEntity;
import org.springframework.http.HttpStatus;

/**
 * Public (no JWT) endpoints for secure onboarding confirmation links.
 * Token is validated server-side; no PII is returned except a generic action label.
 */
@RestController
@RequestMapping("/api/v1/onboarding/confirm")
public class PublicOnboardingConfirmController {

    private final OnboardingSecureLinkService secureLinkService;
    private final OnboardingPipelineService pipelineService;
    private final EmployeeRepository employeeRepository;

    public PublicOnboardingConfirmController(
            OnboardingSecureLinkService secureLinkService,
            OnboardingPipelineService pipelineService,
            EmployeeRepository employeeRepository
    ) {
        this.secureLinkService = secureLinkService;
        this.pipelineService = pipelineService;
        this.employeeRepository = employeeRepository;
    }

    @GetMapping("/validate")
    public Map<String, Object> validate(
            @RequestParam("t") String token,
            @RequestParam(value = "action", required = false) String action
    ) {
        OnboardingSecureLinkEntity link = secureLinkService.requireValidToken(token);
        if (action != null && !action.isBlank()
                && !link.getActionType().equalsIgnoreCase(action.trim())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                    "This link is for a different confirmation step.");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("valid", true);
        body.put("actionType", link.getActionType());
        body.put("expiresAt", link.getExpiresAt().toString());
        body.put("message", "Link is valid. You can continue this confirmation step.");
        // No FIN/passport/full name in public payload
        employeeRepository.findById(link.getEmployeeId()).ifPresent(e ->
                body.put("employeeCode", e.getEmployeeCode()));
        return body;
    }

    @PostMapping("/submit")
    public Map<String, Object> submit(
            @RequestParam("t") String token,
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request
    ) {
        OnboardingSecureLinkEntity link = secureLinkService.requireValidToken(token);
        String action = link.getActionType().toUpperCase(Locale.ROOT);
        UUID employeeId = link.getEmployeeId();
        String ip = request.getRemoteAddr();

        try {
            switch (action) {
                case OnboardingSecureLinkService.ACTION_ARRIVAL ->
                        pipelineService.employeeConfirmArrival(employeeId);
                case OnboardingSecureLinkService.ACTION_CONTRACT ->
                        pipelineService.employeeAckContract(employeeId, ip);
                case OnboardingSecureLinkService.ACTION_PPE ->
                        throw new ApiException(HttpStatus.BAD_REQUEST, "Photo Required",
                                "PPE confirmation requires a photo. Sign in and upload your PPE photo on this page.");
                default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                        "Unknown confirmation action: " + action);
            }
            secureLinkService.markUsed(link);
        } catch (ApiException ex) {
            secureLinkService.recordFailure(link);
            throw ex;
        }

        Map<String, Object> ok = new LinkedHashMap<>();
        ok.put("ok", true);
        ok.put("actionType", action);
        ok.put("message", "Confirmation saved. Thank you.");
        return ok;
    }
}
