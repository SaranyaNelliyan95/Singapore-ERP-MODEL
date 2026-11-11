package sg.eyota.workright.compliance.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.compliance.entity.ComplianceItemEntity;

public interface ComplianceItemRepository extends JpaRepository<ComplianceItemEntity, UUID> {

    List<ComplianceItemEntity> findByEmployeeId(UUID employeeId);
}
