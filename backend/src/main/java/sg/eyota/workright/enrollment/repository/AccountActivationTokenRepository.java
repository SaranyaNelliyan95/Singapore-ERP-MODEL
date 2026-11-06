package sg.eyota.workright.enrollment.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.enrollment.entity.AccountActivationTokenEntity;

public interface AccountActivationTokenRepository extends JpaRepository<AccountActivationTokenEntity, UUID> {

    List<AccountActivationTokenEntity> findByUserIdAndUsedAtIsNullOrderByCreatedAtDesc(UUID userId);
}
