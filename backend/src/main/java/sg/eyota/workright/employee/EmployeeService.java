package sg.eyota.workright.employee;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.employee.dto.EmployeeDto;
import sg.eyota.workright.employee.dto.EmployeeUpsertRequest;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;

@Service
public class EmployeeService {

    private final EmployeeRepository employeeRepository;

    public EmployeeService(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    @Transactional(readOnly = true)
    public List<EmployeeDto> listAll() {
        return employeeRepository.findAll().stream().map(EmployeeDto::from).toList();
    }

    @Transactional(readOnly = true)
    public EmployeeDto get(UUID id) {
        return EmployeeDto.from(find(id));
    }

    @Transactional(readOnly = true)
    public EmployeeDto me(UUID employeeId) {
        if (employeeId == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Not Found", "No employee linked to user");
        }
        return get(employeeId);
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
    public void delete(UUID id) {
        employeeRepository.delete(find(id));
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
        entity.setEmployeeCode(request.employeeCode());
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
