package sg.eyota.workright.attendance.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.attendance.entity.WorkplaceEntity;

public interface WorkplaceRepository extends JpaRepository<WorkplaceEntity, UUID> {

    List<WorkplaceEntity> findByActiveTrue();
}
