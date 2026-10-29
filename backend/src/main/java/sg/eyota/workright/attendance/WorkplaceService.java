package sg.eyota.workright.attendance;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.attendance.dto.WorkplaceDto;
import sg.eyota.workright.attendance.dto.WorkplaceUpsertRequest;
import sg.eyota.workright.attendance.entity.WorkplaceEntity;
import sg.eyota.workright.attendance.repository.WorkplaceRepository;
import sg.eyota.workright.common.exception.ApiException;

@Service
public class WorkplaceService {

    private final WorkplaceRepository workplaceRepository;

    public WorkplaceService(WorkplaceRepository workplaceRepository) {
        this.workplaceRepository = workplaceRepository;
    }

    @Transactional(readOnly = true)
    public List<WorkplaceDto> list() {
        return workplaceRepository.findAll().stream().map(WorkplaceDto::from).toList();
    }

    @Transactional(readOnly = true)
    public WorkplaceDto get(UUID id) {
        return WorkplaceDto.from(find(id));
    }

    @Transactional
    public WorkplaceDto create(WorkplaceUpsertRequest request) {
        WorkplaceEntity entity = new WorkplaceEntity();
        apply(entity, request);
        return WorkplaceDto.from(workplaceRepository.save(entity));
    }

    @Transactional
    public WorkplaceDto update(UUID id, WorkplaceUpsertRequest request) {
        WorkplaceEntity entity = find(id);
        apply(entity, request);
        return WorkplaceDto.from(workplaceRepository.save(entity));
    }

    @Transactional
    public void delete(UUID id) {
        workplaceRepository.delete(find(id));
    }

    private WorkplaceEntity find(UUID id) {
        return workplaceRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Workplace not found"));
    }

    private static void apply(WorkplaceEntity entity, WorkplaceUpsertRequest request) {
        entity.setCode(request.code());
        entity.setName(request.name());
        entity.setAddress(request.address());
        entity.setLatitude(request.latitude());
        entity.setLongitude(request.longitude());
        entity.setRadiusMetres(request.radiusMetres());
        if (request.active() != null) {
            entity.setActive(request.active());
        }
        if (request.gpsPolicy() != null) {
            entity.setGpsPolicy(request.gpsPolicy());
        }
        if (request.wfhAllowed() != null) {
            entity.setWfhAllowed(request.wfhAllowed());
        }
        entity.setEffectiveFrom(request.effectiveFrom());
        entity.setEffectiveTo(request.effectiveTo());
    }
}
