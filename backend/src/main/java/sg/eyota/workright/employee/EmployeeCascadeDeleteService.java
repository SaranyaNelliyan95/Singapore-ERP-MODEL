package sg.eyota.workright.employee;

import java.util.List;
import java.util.UUID;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.auth.entity.AppUserEntity;
import sg.eyota.workright.auth.repository.AppUserRepository;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.common.model.UserRole;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;
import sg.eyota.workright.enrollment.entity.EmployeeInvitationEntity;
import sg.eyota.workright.enrollment.repository.EmployeeInvitationRepository;

/**
 * Hard-deletes an employee and all related rows so HR can re-enrol and retest OTP flows cleanly.
 */
@Service
public class EmployeeCascadeDeleteService {

    private final EmployeeRepository employeeRepository;
    private final AppUserRepository appUserRepository;
    private final EmployeeInvitationRepository invitationRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public EmployeeCascadeDeleteService(
            EmployeeRepository employeeRepository,
            AppUserRepository appUserRepository,
            EmployeeInvitationRepository invitationRepository
    ) {
        this.employeeRepository = employeeRepository;
        this.appUserRepository = appUserRepository;
        this.invitationRepository = invitationRepository;
    }

    @Transactional
    public void cascadeDelete(UUID employeeId, UUID actorUserId) {
        EmployeeEntity employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));

        AppUserEntity linkedUser = appUserRepository.findByEmployeeId(employeeId).orElse(null);
        if (linkedUser != null) {
            if (linkedUser.getRole() == UserRole.ADMIN || linkedUser.getRole() == UserRole.HR) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "Bad Request",
                        "Cannot delete Admin/HR accounts from the employee directory");
            }
            if (actorUserId != null && actorUserId.equals(linkedUser.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "You cannot delete your own account");
            }
        }

        // Clear self-references that would block delete
        entityManager.createNativeQuery(
                        "UPDATE employees SET manager_employee_id = NULL WHERE manager_employee_id = :id")
                .setParameter("id", employeeId)
                .executeUpdate();

        if (linkedUser != null) {
            UUID userId = linkedUser.getId();
            entityManager.createNativeQuery(
                            "UPDATE employees SET created_by_user_id = NULL WHERE created_by_user_id = :uid")
                    .setParameter("uid", userId)
                    .executeUpdate();
            entityManager.createNativeQuery(
                            "UPDATE attendance_sessions SET corrected_by = NULL WHERE corrected_by = :uid")
                    .setParameter("uid", userId)
                    .executeUpdate();
            entityManager.createNativeQuery(
                            "UPDATE leave_requests SET decided_by = NULL WHERE decided_by = :uid")
                    .setParameter("uid", userId)
                    .executeUpdate();
            entityManager.createNativeQuery(
                            "UPDATE claim_requests SET decided_by = NULL WHERE decided_by = :uid")
                    .setParameter("uid", userId)
                    .executeUpdate();
            entityManager.createNativeQuery(
                            "UPDATE audit_events SET actor_user_id = NULL WHERE actor_user_id = :uid")
                    .setParameter("uid", userId)
                    .executeUpdate();
            entityManager.createNativeQuery(
                            "UPDATE employee_salary_history SET changed_by = NULL WHERE changed_by = :uid")
                    .setParameter("uid", userId)
                    .executeUpdate();
            entityManager.createNativeQuery(
                            "UPDATE manpower_requests SET requested_by = NULL WHERE requested_by = :uid")
                    .setParameter("uid", userId)
                    .executeUpdate();
            entityManager.createNativeQuery(
                            "UPDATE employee_invitations SET created_by_user_id = NULL WHERE created_by_user_id = :uid")
                    .setParameter("uid", userId)
                    .executeUpdate();
            entityManager.createNativeQuery(
                            "DELETE FROM password_reset_tokens WHERE user_id = :uid")
                    .setParameter("uid", userId)
                    .executeUpdate();

            List<EmployeeInvitationEntity> invitations =
                    invitationRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
            for (EmployeeInvitationEntity inv : invitations) {
                entityManager.createNativeQuery(
                                "DELETE FROM account_activation_tokens WHERE invitation_id = :iid")
                        .setParameter("iid", inv.getId())
                        .executeUpdate();
            }
            entityManager.createNativeQuery(
                            "DELETE FROM account_activation_tokens WHERE user_id = :uid")
                    .setParameter("uid", userId)
                    .executeUpdate();
            entityManager.createNativeQuery(
                            "DELETE FROM employee_invitations WHERE employee_id = :eid OR user_id = :uid")
                    .setParameter("eid", employeeId)
                    .setParameter("uid", userId)
                    .executeUpdate();
        } else {
            entityManager.createNativeQuery(
                            "DELETE FROM account_activation_tokens WHERE invitation_id IN "
                                    + "(SELECT id FROM employee_invitations WHERE employee_id = :eid)")
                    .setParameter("eid", employeeId)
                    .executeUpdate();
            entityManager.createNativeQuery(
                            "DELETE FROM employee_invitations WHERE employee_id = :eid")
                    .setParameter("eid", employeeId)
                    .executeUpdate();
        }

        deleteByEmployeeId("attendance_reject_audit", employeeId);
        deleteByEmployeeId("attendance_sessions", employeeId);
        deleteByEmployeeId("leave_balances", employeeId);
        deleteByEmployeeId("leave_requests", employeeId);
        deleteByEmployeeId("claim_requests", employeeId);
        deleteByEmployeeId("project_allocations", employeeId);
        deleteByEmployeeId("compliance_items", employeeId);
        deleteByEmployeeId("payslips", employeeId);
        deleteByEmployeeId("documents", employeeId);
        deleteByEmployeeId("employee_salary_history", employeeId);
        // Foreign / work-pass onboarding (candidate_onboarding cascades children via FK)
        deleteByEmployeeId("onboarding_audit_logs", employeeId);
        deleteByEmployeeId("employee_acknowledgements", employeeId);
        deleteByEmployeeId("ppe_issuance", employeeId);
        deleteByEmployeeId("work_pass_records", employeeId);
        deleteByEmployeeId("onboarding_appointments", employeeId);
        deleteByEmployeeId("arrival_records", employeeId);
        deleteByEmployeeId("onboarding_tasks", employeeId);
        deleteByEmployeeId("onboarding_documents", employeeId);
        deleteByEmployeeId("work_pass_applications", employeeId);
        deleteByEmployeeId("candidate_onboarding", employeeId);

        if (linkedUser != null) {
            appUserRepository.delete(linkedUser);
            entityManager.flush();
        }

        employeeRepository.delete(employee);
    }

    private void deleteByEmployeeId(String table, UUID employeeId) {
        entityManager.createNativeQuery("DELETE FROM " + table + " WHERE employee_id = :id")
                .setParameter("id", employeeId)
                .executeUpdate();
    }
}
