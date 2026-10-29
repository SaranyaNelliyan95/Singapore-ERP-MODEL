package sg.eyota.workright.claims;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.claims.entity.ClaimRequestEntity;
import sg.eyota.workright.claims.repository.ClaimRequestRepository;
import sg.eyota.workright.common.exception.ApiException;

@Service
public class ClaimService {

    private final ClaimRequestRepository claimRequestRepository;
    private final Clock clock;

    public ClaimService(ClaimRequestRepository claimRequestRepository, Clock clock) {
        this.claimRequestRepository = claimRequestRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ClaimRequestEntity> myClaims(UUID employeeId) {
        return claimRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    @Transactional(readOnly = true)
    public List<ClaimRequestEntity> pending() {
        return claimRequestRepository.findByStatusOrderByCreatedAtDesc(ClaimRequestEntity.Status.SUBMITTED);
    }

    @Transactional
    public ClaimRequestEntity create(UUID employeeId, ClaimRequestEntity claim) {
        claim.setId(null);
        claim.setEmployeeId(employeeId);
        claim.setStatus(ClaimRequestEntity.Status.DRAFT);
        return claimRequestRepository.save(claim);
    }

    @Transactional
    public ClaimRequestEntity submit(UUID id, UUID employeeId) {
        ClaimRequestEntity claim = find(id);
        if (!claim.getEmployeeId().equals(employeeId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Forbidden", "Not your claim");
        }
        claim.setStatus(ClaimRequestEntity.Status.SUBMITTED);
        claim.setSubmittedAt(Instant.now(clock));
        return claimRequestRepository.save(claim);
    }

    @Transactional
    public ClaimRequestEntity decide(UUID id, UUID hrUserId, boolean approve, String note) {
        ClaimRequestEntity claim = find(id);
        claim.setStatus(approve ? ClaimRequestEntity.Status.APPROVED : ClaimRequestEntity.Status.REJECTED);
        claim.setDecidedAt(Instant.now(clock));
        claim.setDecidedBy(hrUserId);
        claim.setDecisionNote(note);
        return claimRequestRepository.save(claim);
    }

    private ClaimRequestEntity find(UUID id) {
        return claimRequestRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Claim not found"));
    }
}
