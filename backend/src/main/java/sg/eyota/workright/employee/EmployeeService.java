package sg.eyota.workright.employee;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.auth.entity.AppUserEntity;
import sg.eyota.workright.auth.repository.AppUserRepository;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.employee.dto.EmployeeDto;
import sg.eyota.workright.employee.dto.EmployeeProfileUpdateRequest;
import sg.eyota.workright.employee.dto.EmployeeUpsertRequest;
import sg.eyota.workright.employee.dto.HrEmployeeUpdateRequest;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;

@Service
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final AppUserRepository appUserRepository;
    private final EmployeeCascadeDeleteService cascadeDeleteService;

    public EmployeeService(
            EmployeeRepository employeeRepository,
            AppUserRepository appUserRepository,
            EmployeeCascadeDeleteService cascadeDeleteService
    ) {
        this.employeeRepository = employeeRepository;
        this.appUserRepository = appUserRepository;
        this.cascadeDeleteService = cascadeDeleteService;
    }

    @Transactional(readOnly = true)
    public List<EmployeeDto> listAll() {
        return employeeRepository.findAll().stream()
                .map(e -> EmployeeDto.from(
                        e,
                        appUserRepository.findByEmployeeId(e.getId()).map(u -> u.isActive()).orElse(false)))
                .toList();
    }

    @Transactional(readOnly = true)
    public EmployeeDto get(UUID id) {
        EmployeeEntity e = find(id);
        boolean active = appUserRepository.findByEmployeeId(id).map(u -> u.isActive()).orElse(false);
        return EmployeeDto.from(e, active);
    }

    @Transactional(readOnly = true)
    public EmployeeDto me(UUID employeeId) {
        if (employeeId == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Not Found", "No employee linked to user");
        }
        return get(employeeId);
    }

    @Transactional
    public EmployeeDto updateMyProfile(UUID employeeId, EmployeeProfileUpdateRequest request) {
        EmployeeEntity entity = requireEmployee(employeeId);
        if (request.dateOfBirth() != null) {
            entity.setDateOfBirth(request.dateOfBirth());
        }
        if (request.gender() != null) {
            entity.setGender(request.gender());
        }
        if (request.nationality() != null) {
            entity.setNationality(request.nationality());
        }
        if (request.residentialAddress() != null) {
            entity.setResidentialAddress(request.residentialAddress());
        }
        if (request.mobile() != null && !request.mobile().isBlank()) {
            entity.setMobile(request.mobile().trim());
        }
        if (request.alternativeContact() != null) {
            entity.setAlternativeContact(request.alternativeContact());
        }
        if (request.passportNumber() != null) {
            entity.setPassportNumber(request.passportNumber());
        }
        if (request.passportExpiry() != null) {
            entity.setPassportExpiry(request.passportExpiry());
        }
        return EmployeeDto.from(employeeRepository.save(entity));
    }

    @Transactional
    public EmployeeDto create(EmployeeUpsertRequest request) {
        employeeRepository.findByEmployeeCode(request.employeeCode()).ifPresent(e -> {
            throw new ApiException(HttpStatus.CONFLICT, "Conflict", "Employee code already exists");
        });
        EmployeeEntity entity = new EmployeeEntity();
        apply(entity, request);
        return EmployeeDto.from(employeeRepository.save(entity));
    }

    @Transactional
    public EmployeeDto update(UUID id, EmployeeUpsertRequest request) {
        EmployeeEntity entity = find(id);
        apply(entity, request);
        return EmployeeDto.from(employeeRepository.save(entity));
    }

    @Transactional
    public EmployeeDto updateByHr(UUID id, HrEmployeeUpdateRequest request) {
        EmployeeEntity entity = find(id);
        String email = EmployeeHireRules.normalizeEmail(request.email());
        String fullName = EmployeeHireRules.requireName(request.fullName());
        EmployeeHireRules.requireMobile(request.mobile());
        String fin = EmployeeHireRules.requireFin(request.finNumber());
        String gender = EmployeeHireRules.normalizeGender(request.gender());
        String paymentMode = EmployeeHireRules.normalizePaymentMode(request.paymentMode());
        String salaryPeriod = EmployeeHireRules.normalizeSalaryPeriod(request.salaryPeriod());
        if ("BANKING".equals(paymentMode)) {
            if (request.bankName() == null || request.bankName().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Bank name is required for Banking payment");
            }
            boolean hasNewAccount =
                    request.bankAccountNumber() != null && !request.bankAccountNumber().isBlank();
            boolean hasExisting =
                    (entity.getBankAccountNumberMasked() != null && !entity.getBankAccountNumberMasked().isBlank())
                            || (entity.getBankAccountMasked() != null && !entity.getBankAccountMasked().isBlank());
            if (!hasNewAccount && !hasExisting) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST, "Bad Request", "Bank account number is required for Banking payment");
            }
        }
        EmployeeHireRules.requireBasicPay(request.basicPay());
        EmployeeHireRules.optionalNonNegative("Overtime rate", request.overtimeRate());
        EmployeeHireRules.optionalNonNegative("Allowances", request.allowancesTotal());

        if (employeeRepository.existsByPersonalEmailIgnoreCaseAndIdNot(email, id)) {
            throw new ApiException(HttpStatus.CONFLICT, "Conflict", "An employee already uses this email");
        }
        appUserRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
            if (user.getEmployeeId() == null || !user.getEmployeeId().equals(id)) {
                throw new ApiException(HttpStatus.CONFLICT, "Conflict", "A login already exists for this email");
            }
        });

        // employeeCode is immutable
        entity.setFullName(fullName);
        entity.setPersonalEmail(email);
        entity.setMobile(request.mobile().trim());
        entity.setDesignation(request.designation().trim());
        entity.setDepartment(request.department());
        entity.setEmploymentType(request.employmentType());
        entity.setEmploymentStatus(request.employmentStatus());
        entity.setDateOfJoining(request.dateOfJoining());
        entity.setDateOfBirth(request.dateOfBirth());
        entity.setGender(gender);
        entity.setNationality(request.nationality().trim());
        entity.setResidentialAddress(request.residentialAddress().trim());
        entity.setAlternativeContact(request.alternativeContact());
        entity.setProbationEnd(request.probationEnd());
        entity.setManagerEmployeeId(request.managerEmployeeId());
        entity.setWorkPassType(request.workPassType());
        entity.setWorkPassNumber(request.workPassNumber());
        entity.setWorkPassExpiry(request.workPassExpiry());
        entity.setFinNumber(fin);
        entity.setPassportNumber(request.passportNumber());
        entity.setPassportExpiry(request.passportExpiry());
        entity.setPaymentMode(paymentMode);
        if ("BANKING".equals(paymentMode)) {
            entity.setBankName(request.bankName());
            if (request.bankAccountNumber() != null && !request.bankAccountNumber().isBlank()) {
                String masked = maskAccount(request.bankAccountNumber());
                entity.setBankAccountNumberMasked(masked);
                entity.setBankAccountMasked(masked);
            }
        } else {
            entity.setBankName(null);
        }
        entity.setBasicPay(request.basicPay());
        entity.setOvertimeRate(request.overtimeRate());
        entity.setSalaryPeriod(salaryPeriod);
        entity.setAllowancesTotal(
                request.allowancesTotal() != null ? request.allowancesTotal() : BigDecimal.ZERO);
        entity.setPayrollStartDate(request.payrollStartDate());

        AppUserEntity linked = appUserRepository.findByEmployeeId(id).orElse(null);
        if (linked != null && !email.equalsIgnoreCase(linked.getEmail())) {
            linked.setEmail(email);
            appUserRepository.save(linked);
        }

        return EmployeeDto.from(employeeRepository.save(entity));
    }

    @Transactional
    public EmployeeDto setLoginActive(UUID id, boolean active) {
        EmployeeEntity entity = find(id);
        entity.setActive(active);
        employeeRepository.save(entity);
        appUserRepository.findByEmployeeId(id).ifPresent(user -> {
            user.setActive(active);
            appUserRepository.save(user);
        });
        return get(id);
    }

    @Transactional
    public void delete(UUID id) {
        delete(id, null);
    }

    @Transactional
    public void delete(UUID id, UUID actorUserId) {
        cascadeDeleteService.cascadeDelete(id, actorUserId);
    }

    private static String maskAccount(String account) {
        String digits = account.replaceAll("\\s+", "");
        if (digits.length() <= 4) {
            return "****";
        }
        return "****" + digits.substring(digits.length() - 4);
    }

    public EmployeeEntity requireEmployee(UUID employeeId) {
        if (employeeId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "User is not linked to an employee profile");
        }
        return find(employeeId);
    }

    private EmployeeEntity find(UUID id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));
    }

    private static void apply(EmployeeEntity entity, EmployeeUpsertRequest request) {
        // employeeCode is immutable after create for upsert from HR legacy endpoint
        if (entity.getEmployeeCode() == null) {
            entity.setEmployeeCode(request.employeeCode());
        }
        entity.setFullName(request.fullName());
        entity.setDepartment(request.department());
        entity.setDesignation(request.designation());
        if (request.employmentType() != null) {
            entity.setEmploymentType(request.employmentType());
        }
        if (request.employmentStatus() != null) {
            entity.setEmploymentStatus(request.employmentStatus());
        }
        if (request.workLocationMode() != null) {
            entity.setWorkLocationMode(request.workLocationMode());
        }
        entity.setWorkplaceId(request.workplaceId());
        entity.setManagerEmployeeId(request.managerEmployeeId());
        entity.setDateOfJoining(request.dateOfJoining());
        entity.setMobile(request.mobile());
        entity.setPersonalEmail(request.personalEmail());
        if (request.active() != null) {
            entity.setActive(request.active());
        }
    }
}
