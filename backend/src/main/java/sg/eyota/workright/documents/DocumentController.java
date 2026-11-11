package sg.eyota.workright.documents;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.documents.entity.DocumentEntity;
import sg.eyota.workright.documents.repository.DocumentRepository;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    private final DocumentRepository documentRepository;

    public DocumentController(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    @GetMapping("/me")
    public List<DocumentEntity> myDocuments() {
        UUID employeeId = SecurityUtils.currentUser().getUser().getEmployeeId();
        return documentRepository.findByEmployeeId(employeeId);
    }

    @PostMapping
    public DocumentEntity register(@RequestBody DocumentEntity document) {
        document.setId(null);
        document.setUploadedBy(SecurityUtils.currentUser().getUserId());
        if (document.getEmployeeId() == null) {
            document.setEmployeeId(SecurityUtils.currentUser().getUser().getEmployeeId());
        }
        return documentRepository.save(document);
    }
}
