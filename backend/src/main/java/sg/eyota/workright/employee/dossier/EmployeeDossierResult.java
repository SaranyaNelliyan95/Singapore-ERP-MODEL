package sg.eyota.workright.employee.dossier;

public record EmployeeDossierResult(
        byte[] pdfBytes,
        String fileName,
        String contentType,
        String reportReference
) {
    public EmployeeDossierResult(byte[] pdfBytes, String fileName, String reportReference) {
        this(pdfBytes, fileName, "application/pdf", reportReference);
    }
}
