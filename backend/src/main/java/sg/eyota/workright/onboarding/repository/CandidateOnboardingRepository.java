package sg.eyota.workright.onboarding.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.onboarding.entity.CandidateOnboardingEntity;
import sg.eyota.workright.onboarding.entity.PipelineStatus;

public interface CandidateOnboardingRepository extends JpaRepository<CandidateOnboardingEntity, UUID> {
    Optional<CandidateOnboardingEntity> findByEmployeeId(UUID employeeId);
    List<CandidateOnboardingEntity> findByPipelineStatusNotIn(List<PipelineStatus> statuses);
    long countByPipelineStatus(PipelineStatus status);
}
