package sg.eyota.workright.leave;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.leave.entity.LeaveBalanceEntity;
import sg.eyota.workright.leave.entity.LeaveRequestEntity;
import sg.eyota.workright.leave.entity.LeaveTypeEntity;
import sg.eyota.workright.leave.repository.LeaveBalanceRepository;
import sg.eyota.workright.leave.repository.LeaveRequestRepository;
import sg.eyota.workright.leave.repository.LeaveTypeRepository;

@Service
public class LeaveService {

    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final Clock clock;

    public LeaveService(
            LeaveTypeRepository leaveTypeRepository,
            LeaveBalanceRepository leaveBalanceRepository,
            LeaveRequestRepository leaveRequestRepository,
            Clock clock
    ) {
        this.leaveTypeRepository = leaveTypeRepository;
        this.leaveBalanceRepository = leaveBalanceRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<LeaveTypeEntity> listTypes() {
        return leaveTypeRepository.findAll();
    }

    @Transactional
    public LeaveTypeEntity createType(LeaveTypeEntity type) {
        return leaveTypeRepository.save(type);
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestEntity> myRequests(UUID employeeId) {
        return leaveRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestEntity> pendingForHr() {
        return leaveRequestRepository.findByStatusOrderByCreatedAtDesc(LeaveRequestEntity.Status.SUBMITTED);
    }

    @Transactional
    public LeaveRequestEntity createRequest(UUID employeeId, LeaveRequestEntity request) {
        request.setId(null);
        request.setEmployeeId(employeeId);
        request.setStatus(LeaveRequestEntity.Status.DRAFT);
        return leaveRequestRepository.save(request);
    }

    @Transactional
    public LeaveRequestEntity submit(UUID id, UUID employeeId) {
        LeaveRequestEntity req = find(id);
        if (!req.getEmployeeId().equals(employeeId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Forbidden", "Not your leave request");
        }
        if (req.getStatus() != LeaveRequestEntity.Status.DRAFT) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Only draft requests can be submitted");
        }
        req.setStatus(LeaveRequestEntity.Status.SUBMITTED);
        req.setSubmittedAt(Instant.now(clock));
        return leaveRequestRepository.save(req);
    }

    @Transactional
    public LeaveRequestEntity decide(UUID id, UUID hrUserId, boolean approve, String note) {
        LeaveRequestEntity req = find(id);
        if (req.getStatus() != LeaveRequestEntity.Status.SUBMITTED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Request is not pending approval");
        }
        req.setStatus(approve ? LeaveRequestEntity.Status.APPROVED : LeaveRequestEntity.Status.REJECTED);
        req.setDecidedAt(Instant.now(clock));
        req.setDecidedBy(hrUserId);
        req.setDecisionNote(note);
        return leaveRequestRepository.save(req);
    }

    @Transactional(readOnly = true)
    public List<LeaveBalanceEntity> balances(UUID employeeId) {
        return leaveBalanceRepository.findByEmployeeId(employeeId);
    }

    private LeaveRequestEntity find(UUID id) {
        return leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Leave request not found"));
    }
}
