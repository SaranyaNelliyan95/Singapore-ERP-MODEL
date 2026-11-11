package sg.eyota.workright.project.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.project.entity.ManpowerRequestEntity;

public interface ManpowerRequestRepository extends JpaRepository<ManpowerRequestEntity, UUID> {

    List<ManpowerRequestEntity> findByProjectId(UUID projectId);
}
