package sg.eyota.workright.onboarding.storage;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import sg.eyota.workright.common.exception.ApiException;

@Component
public class OnboardingFileStorage {

    private final Path root;

    public OnboardingFileStorage(
            @Value("${eyota.onboarding.storage-dir:./data/onboarding-docs}") String storageDir
    ) {
        this.root = Path.of(storageDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.root);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create onboarding document storage at " + this.root, e);
        }
    }

    public StoredFile store(UUID employeeId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "File is required");
        }
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload.bin";
        String safeName = original.replaceAll("[\\\\/\\s]+", "_");
        String key = employeeId + "/" + UUID.randomUUID() + "_" + safeName;
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Invalid storage path");
        }
        try {
            Files.createDirectories(target.getParent());
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Storage Error", "Could not store file");
        }
        return new StoredFile(key, original, file.getContentType(), file.getSize());
    }

    public Path resolve(String storagePath) {
        Path target = root.resolve(storagePath).normalize();
        if (!target.startsWith(root) || !Files.exists(target)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Document file not found");
        }
        return target;
    }

    public record StoredFile(String storagePath, String fileName, String contentType, long sizeBytes) {}
}
