package sg.eyota.workright.admin.dto;

import java.util.UUID;

import sg.eyota.workright.common.model.UserRole;

public record AdminUserDto(
        UUID id,
        String email,
        String displayName,
        UserRole role,
        UUID employeeId,
        String employeeCode,
        boolean active,
        String status
) {}
