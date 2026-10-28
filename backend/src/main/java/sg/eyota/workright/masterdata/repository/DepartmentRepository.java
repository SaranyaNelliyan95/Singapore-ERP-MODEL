package sg.eyota.workright.masterdata.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.masterdata.entity.DepartmentEntity;

public interface DepartmentRepository extends JpaRepository<DepartmentEntity, UUID> {}
