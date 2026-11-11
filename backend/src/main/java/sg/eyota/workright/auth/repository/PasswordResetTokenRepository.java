package sg.eyota.workright.auth.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.auth.entity.PasswordResetTokenEntity;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, UUID> {
    Optional<PasswordResetTokenEntity> findFirstByEmailIgnoreCaseAndUsedAtIsNullOrderByCreatedAtDesc(String email);

    List<PasswordResetTokenEntity> findByEmailIgnoreCaseAndUsedAtIsNull(String email);
}
