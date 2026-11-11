package sg.eyota.workright.admin.dto;

import jakarta.validation.constraints.NotNull;

public record SetActiveRequest(@NotNull Boolean active) {}
