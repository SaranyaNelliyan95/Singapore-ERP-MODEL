package sg.eyota.workright.project.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.project.entity.ProjectEntity;

public interface ProjectRepository extends JpaRepository<ProjectEntity, UUID> {}
