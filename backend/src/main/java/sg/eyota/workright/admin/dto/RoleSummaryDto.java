package sg.eyota.workright.admin.dto;

import sg.eyota.workright.common.model.UserRole;

public record RoleSummaryDto(UserRole role, long count, long activeCount) {}
