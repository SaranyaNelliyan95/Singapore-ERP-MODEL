package sg.eyota.workright.masterdata.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.masterdata.entity.LeaveConfigurationEntity;

public interface LeaveConfigurationRepository extends JpaRepository<LeaveConfigurationEntity, UUID> {
    Optional<LeaveConfigurationEntity> findByCodeIgnoreCase(String code);
}
