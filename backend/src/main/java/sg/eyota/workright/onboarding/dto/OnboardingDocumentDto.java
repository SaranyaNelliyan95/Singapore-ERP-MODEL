package sg.eyota.workright.onboarding.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import sg.eyota.workright.onboarding.entity.OnboardingDocumentEntity;

public record OnboardingDocumentDto(
        UUID id,
        String docType,
        String fileName,
        String contentType,
        Long sizeBytes,
        LocalDate issueDate,
        LocalDate expiryDate,
        String approvalStatus,
        int versionNo,
        String visibility,
        boolean viewedByEmployee,
        boolean downloadedByEmployee,
        Instant uploadedAt
) {
    public static OnboardingDocumentDto from(OnboardingDocumentEntity e) {
        return new OnboardingDocumentDto(
                e.getId(),
                e.getDocType().name(),
                e.getFileName(),
                e.getContentType(),
                e.getSizeBytes(),
                e.getIssueDate(),
                e.getExpiryDate(),
                e.getApprovalStatus(),
                e.getVersionNo(),
                e.getVisibility(),
                e.isViewedByEmployee(),
                e.isDownloadedByEmployee(),
                e.getCreatedAt()
        );
    }
}
