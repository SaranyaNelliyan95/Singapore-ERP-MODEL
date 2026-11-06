package sg.eyota.workright.audit;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.audit.entity.AuditEventEntity;
import sg.eyota.workright.audit.repository.AuditEventRepository;

@Service
public class AuditService {

    private final AuditEventRepository auditEventRepository;
    private final Clock clock;

    public AuditService(AuditEventRepository auditEventRepository, Clock clock) {
        this.auditEventRepository = auditEventRepository;
        this.clock = clock;
    }

    @Transactional
    public void record(UUID actorUserId, String action, String entityType, UUID entityId, String detail) {
        AuditEventEntity event = new AuditEventEntity();
        event.setActorUserId(actorUserId);
        event.setAction(action);
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        event.setDetail(detail);
        event.setCreatedAt(Instant.now(clock));
        auditEventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public List<AuditEventEntity> list() {
        return auditEventRepository.findAll();
    }
}
