package sg.eyota.workright.employee.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.employee.entity.EmployeeEntity;

public interface EmployeeRepository extends JpaRepository<EmployeeEntity, UUID> {

    Optional<EmployeeEntity> findByEmployeeCode(String employeeCode);

    Optional<EmployeeEntity> findByPersonalEmailIgnoreCase(String personalEmail);

    boolean existsByPersonalEmailIgnoreCaseAndIdNot(String personalEmail, UUID id);
}
