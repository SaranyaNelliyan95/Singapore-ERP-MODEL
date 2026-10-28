package sg.eyota.workright.auth.dto;

import java.util.UUID;

import sg.eyota.workright.common.model.UserRole;

public record AuthUserDto(
        String email,
        UserRole role,
        UUID employeeId,
        String employeeCode,
        String displayName
) {}
