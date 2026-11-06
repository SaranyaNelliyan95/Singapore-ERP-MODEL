package sg.eyota.workright.employee.dto;

import jakarta.validation.constraints.NotNull;

public record SetEmployeeActiveRequest(@NotNull Boolean active) {}
