package sg.eyota.workright.attendance.dto;

import jakarta.validation.constraints.NotNull;

public record SetGpsMandatoryRequest(@NotNull Boolean gpsMandatory) {}
