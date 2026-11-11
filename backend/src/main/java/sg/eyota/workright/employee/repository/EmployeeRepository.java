package sg.eyota.workright.employee.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sg.eyota.workright.employee.entity.EmployeeEntity;

public interface EmployeeRepository extends JpaRepository<EmployeeEntity, UUID> {

    Optional<EmployeeEntity> findByEmployeeCode(String employeeCode);

    Optional<EmployeeEntity> findByPersonalEmailIgnoreCase(String personalEmail);

    boolean existsByPersonalEmailIgnoreCaseAndIdNot(String personalEmail, UUID id);

    @Query("""
            SELECT e FROM EmployeeEntity e
            WHERE e.onboardingStage IS NULL
               OR e.onboardingStage <> :completed
               OR e.employmentStatus = :pending
               OR e.pipelineStatus = :readyToWork
            ORDER BY e.dateOfJoining DESC, e.fullName ASC
            """)
    List<EmployeeEntity> findOnboardingPipeline(
            @Param("completed") EmployeeEntity.OnboardingStage completed,
            @Param("pending") EmployeeEntity.EmploymentStatus pending,
            @Param("readyToWork") sg.eyota.workright.onboarding.entity.PipelineStatus readyToWork);
}
