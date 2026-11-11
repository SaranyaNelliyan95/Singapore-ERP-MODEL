package sg.eyota.workright.employee.dossier;

/**
 * COMPLETE — HR/Admin personnel dossier including restricted banking fields (masked).
 * EMPLOYEE_COPY — record copy excluding bank account / restricted payroll internals.
 */
public enum EmployeeDossierExportMode {
    COMPLETE,
    EMPLOYEE_COPY;

    public static EmployeeDossierExportMode fromParam(String raw) {
        if (raw == null || raw.isBlank()) {
            return COMPLETE;
        }
        String v = raw.trim().toUpperCase().replace('-', '_');
        if ("EMPLOYEE_COPY".equals(v) || "COPY".equals(v) || "RECORD_COPY".equals(v)) {
            return EMPLOYEE_COPY;
        }
        return COMPLETE;
    }
}
