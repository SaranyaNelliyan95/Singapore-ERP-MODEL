package sg.eyota.workright.project.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.project.entity.ProjectAllocationEntity;

public interface ProjectAllocationRepository extends JpaRepository<ProjectAllocationEntity, UUID> {

    List<ProjectAllocationEntity> findByEmployeeId(UUID employeeId);
}
