package sg.eyota.workright.attendance;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.attendance.dto.AttendanceGpsPolicyDto;
import sg.eyota.workright.attendance.entity.AttendanceGpsPolicyEntity;
import sg.eyota.workright.attendance.repository.AttendanceGpsPolicyRepository;
import sg.eyota.workright.config.EyotaProperties;

@Service
public class AttendancePolicyService {

    private final AttendanceGpsPolicyRepository repository;
    private final EyotaProperties properties;
    private final Clock clock;

    public AttendancePolicyService(
            AttendanceGpsPolicyRepository repository,
            EyotaProperties properties,
            Clock clock
    ) {
        this.repository = repository;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public boolean isGpsMandatory() {
        return repository.findFirstByOrderByUpdatedAtDesc()
                .map(AttendanceGpsPolicyEntity::isGpsMandatory)
                .orElse(properties.attendance().gpsMandatoryDefault());
    }

    @Transactional(readOnly = true)
    public AttendanceGpsPolicyDto getPolicy() {
        AttendanceGpsPolicyEntity entity = repository.findFirstByOrderByUpdatedAtDesc()
                .orElseGet(this::seedDefault);
        return AttendanceGpsPolicyDto.from(entity);
    }

    @Transactional
    public AttendanceGpsPolicyDto setGpsMandatory(boolean gpsMandatory, UUID actorUserId) {
        AttendanceGpsPolicyEntity entity = repository.findFirstByOrderByUpdatedAtDesc()
                .orElseGet(AttendanceGpsPolicyEntity::new);
        entity.setGpsMandatory(gpsMandatory);
        entity.setUpdatedAt(Instant.now(clock));
        entity.setUpdatedBy(actorUserId);
        return AttendanceGpsPolicyDto.from(repository.save(entity));
    }

    private AttendanceGpsPolicyEntity seedDefault() {
        AttendanceGpsPolicyEntity entity = new AttendanceGpsPolicyEntity();
        entity.setGpsMandatory(properties.attendance().gpsMandatoryDefault());
        entity.setUpdatedAt(Instant.now(clock));
        return repository.save(entity);
    }
}
