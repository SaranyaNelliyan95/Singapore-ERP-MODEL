package sg.eyota.workright.config;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.attendance.entity.WorkplaceEntity;
import sg.eyota.workright.attendance.repository.WorkplaceRepository;
import sg.eyota.workright.auth.entity.AppUserEntity;
import sg.eyota.workright.auth.repository.AppUserRepository;
import sg.eyota.workright.common.model.UserRole;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;
import sg.eyota.workright.leave.entity.LeaveBalanceEntity;
import sg.eyota.workright.leave.entity.LeaveTypeEntity;
import sg.eyota.workright.leave.repository.LeaveBalanceRepository;
import sg.eyota.workright.leave.repository.LeaveTypeRepository;
import sg.eyota.workright.masterdata.entity.DepartmentEntity;
import sg.eyota.workright.masterdata.entity.DesignationEntity;
import sg.eyota.workright.masterdata.repository.DepartmentRepository;
import sg.eyota.workright.masterdata.repository.DesignationRepository;

/**
 * Idempotent local seed for profile {@code dev}. Safe to re-run when workplaces exist but users are missing.
 */
@Component
@Profile("dev")
public class DevDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    private final WorkplaceRepository workplaceRepository;
    private final EmployeeRepository employeeRepository;
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;

    public DevDataSeeder(
            WorkplaceRepository workplaceRepository,
            EmployeeRepository employeeRepository,
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder,
            DepartmentRepository departmentRepository,
            DesignationRepository designationRepository,
            LeaveTypeRepository leaveTypeRepository,
            LeaveBalanceRepository leaveBalanceRepository
    ) {
        this.workplaceRepository = workplaceRepository;
        this.employeeRepository = employeeRepository;
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.departmentRepository = departmentRepository;
        this.designationRepository = designationRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.leaveBalanceRepository = leaveBalanceRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (workplaceRepository.count() > 0 && appUserRepository.count() > 0) {
            return;
        }
        log.info(
                "Seeding/repairing dev data (profile=dev) workplaces={} users={}",
                workplaceRepository.count(),
                appUserRepository.count()
        );

        ensureDepartment("ENG", "Engineering");
        ensureDesignation("SE", "Software Engineer");

        WorkplaceEntity hq = ensureWorkplace(
                "HQ-SPK", "HQ Science Park", 1.2916, 103.7803, 200,
                WorkplaceEntity.GpsPolicy.MANDATORY, true);
        WorkplaceEntity jurong = ensureWorkplace(
                "JURONG", "Jurong Site Office", 1.2700, 103.7200, 300,
                WorkplaceEntity.GpsPolicy.MANDATORY, false);

        EmployeeEntity ey1042 = ensureEmployee(
                "EY-1042", "Priya Tan", "Engineering", "Software Engineer", hq.getId());
        EmployeeEntity ey0088 = ensureEmployee(
                "EY-0088", "Wei Ming Lim", "HR", "HR Manager", hq.getId());
        EmployeeEntity ey1108 = ensureEmployee(
                "EY-1108", "Site Manager", "Operations", "Site Manager", jurong.getId());

        user("admin@eyota.sg", "Admin@123", UserRole.ADMIN, null);
        user("hr@eyota.sg", "HrManager@123", UserRole.HR, ey0088.getId());
        user("employee@eyota.sg", "Employee@123", UserRole.EMPLOYEE, ey1042.getId());
        user("manager@eyota.sg", "Employee@123", UserRole.EMPLOYEE, ey1108.getId());

        LeaveTypeEntity annual = ensureLeaveType("AL", "Annual Leave");
        if (leaveBalanceRepository.findByEmployeeId(ey1042.getId()).isEmpty()) {
            LeaveBalanceEntity balance = new LeaveBalanceEntity();
            balance.setEmployeeId(ey1042.getId());
            balance.setLeaveTypeId(annual.getId());
            balance.setYear(LocalDate.now().getYear());
            balance.setEntitledDays(new BigDecimal("14"));
            balance.setUsedDays(BigDecimal.ZERO);
            leaveBalanceRepository.save(balance);
        }

        log.info("Dev seed ready — admin@eyota.sg / hr@eyota.sg / employee@eyota.sg");
    }

    private void user(String email, String password, UserRole role, UUID employeeId) {
        if (appUserRepository.findByEmailIgnoreCase(email).isPresent()) {
            return;
        }
        AppUserEntity user = new AppUserEntity();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        user.setActive(true);
        user.setEmployeeId(employeeId);
        appUserRepository.save(user);
    }

    private WorkplaceEntity ensureWorkplace(
            String code, String name, double lat, double lng, int radius,
            WorkplaceEntity.GpsPolicy policy, boolean wfh
    ) {
        return workplaceRepository.findAll().stream()
                .filter(w -> code.equals(w.getCode()))
                .findFirst()
                .orElseGet(() -> workplaceRepository.save(workplace(code, name, lat, lng, radius, policy, wfh)));
    }

    private EmployeeEntity ensureEmployee(
            String code, String name, String dept, String designation, UUID workplaceId
    ) {
        return employeeRepository.findByEmployeeCode(code)
                .orElseGet(() -> employeeRepository.save(employee(code, name, dept, designation, workplaceId)));
    }

    private void ensureDepartment(String code, String name) {
        boolean exists = departmentRepository.findAll().stream().anyMatch(d -> code.equals(d.getCode()));
        if (!exists) {
            departmentRepository.save(department(code, name));
        }
    }

    private void ensureDesignation(String code, String title) {
        boolean exists = designationRepository.findAll().stream().anyMatch(d -> code.equals(d.getCode()));
        if (!exists) {
            designationRepository.save(designation(code, title));
        }
    }

    private LeaveTypeEntity ensureLeaveType(String code, String name) {
        return leaveTypeRepository.findAll().stream()
                .filter(t -> code.equals(t.getCode()))
                .findFirst()
                .orElseGet(() -> leaveTypeRepository.save(leaveType(code, name)));
    }

    private static WorkplaceEntity workplace(
            String code, String name, double lat, double lng, int radius,
            WorkplaceEntity.GpsPolicy policy, boolean wfh
    ) {
        WorkplaceEntity w = new WorkplaceEntity();
        w.setCode(code);
        w.setName(name);
        w.setAddress(name + ", Singapore");
        w.setLatitude(lat);
        w.setLongitude(lng);
        w.setRadiusMetres(radius);
        w.setActive(true);
        w.setGpsPolicy(policy);
        w.setWfhAllowed(wfh);
        return w;
    }

    private static EmployeeEntity employee(
            String code, String name, String dept, String designation, UUID workplaceId
    ) {
        EmployeeEntity e = new EmployeeEntity();
        e.setEmployeeCode(code);
        e.setFullName(name);
        e.setDepartment(dept);
        e.setDesignation(designation);
        e.setWorkplaceId(workplaceId);
        e.setEmploymentType(EmployeeEntity.EmploymentType.FULL_TIME);
        e.setEmploymentStatus(EmployeeEntity.EmploymentStatus.ACTIVE);
        e.setWorkLocationMode(EmployeeEntity.WorkLocationMode.HYBRID);
        e.setDateOfJoining(LocalDate.of(2024, 1, 15));
        e.setActive(true);
        return e;
    }

    private static DepartmentEntity department(String code, String name) {
        DepartmentEntity d = new DepartmentEntity();
        d.setCode(code);
        d.setName(name);
        d.setActive(true);
        return d;
    }

    private static DesignationEntity designation(String code, String title) {
        DesignationEntity d = new DesignationEntity();
        d.setCode(code);
        d.setTitle(title);
        d.setActive(true);
        return d;
    }

    private static LeaveTypeEntity leaveType(String code, String name) {
        LeaveTypeEntity t = new LeaveTypeEntity();
        t.setCode(code);
        t.setName(name);
        t.setPaid(true);
        t.setActive(true);
        return t;
    }
}
