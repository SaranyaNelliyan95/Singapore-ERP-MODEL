package sg.eyota.workright.auth.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.auth.entity.AppUserEntity;
import sg.eyota.workright.common.model.UserRole;

public interface AppUserRepository extends JpaRepository<AppUserEntity, UUID> {

    Optional<AppUserEntity> findByEmailIgnoreCase(String email);

    Optional<AppUserEntity> findByEmployeeId(UUID employeeId);

    boolean existsByRole(UserRole role);
}
