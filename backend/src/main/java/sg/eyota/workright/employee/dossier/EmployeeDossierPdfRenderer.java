package sg.eyota.workright.employee.dossier;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.io.RandomAccessReadBuffer;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Component;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import sg.eyota.workright.auth.entity.AppUserEntity;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.onboarding.entity.ArrivalRecordEntity;
import sg.eyota.workright.onboarding.entity.CandidateOnboardingEntity;
import sg.eyota.workright.onboarding.entity.OnboardingAuditLogEntity;
import sg.eyota.workright.onboarding.entity.OnboardingDocumentEntity;
import sg.eyota.workright.onboarding.entity.OnboardingTaskEntity;
import sg.eyota.workright.onboarding.entity.OnboardingTaskStatus;
import sg.eyota.workright.onboarding.entity.PpeIssuanceEntity;
import sg.eyota.workright.onboarding.entity.WorkPassApplicationEntity;
import sg.eyota.workright.onboarding.entity.WorkPassRecordEntity;

@Component
public class EmployeeDossierPdfRenderer {

    private static final ZoneId SG = ZoneId.of("Asia/Singapore");
    private static final DateTimeFormatter DT =
            DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm").withZone(SG);
    private static final DateTimeFormatter D =
            DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final String DOC_VERSION = "WR-DOSSIER-1.1";

    /** Brand + semantic palette — distinct section accents for scannable reading. */
    private static final Color DUSTY_BLUE = new Color(0x5D, 0x93, 0xB5);
    private static final Color MAUVE = new Color(0xB2, 0xA3, 0xA3);
    private static final Color NAVY = new Color(0x1E, 0x37, 0x5A);
    private static final Color TEAL = new Color(0x2F, 0x7D, 0x7A);
    private static final Color SLATE = new Color(0x4A, 0x5E, 0x75);
    private static final Color AMBER = new Color(0xC4, 0x84, 0x2D);
    private static final Color PLUM = new Color(0x7A, 0x5C, 0x8A);
    private static final Color FOREST = new Color(0x3D, 0x7A, 0x55);
    private static final Color CORAL = new Color(0xC4, 0x6B, 0x5A);
    private static final Color LIGHT_GREY = new Color(0xF7, 0xF8, 0xFA);
    private static final Color TABLE_HEADER = new Color(0xEE, 0xF3, 0xF7);
    private static final Color MUTED = new Color(0x5F, 0x6B, 0x78);
    private static final Color SUCCESS = new Color(0x1F, 0x7A, 0x4D);
    private static final Color SUCCESS_BG = new Color(0xE8, 0xF5, 0xEE);
    private static final Color WARN = new Color(0xA6, 0x6B, 0x1F);
    private static final Color WARN_BG = new Color(0xFB, 0xF3, 0xE0);
    private static final Color DANGER = new Color(0xA3, 0x3B, 0x3B);
    private static final Color DANGER_BG = new Color(0xFB, 0xEC, 0xEC);
    private static final Color NEUTRAL_BG = new Color(0xEE, 0xF0, 0xF3);
    private static final Color TRACK = new Color(0xE2, 0xE8, 0xEE);

    public byte[] render(DossierModel model) throws IOException {
        ByteArrayOutputStream main = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 42, 42, 56, 52);
        try {
            PdfWriter writer = PdfWriter.getInstance(document, main);
            writer.setPageEvent(new FooterEvent(model));
            document.open();
            writeCover(document, model);
            writeExecutiveSummary(document, model);
            writePersonal(document, model);
            writeEmployment(document, model);
            writeImmigration(document, model);
            writeOnboardingJourney(document, model);
            writeCompliance(document, model);
            writeArrival(document, model);
            writePayroll(document, model);
            writeDocumentVault(document, model);
            writeAudit(document, model);
            writeFinalSummary(document, model);
            writeImageAttachments(document, model);
            document.close();
        } catch (DocumentException e) {
            throw new IOException("PDF layout failed", e);
        }

        byte[] basePdf = main.toByteArray();
        if (model.pdfAttachments().isEmpty()) {
            return basePdf;
        }
        return mergePdfAttachments(basePdf, model.pdfAttachments());
    }

    private void writeCover(Document doc, DossierModel m) throws DocumentException {
        // Dual-tone hero header
        PdfPTable band = new PdfPTable(2);
        band.setWidthPercentage(100);
        band.setWidths(new float[]{0.72f, 0.28f});

        PdfPCell left = new PdfPCell();
        left.setBackgroundColor(NAVY);
        left.setBorder(Rectangle.NO_BORDER);
        left.setPadding(10);
        left.addElement(new Paragraph("EYOTA WORKRIGHT", titleFont(14, Color.WHITE)));
        left.addElement(new Paragraph("Employee Master Dossier", titleFont(10, new Color(0xC8, 0xDC, 0xEA))));
        left.addElement(new Paragraph("CONFIDENTIAL  |  Personnel record", smallFont(new Color(0xB8, 0xC8, 0xD4))));
        band.addCell(left);

        PdfPCell right = new PdfPCell();
        right.setBackgroundColor(DUSTY_BLUE);
        right.setBorder(Rectangle.NO_BORDER);
        right.setPadding(10);
        right.setVerticalAlignment(Element.ALIGN_MIDDLE);
        right.addElement(new Paragraph("ID", smallFont(new Color(0xD6, 0xE8, 0xF2))));
        right.addElement(new Paragraph(nz(m.employee().getEmployeeCode()), titleFont(14, Color.WHITE)));
        right.addElement(new Paragraph(m.mode() == EmployeeDossierExportMode.COMPLETE
                ? "COMPLETE" : "RECORD COPY", smallFont(Color.WHITE)));
        band.addCell(right);
        doc.add(band);

        // Accent strip
        PdfPTable strip = new PdfPTable(4);
        strip.setWidthPercentage(100);
        strip.addCell(accentChip(TEAL));
        strip.addCell(accentChip(AMBER));
        strip.addCell(accentChip(PLUM));
        strip.addCell(accentChip(CORAL));
        doc.add(strip);

        spacer(doc, 5);
        PdfPTable meta = new PdfPTable(3);
        meta.setWidthPercentage(100);
        meta.setWidths(new float[]{1.2f, 1f, 1f});
        meta.addCell(kv("Report ref", m.reportReference(), DUSTY_BLUE));
        meta.addCell(kv("Generated (SGT)", DT.format(m.generatedAt()), TEAL));
        meta.addCell(kv("Version", DOC_VERSION, SLATE));
        meta.addCell(kv("Classification", "Confidential — HR only", CORAL));
        meta.addCell(kv("Export mode", m.mode() == EmployeeDossierExportMode.COMPLETE
                ? "Complete dossier" : "Employee copy", PLUM));
        meta.addCell(kv("Employee", nz(m.employee().getFullName()), NAVY));
        doc.add(meta);

        spacer(doc, 6);
        section(doc, "01", "Cover & executive summary", "ID", DUSTY_BLUE);

        PdfPTable cover = new PdfPTable(2);
        cover.setWidthPercentage(100);
        cover.setWidths(new float[]{0.26f, 0.74f});

        PdfPCell photo = new PdfPCell();
        photo.setBackgroundColor(NEUTRAL_BG);
        photo.setBorderColor(DUSTY_BLUE);
        photo.setBorderWidth(1.2f);
        photo.setPadding(8);
        photo.setMinimumHeight(78);
        photo.setHorizontalAlignment(Element.ALIGN_CENTER);
        photo.setVerticalAlignment(Element.ALIGN_MIDDLE);
        photo.addElement(new Paragraph("PHOTO", titleFont(9, DUSTY_BLUE)));
        photo.addElement(new Paragraph("Not on file", smallFont(MUTED)));
        cover.addCell(photo);

        PdfPCell identity = new PdfPCell();
        identity.setBorder(Rectangle.NO_BORDER);
        identity.setPaddingLeft(12);
        identity.setPaddingTop(2);
        identity.addElement(new Paragraph(nz(m.employee().getFullName()), titleFont(16, NAVY)));
        identity.addElement(new Paragraph(
                nz(m.employee().getEmployeeCode()) + "   |   "
                        + nz(m.employee().getDesignation()) + "   |   "
                        + nz(m.employee().getDepartment()),
                bodyFont(MUTED)));
        identity.addElement(new Paragraph(" "));
        PdfPTable facts = new PdfPTable(2);
        facts.setWidthPercentage(100);
        facts.addCell(miniFact("Nationality", nz(m.employee().getNationality()), TEAL));
        facts.addCell(miniFact("Employment type", enumName(m.employee().getEmploymentType()), SLATE));
        facts.addCell(miniFact("Joined", date(m.employee().getDateOfJoining()), FOREST));
        facts.addCell(miniFact("Manager", nz(m.managerName()), PLUM));
        facts.addCell(miniFact("Work location", enumName(m.employee().getWorkLocationMode()), AMBER));
        facts.addCell(miniFact("Account", accountStatus(m), DUSTY_BLUE));
        identity.addElement(facts);
        cover.addCell(identity);
        doc.add(cover);

        spacer(doc, 5);
        doc.add(new Paragraph("STATUS DASHBOARD", subtitleFont(NAVY)));
        PdfPTable dash = new PdfPTable(3);
        dash.setWidthPercentage(100);
        dash.setSpacingBefore(3);
        dash.setSpacingAfter(1);
        dash.addCell(statusCard("Employment", enumName(m.employee().getEmploymentStatus()), SLATE));
        dash.addCell(statusCard("Account", accountStatus(m), TEAL));
        dash.addCell(statusCard("Onboarding", onboardingStatus(m), DUSTY_BLUE));
        dash.addCell(statusCard("Work permit", workPermitStatus(m), FOREST));
        dash.addCell(statusCard("Documents", documentStatus(m), AMBER));
        dash.addCell(statusCard("Ready to Work", readyStatus(m), CORAL));
        doc.add(dash);

        spacer(doc, 4);
        EmployeeDossierService.TaskStats s = m.stats();
        doc.add(new Paragraph("ONBOARDING PROGRESS", subtitleFont(NAVY)));
        doc.add(new Paragraph(
                "Formula: Completed applicable / Total applicable x 100. "
                        + "N/A tasks excluded. Pending and blocked never count as complete.",
                smallFont(MUTED)));

        PdfPTable prog = new PdfPTable(6);
        prog.setWidthPercentage(100);
        headerRow(prog, DUSTY_BLUE, "Applicable", "Completed", "Pending", "In progress", "N/A", "Blocked");
        prog.addCell(metricCell(String.valueOf(s.applicable()), SLATE));
        prog.addCell(metricCell(String.valueOf(s.completed()), SUCCESS));
        prog.addCell(metricCell(String.valueOf(s.pending()), WARN));
        prog.addCell(metricCell(String.valueOf(s.inProgress()), AMBER));
        prog.addCell(metricCell(String.valueOf(s.notApplicable()), MUTED));
        prog.addCell(metricCell(String.valueOf(s.rejected()), DANGER));

        // Keep metrics + progress bar together so the bar never orphans alone on next page
        PdfPTable progressBlock = new PdfPTable(1);
        progressBlock.setWidthPercentage(100);
        progressBlock.setSpacingBefore(3);
        progressBlock.setKeepTogether(true);
        PdfPCell metricsWrap = new PdfPCell();
        metricsWrap.setBorder(Rectangle.NO_BORDER);
        metricsWrap.setPadding(0);
        metricsWrap.addElement(prog);
        progressBlock.addCell(metricsWrap);

        int pct = Math.max(0, Math.min(100, s.completionPercent()));
        Color barColor = progressColor(pct);
        PdfPTable track = new PdfPTable(pct <= 0 || pct >= 100 ? 1 : 2);
        track.setWidthPercentage(100);
        if (pct > 0 && pct < 100) {
            float filled = pct / 100f;
            track.setWidths(new float[]{filled, 1f - filled});
        }
        track.setSpacingBefore(5);
        if (pct <= 0) {
            PdfPCell rest = new PdfPCell(new Phrase("  0% complete — not started", titleFont(8, MUTED)));
            rest.setBackgroundColor(TRACK);
            rest.setBorder(Rectangle.NO_BORDER);
            rest.setPadding(6);
            track.addCell(rest);
        } else if (pct >= 100) {
            PdfPCell fill = new PdfPCell(new Phrase("  100% complete", titleFont(8, Color.WHITE)));
            fill.setBackgroundColor(barColor);
            fill.setBorder(Rectangle.NO_BORDER);
            fill.setPadding(6);
            track.addCell(fill);
        } else {
            PdfPCell fill = new PdfPCell(new Phrase("  " + pct + "% complete", titleFont(8, Color.WHITE)));
            fill.setBackgroundColor(barColor);
            fill.setBorder(Rectangle.NO_BORDER);
            fill.setPadding(6);
            track.addCell(fill);
            PdfPCell rest = new PdfPCell(new Phrase(" "));
            rest.setBackgroundColor(TRACK);
            rest.setBorder(Rectangle.NO_BORDER);
            rest.setPadding(6);
            track.addCell(rest);
        }
        PdfPCell trackWrap = new PdfPCell();
        trackWrap.setBorder(Rectangle.NO_BORDER);
        trackWrap.setPadding(0);
        trackWrap.addElement(track);
        progressBlock.addCell(trackWrap);
        doc.add(progressBlock);
    }

    private void writeExecutiveSummary(Document doc, DossierModel m) {
        // covered in cover
    }

    private void writePersonal(Document doc, DossierModel m) throws DocumentException {
        section(doc, "02", "Personal & contact information", "PER", TEAL);
        PdfPTable t = twoCol();
        addPair(t, "Full legal name", nz(m.employee().getFullName()), "Date of birth", date(m.employee().getDateOfBirth()));
        addPair(t, "Gender", nz(m.employee().getGender()), "Nationality", nz(m.employee().getNationality()));
        addPair(t, "FIN", maskId(m.employee().getFinNumber(), m.mode()), "Passport number",
                maskId(m.employee().getPassportNumber(), m.mode()));
        addPair(t, "Passport expiry", date(m.employee().getPassportExpiry()), "Residential address",
                nz(m.employee().getResidentialAddress()));
        addPair(t, "Personal email", nz(m.employee().getPersonalEmail()), "Company / login email",
                m.account() != null ? nz(m.account().getEmail()) : "—");
        addPair(t, "Mobile", nz(m.employee().getMobile()), "Alternative / emergency contact",
                nz(m.employee().getAlternativeContact()));
        doc.add(t);
    }

    private void writeEmployment(Document doc, DossierModel m) throws DocumentException {
        section(doc, "03", "Employment information", "EMP", SLATE);
        PdfPTable t = twoCol();
        addPair(t, "Employee ID", nz(m.employee().getEmployeeCode()), "Designation", nz(m.employee().getDesignation()));
        addPair(t, "Department", nz(m.employee().getDepartment()), "Employment type",
                enumName(m.employee().getEmploymentType()));
        addPair(t, "Employment status", enumName(m.employee().getEmploymentStatus()),
                "Date of joining", date(m.employee().getDateOfJoining()));
        addPair(t, "Contract start", date(m.employee().getDateOfJoining()),
                "Contract / notice end", date(m.employee().getNoticeEnd()));
        addPair(t, "Probation end", date(m.employee().getProbationEnd()),
                "Reporting manager", nz(m.managerName()));
        addPair(t, "Work location", enumName(m.employee().getWorkLocationMode()),
                "Work sector", nz(m.employee().getSector() != null ? m.employee().getSector()
                        : (m.co() != null ? m.co().getSector() : null)));
        addPair(t, "Worker category", nz(m.employee().getWorkerCategory() != null
                        ? m.employee().getWorkerCategory()
                        : (m.co() != null ? m.co().getWorkerCategory() : null)),
                "Invitation status", nz(m.employee().getInvitationEmailStatus()));
        addPair(t, "Account activation", accountStatus(m), "Login active",
                m.employee().isActive() ? "Yes" : "No");
        doc.add(t);
    }

    private void writeImmigration(Document doc, DossierModel m) throws DocumentException {
        section(doc, "04", "Immigration & work permit dossier", "WP", FOREST);
        WorkPassRecordEntity wp = m.wp();
        WorkPassApplicationEntity app = m.apps().isEmpty() ? null : m.apps().getFirst();

        doc.add(new Paragraph("IPA RECORDS", subtitleFont(FOREST)));
        PdfPTable ipa = twoCol();
        addPair(ipa, "IPA number", wp != null ? nz(wp.getIpaNumber()) : "—",
                "Application date", app != null ? date(app.getSubmittedAt()) : "—");
        addPair(ipa, "IPA issue / approval", wp != null ? date(wp.getIpaIssueDate()) : "—",
                "IPA expiry", wp != null ? date(wp.getIpaExpiryDate()) : "—");
        addPair(ipa, "Extension requested",
                wp != null && wp.getIpaExtensionRequested() != null
                        ? (Boolean.TRUE.equals(wp.getIpaExtensionRequested()) ? "Yes" : "No") : "—",
                "Current status", ipaStatus(wp));
        doc.add(ipa);

        spacer(doc, 6);
        doc.add(new Paragraph("WORK PERMIT RECORDS", subtitleFont(SLATE)));
        PdfPTable permit = twoCol();
        addPair(permit, "Work permit number", wp != null ? nz(wp.getWpNumber()) : nz(m.employee().getWorkPassNumber()),
                "Work permit type", nz(m.employee().getWorkPassType() != null
                        ? m.employee().getWorkPassType()
                        : (m.co() != null ? m.co().getPassType() : null)));
        addPair(permit, "Issue date", wp != null ? date(wp.getWpIssueDate()) : "—",
                "Expiry date", firstDate(wp != null ? wp.getWpExpiryDate() : null, m.employee().getWorkPassExpiry()));
        addPair(permit, "Card collected", wp != null ? yesNo(wp.isCardCollected()) : "—",
                "FIN", maskId(wp != null && wp.getFinNumber() != null
                        ? wp.getFinNumber() : m.employee().getFinNumber(), m.mode()));
        addPair(permit, "Temporary permit no.", wp != null ? nz(wp.getTpNumber()) : "—",
                "TP valid / expiry", wp != null
                        ? (yesNo(wp.isTpValid()) + " / " + date(wp.getTpExpiryDate())) : "—");
        doc.add(permit);

        spacer(doc, 6);
        doc.add(new Paragraph("PERMIT EXPIRY MONITORING", subtitleFont(AMBER)));
        LocalDate today = LocalDate.now(SG);
        PdfPTable mon = new PdfPTable(4);
        mon.setWidthPercentage(100);
        headerRow(mon, AMBER, "Document", "Reference", "Expiry", "Status");
        addMonRow(mon, "IPA", wp != null ? wp.getIpaNumber() : null,
                wp != null ? wp.getIpaExpiryDate() : null, today);
        addMonRow(mon, "Work Permit",
                wp != null && wp.getWpNumber() != null ? wp.getWpNumber() : m.employee().getWorkPassNumber(),
                firstDateObj(wp != null ? wp.getWpExpiryDate() : null, m.employee().getWorkPassExpiry()), today);
        addMonRow(mon, "Temporary Permit", wp != null ? wp.getTpNumber() : null,
                wp != null ? wp.getTpExpiryDate() : null, today);
        addMonRow(mon, "Passport", m.employee().getPassportNumber(),
                m.employee().getPassportExpiry(), today);
        doc.add(mon);

        if (m.co() != null) {
            spacer(doc, 4);
            PdfPTable med = twoCol();
            addPair(med, "Medical examination", enumName(m.co().getMedicalStatus()),
                    "Quarantine", enumName(m.co().getQuarantineStatus()));
            doc.add(med);
        }
    }

    private void writeOnboardingJourney(Document doc, DossierModel m) throws DocumentException {
        section(doc, "05", "Complete onboarding journey", "JOUR", PLUM);
        doc.add(new Paragraph(
                "Milestone timeline from pipeline tasks and audit history. "
                        + "Blank dates mean the event is not recorded yet.",
                smallFont(MUTED)));

        stageBlock(doc, "1", "Pre-employment & registration", TEAL, List.of(
                journeyRow("Candidate registration / master creation",
                        m.employee().getCreatedAt(), null, "System / HR",
                        m.employee().getCreatedAt() != null ? "COMPLETED" : "PENDING", null),
                taskRow(m, "COLLECT_DOCS"),
                taskRow(m, "LOCAL_FORMS"),
                taskRow(m, "CONTRACT_ACK")
        ));
        stageBlock(doc, "2", "Work pass & approval", FOREST, List.of(
                taskRow(m, "MOM_APPLICATION", "APPLICATION"),
                journeyRow("IPA recorded",
                        null,
                        m.wp() != null ? m.wp().getIpaIssueDate() : null,
                        "HR",
                        m.wp() != null && m.wp().getIpaNumber() != null ? "COMPLETED" : "PENDING",
                        m.wp() != null ? m.wp().getIpaNumber() : null),
                taskRow(m, "SG_IPA")
        ));
        stageBlock(doc, "3", "Arrival & accommodation", DUSTY_BLUE, List.of(
                journeyRow("Planned arrival", null, m.arrival() != null ? m.arrival().getPlannedArrivalDate() : null,
                        "HR", m.arrival() != null && m.arrival().getPlannedArrivalDate() != null ? "COMPLETED" : "PENDING", null),
                journeyRow("Actual arrival", null, m.arrival() != null ? m.arrival().getActualArrivalDate() : null,
                        "HR / Employee",
                        m.arrival() != null && m.arrival().getActualArrivalDate() != null ? "COMPLETED" : "PENDING",
                        m.arrival() != null ? m.arrival().getFlightNumber() : null),
                journeyRow("Housing / MOM address", null, null, "HR",
                        m.arrival() != null && (m.arrival().isHousingConfirmed()
                                || Boolean.TRUE.equals(m.arrival().getMomAddressRegistered()))
                                ? "COMPLETED" : "PENDING", null)
        ));
        stageBlock(doc, "4", "Post-arrival compliance", AMBER, List.of(
                journeyRow("Medical examination", null, null, "HR",
                        m.co() != null ? enumName(m.co().getMedicalStatus()) : "—", null),
                journeyRow("Onboard programme", null, null, "HR",
                        m.co() != null ? enumName(m.co().getOnboardProgrammeStatus()) : "—", null),
                journeyRow("SIP", null, null, "HR",
                        m.co() != null ? enumName(m.co().getSipStatus()) : "—", null),
                journeyRow("Construction safety", null, null, "HR",
                        m.co() != null ? enumName(m.co().getConstructionSafetyStatus()) : "—", null),
                taskRow(m, "SG_TEMPORARY_PERMIT")
        ));
        stageBlock(doc, "5", "Safety & workplace preparation", CORAL, List.of(
                taskRow(m, "PPE_CONFIRM"),
                taskRow(m, "SG_PPE_PHOTO_VERIFIED"),
                taskRow(m, "INDUCTION"),
                journeyRow("PPE kit lines issued",
                        m.ppe().isEmpty() ? null : m.ppe().getFirst().getCreatedAt(), null, "HR",
                        m.ppe().isEmpty() ? "PENDING" : "COMPLETED",
                        m.ppe().size() + " item(s)")
        ));
        stageBlock(doc, "6", "Final employment activation", SUCCESS, List.of(
                taskRow(m, "ACCOUNT_ACTIVATE"),
                taskRow(m, "CONTRACT_ACK"),
                taskRow(m, "READY_TO_WORK"),
                journeyRow("Ready-to-work gate (SG rules)", null, null, "System",
                        m.sgReady() || m.readyToWork() ? "READY" : "BLOCKED",
                        m.readyBlockers().isEmpty() ? null : String.join("; ", m.readyBlockers()))
        ));
    }

    private void writeCompliance(Document doc, DossierModel m) throws DocumentException {
        section(doc, "06", "Singapore compliance register", "CMP", AMBER);
        doc.add(new Paragraph(
                "Applicability follows worker category / sector / foreign-worker flags and SG flow rules. "
                        + "N/A items are excluded from readiness.",
                smallFont(MUTED)));
        PdfPTable t = new PdfPTable(5);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{2.2f, 0.9f, 1.1f, 1.1f, 1.4f});
        headerRow(t, AMBER, "Requirement", "Applicable", "Status", "Completed", "Evidence");

        boolean foreign = m.co() != null && m.co().isForeignWorker();
        addComp(t, "MOM / work pass record", foreign || hasText(m.employee().getWorkPassType()),
                workPermitStatus(m), date(m.wp() != null ? m.wp().getWpIssueDate() : null),
                m.wp() != null ? nz(m.wp().getWpNumber()) : "—");
        addComp(t, "IPA record", foreign || (m.wp() != null && hasText(m.wp().getIpaNumber())),
                ipaStatus(m.wp()), date(m.wp() != null ? m.wp().getIpaIssueDate() : null),
                m.wp() != null ? nz(m.wp().getIpaNumber()) : "—");
        addComp(t, "Medical examination", true,
                m.co() != null ? enumName(m.co().getMedicalStatus()) : "PENDING",
                null, "Programmes form");
        addComp(t, "SIP attendance", true,
                m.co() != null ? enumName(m.co().getSipStatus()) : "PENDING", null, "Programmes form");
        addComp(t, "Onboard programme", true,
                m.co() != null ? enumName(m.co().getOnboardProgrammeStatus()) : "PENDING", null, "Programmes form");
        addComp(t, "Medical insurance", foreign,
                m.arrival() != null && (m.arrival().isInsuranceArranged()
                        || Boolean.TRUE.equals(m.arrival().getMedicalInsuranceRecorded()))
                        ? "Compliant" : (foreign ? "Pending" : "N/A"),
                null, "Arrival record");
        addComp(t, "Security bond", foreign,
                m.arrival() != null && (m.arrival().isBondArranged()
                        || Boolean.TRUE.equals(m.arrival().getSecurityBondPurchased()))
                        ? "Compliant" : (foreign ? "Pending" : "N/A"),
                null, "Arrival record");
        addComp(t, "Housing / MOM address", foreign,
                m.arrival() != null && (m.arrival().isHousingConfirmed()
                        || Boolean.TRUE.equals(m.arrival().getMomAddressRegistered()))
                        ? "Compliant" : (foreign ? "Pending" : "N/A"),
                null, nz(m.arrival() != null ? m.arrival().getAccommodationAddress() : null));
        addComp(t, "Primary Care Plan", foreign,
                m.arrival() != null && Boolean.TRUE.equals(m.arrival().getPcpRecorded())
                        ? "Compliant" : (foreign ? "Pending / check rules" : "N/A"),
                null, "Arrival record");
        addComp(t, "Construction safety",
                m.co() != null && m.co().getConstructionSafetyStatus() != null, true,
                m.co() != null ? enumName(m.co().getConstructionSafetyStatus()) : "—",
                null, "Programmes form");
        addComp(t, "Employment contract acknowledgement", true,
                taskStatusLabel(findTask(m, "CONTRACT_ACK")),
                dateTime(findTask(m, "CONTRACT_ACK") != null
                        ? findTask(m, "CONTRACT_ACK").getCompletedAt() : null),
                "Employee ESS / secure link");
        addComp(t, "PPE photo HR verification", true,
                m.co() != null && m.co().getPpeHrVerifiedAt() != null ? "Compliant" : "Awaiting verification",
                dateTime(m.co() != null ? m.co().getPpeHrVerifiedAt() : null),
                "PPE receipt photo");
        doc.add(t);
    }

    private void writeArrival(Document doc, DossierModel m) throws DocumentException {
        section(doc, "07", "Arrival & housing record", "ARR", DUSTY_BLUE);
        ArrivalRecordEntity a = m.arrival();
        PdfPTable t = twoCol();
        addPair(t, "Planned arrival", a != null ? date(a.getPlannedArrivalDate()) : "—",
                "Actual arrival", a != null ? date(a.getActualArrivalDate()) : "—");
        addPair(t, "Flight number", a != null ? nz(a.getFlightNumber()) : "—",
                "Airport", a != null ? nz(a.getArrivalAirport()) : "—");
        addPair(t, "Accommodation", a != null ? nz(a.getAccommodationAddress()) : "—",
                "Accommodation type", a != null ? nz(a.getAccommodationType()) : "—");
        addPair(t, "Housing confirmed", a != null ? yesNo(a.isHousingConfirmed()) : "—",
                "Employee confirmed arrival", a != null ? yesNo(a.isEmployeeConfirmed()) : "—");
        addPair(t, "MOM address registered", a != null ? yesNo(a.getMomAddressRegistered()) : "—",
                "Security bond purchased", a != null ? yesNo(a.getSecurityBondPurchased() != null
                        ? a.getSecurityBondPurchased() : a.isBondArranged()) : "—");
        addPair(t, "Medical insurance", a != null ? yesNo(a.getMedicalInsuranceRecorded() != null
                        ? a.getMedicalInsuranceRecorded() : a.isInsuranceArranged()) : "—",
                "Primary Care Plan", a != null ? yesNo(a.getPcpRecorded()) : "—");
        addPair(t, "Quarantine status", m.co() != null ? enumName(m.co().getQuarantineStatus()) : "—",
                "Notes", a != null ? nz(a.getNotes()) : "—");
        doc.add(t);
    }

    private void writePayroll(Document doc, DossierModel m) throws DocumentException {
        section(doc, "08", "Payroll & compensation", "PAY", FOREST);
        boolean complete = m.mode() == EmployeeDossierExportMode.COMPLETE;
        PdfPTable t = twoCol();
        addPair(t, "Basic salary", money(m.employee().getBasicPay(), m.employee().getCurrency()),
                "Salary period", nz(m.employee().getSalaryPeriod()));
        addPair(t, "Overtime rate", money(m.employee().getOvertimeRate(), m.employee().getCurrency()),
                "Allowances total", money(m.employee().getAllowancesTotal(), m.employee().getCurrency()));
        addPair(t, "Payment mode", nz(m.employee().getPaymentMode()),
                "Payroll start date", date(m.employee().getPayrollStartDate()));
        doc.add(t);

        spacer(doc, 6);
        doc.add(new Paragraph("RESTRICTED BANKING", subtitleFont(CORAL)));
        if (!complete) {
            doc.add(new Paragraph(
                    "Bank account details are excluded from Employee Record Copy exports.",
                    smallFont(MUTED)));
        } else {
            PdfPTable bank = twoCol();
            String mode = m.employee().getPaymentMode();
            boolean inHand = mode != null && mode.toUpperCase().contains("IN_HAND");
            addPair(bank, "Bank name",
                    inHand ? "N/A — paid in-hand" : nz(m.employee().getBankName()),
                    "Bank account (masked)",
                    inHand ? "N/A — paid in-hand" : firstNonBlank(
                            m.employee().getBankAccountMasked(),
                            m.employee().getBankAccountNumberMasked(),
                            "— (no masked account on file)"));
            doc.add(bank);
            doc.add(new Paragraph(
                    "Full unmasked account numbers are never embedded in dossier exports.",
                    smallFont(MUTED)));
        }
    }

    private void writeDocumentVault(Document doc, DossierModel m) throws DocumentException {
        section(doc, "09", "Document vault & attachments", "DOC", SLATE);
        if (m.docs().isEmpty()) {
            doc.add(new Paragraph("No onboarding documents on file.", bodyFont(MUTED)));
            return;
        }
        PdfPTable t = new PdfPTable(6);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{1.6f, 1.3f, 1.4f, 0.7f, 1.1f, 1f});
        headerRow(t, SLATE, "Document", "Category", "Uploaded by", "Ver.", "Status", "Expiry");
        for (OnboardingDocumentEntity d : m.docs()) {
            t.addCell(cell(nz(d.getFileName())));
            t.addCell(cell(d.getDocType() != null ? d.getDocType().name() : "—"));
            t.addCell(cell(userLabel(m, d.getUploadedByUserId())));
            t.addCell(center(String.valueOf(d.getVersionNo())));
            t.addCell(statusPill(nz(d.getApprovalStatus())));
            t.addCell(cell(date(d.getExpiryDate())));
        }
        doc.add(t);

        spacer(doc, 6);
        doc.add(new Paragraph("ATTACHMENT INDEX", subtitleFont(SLATE)));
        PdfPTable idx = new PdfPTable(3);
        idx.setWidthPercentage(100);
        headerRow(idx, SLATE, "File", "Type", "Embedding");
        for (AttachmentBytes a : m.imageAttachments()) {
            idx.addCell(cell(a.fileName()));
            idx.addCell(cell(a.docType()));
            idx.addCell(cell("Image pages appended"));
        }
        for (AttachmentBytes a : m.pdfAttachments()) {
            idx.addCell(cell(a.fileName()));
            idx.addCell(cell(a.docType()));
            idx.addCell(cell("Merged PDF appendix"));
        }
        if (m.imageAttachments().isEmpty() && m.pdfAttachments().isEmpty()) {
            idx.addCell(cell("—"));
            idx.addCell(cell("—"));
            idx.addCell(cell("No embeddable binaries located on disk"));
        }
        doc.add(idx);
    }

    private void writeAudit(Document doc, DossierModel m) throws DocumentException {
        section(doc, "10", "Audit trail & approval history", "AUD", PLUM);
        if (m.audits().isEmpty()) {
            doc.add(new Paragraph("No onboarding audit events recorded.", bodyFont(MUTED)));
            return;
        }
        PdfPTable t = new PdfPTable(5);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{1.3f, 1.4f, 1.1f, 1.1f, 1.6f});
        headerRow(t, PLUM, "Date & time (SGT)", "Activity", "From", "To", "Performed by / remarks");
        int limit = Math.min(m.audits().size(), 80);
        for (int i = 0; i < limit; i++) {
            OnboardingAuditLogEntity a = m.audits().get(i);
            t.addCell(cell(dateTime(a.getCreatedAt())));
            t.addCell(cell(nz(a.getAction())));
            t.addCell(cell(nz(a.getFromStatus())));
            t.addCell(cell(nz(a.getToStatus())));
            t.addCell(cell(userLabel(m, a.getActorUserId())
                    + (a.getDetails() != null && !a.getDetails().isBlank()
                    ? " · " + a.getDetails() : "")));
        }
        doc.add(t);
        if (m.audits().size() > limit) {
            doc.add(new Paragraph(
                    "Showing latest " + limit + " of " + m.audits().size() + " audit events.",
                    smallFont(MUTED)));
        }
    }

    private void writeFinalSummary(Document doc, DossierModel m) throws DocumentException {
        section(doc, "11", "Final employee record summary", "SUM", NAVY);
        EmployeeDossierService.TaskStats s = m.stats();
        PdfPTable t = twoCol();
        addPair(t, "Overall employment status", enumName(m.employee().getEmploymentStatus()),
                "Overall onboarding status", onboardingStatus(m));
        addPair(t, "Applicable tasks", String.valueOf(s.applicable()),
                "Completed tasks", String.valueOf(s.completed()));
        addPair(t, "Pending tasks", String.valueOf(s.pending()),
                "Blocked / rejected tasks", String.valueOf(s.rejected()));
        addPair(t, "Ready-to-work (pipeline)", m.readyToWork() ? "Approved (READY_TO_WORK)" : "Not approved",
                "Ready-to-work (SG gate)", m.sgReady() ? "Gates satisfied" : "Gates incomplete");
        addPair(t, "Checklist progress (gate %)", s.completionPercent() + "%",
                "Last employee update", dateTime(m.employee().getUpdatedAt()));
        doc.add(t);

        spacer(doc, 6);
        doc.add(new Paragraph("OUTSTANDING ACTION REGISTER", subtitleFont(CORAL)));
        doc.add(new Paragraph(
                "Ready-to-work is never inferred from 100% checklist alone — the approval gate and business rules apply.",
                smallFont(MUTED)));
        PdfPTable actions = new PdfPTable(5);
        actions.setWidthPercentage(100);
        headerRow(actions, CORAL, "Priority", "Outstanding action", "Responsible", "Due", "Status");
        List<String[]> rows = new ArrayList<>();
        for (String b : m.readyBlockers()) {
            rows.add(new String[]{"High", b, "HR / Employee", "—", "Open"});
        }
        for (OnboardingTaskEntity task : m.tasks()) {
            if (!task.isApplies() || task.getStatus() == OnboardingTaskStatus.NOT_APPLICABLE
                    || task.getStatus() == OnboardingTaskStatus.COMPLETED) {
                continue;
            }
            rows.add(new String[]{
                    task.isMandatory() ? "High" : "Medium",
                    task.getTitle(),
                    "HR / Employee",
                    date(task.getDueDate()),
                    enumName(task.getStatus())
            });
        }
        LocalDate today = LocalDate.now(SG);
        if (m.employee().getWorkPassExpiry() != null
                && !EmployeeDossierService.expiryStatus(m.employee().getWorkPassExpiry(), today).equals("VALID")) {
            rows.add(new String[]{"High", "Work pass expiry attention ("
                    + EmployeeDossierService.expiryStatus(m.employee().getWorkPassExpiry(), today) + ")",
                    "HR Compliance", date(m.employee().getWorkPassExpiry()), "Open"});
        }
        if (rows.isEmpty()) {
            rows.add(new String[]{"—", "No outstanding actions from current gates/tasks", "—", "—", "Clear"});
        }
        for (String[] r : rows) {
            actions.addCell(priorityPill(r[0]));
            actions.addCell(cell(r[1]));
            actions.addCell(cell(r[2]));
            actions.addCell(cell(r[3]));
            actions.addCell(statusPill(r[4]));
        }
        doc.add(actions);
    }

    private void writeImageAttachments(Document doc, DossierModel m) throws DocumentException {
        if (m.imageAttachments().isEmpty()) {
            return;
        }
        section(doc, "12", "Embedded image attachments", "IMG", TEAL);
        for (AttachmentBytes att : m.imageAttachments()) {
            try {
                doc.newPage();
                doc.add(new Paragraph(att.docType() + " — " + att.fileName(), subtitleFont(TEAL)));
                Image img = Image.getInstance(att.bytes());
                float maxW = PageSize.A4.getWidth() - 84;
                float maxH = PageSize.A4.getHeight() - 140;
                img.scaleToFit(maxW, maxH);
                img.setAlignment(Element.ALIGN_CENTER);
                doc.add(img);
            } catch (Exception ex) {
                doc.add(new Paragraph(
                        "Could not embed image: " + att.fileName(),
                        smallFont(DANGER)));
            }
        }
    }

    private byte[] mergePdfAttachments(byte[] base, List<AttachmentBytes> pdfs) throws IOException {
        PDFMergerUtility merger = new PDFMergerUtility();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PDDocument master = Loader.loadPDF(new RandomAccessReadBuffer(base))) {
            for (AttachmentBytes att : pdfs) {
                try (PDDocument extra = Loader.loadPDF(new RandomAccessReadBuffer(att.bytes()))) {
                    merger.appendDocument(master, extra);
                } catch (Exception ex) {
                    // skip corrupt/unsupported attachment; index already lists file name
                }
            }
            master.save(out);
        }
        return out.toByteArray();
    }

    /* -------------------- helpers -------------------- */

    private void stageBlock(Document doc, String num, String title, Color accent, List<String[]> rows)
            throws DocumentException {
        spacer(doc, 7);
        PdfPTable head = new PdfPTable(2);
        head.setWidthPercentage(100);
        head.setWidths(new float[]{0.1f, 0.9f});
        PdfPCell badge = new PdfPCell(new Phrase(num, titleFont(9, Color.WHITE)));
        badge.setBackgroundColor(accent);
        badge.setBorder(Rectangle.NO_BORDER);
        badge.setHorizontalAlignment(Element.ALIGN_CENTER);
        badge.setVerticalAlignment(Element.ALIGN_MIDDLE);
        badge.setPadding(6);
        head.addCell(badge);
        PdfPCell label = new PdfPCell(new Phrase("STAGE " + num + "  ·  " + title, titleFont(9, accent)));
        label.setBorder(Rectangle.NO_BORDER);
        label.setBackgroundColor(tint(accent, 0.92f));
        label.setPadding(6);
        head.addCell(label);
        doc.add(head);

        PdfPTable t = new PdfPTable(5);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{2.2f, 1.15f, 1.2f, 1.15f, 1.5f});
        headerRow(t, accent, "Activity", "Status", "Completed", "Owner", "Remarks / ref");
        for (String[] r : rows) {
            if (r == null) {
                continue;
            }
            t.addCell(cell(r[0]));
            t.addCell(statusPill(r[1]));
            t.addCell(cell(r[2]));
            t.addCell(cell(r[3]));
            t.addCell(cell(r[4]));
        }
        doc.add(t);
    }

    private String[] taskRow(DossierModel m, String code) {
        return taskRow(m, code, code);
    }

    private String[] taskRow(DossierModel m, String code, String altContains) {
        OnboardingTaskEntity t = findTask(m, code);
        if (t == null && altContains != null) {
            t = m.tasks().stream()
                    .filter(x -> x.getTaskCode() != null
                            && x.getTaskCode().toUpperCase().contains(altContains.toUpperCase()))
                    .findFirst()
                    .orElse(null);
        }
        if (t == null) {
            return new String[]{code, "Not seeded", "—", "—", "—"};
        }
        if (!t.isApplies() || t.getStatus() == OnboardingTaskStatus.NOT_APPLICABLE) {
            return new String[]{t.getTitle(), "N/A", "—", "—", "Not applicable"};
        }
        return new String[]{
                t.getTitle(),
                enumName(t.getStatus()),
                dateTime(t.getCompletedAt()),
                userLabel(m, t.getCompletedByUserId()),
                nz(t.getNotes())
        };
    }

    private String[] journeyRow(
            String name, Instant completedAt, LocalDate completedDate,
            String owner, String status, String remarks
    ) {
        String completed = completedAt != null ? dateTime(completedAt)
                : (completedDate != null ? date(completedDate) : "—");
        return new String[]{name, nz(status), completed, nz(owner), nz(remarks)};
    }

    private OnboardingTaskEntity findTask(DossierModel m, String code) {
        return m.tasks().stream()
                .filter(t -> code.equalsIgnoreCase(t.getTaskCode()))
                .findFirst()
                .orElse(null);
    }

    private void section(Document doc, String num, String title, String icon, Color accent)
            throws DocumentException {
        spacer(doc, 8);
        PdfPTable band = new PdfPTable(2);
        band.setWidthPercentage(100);
        band.setWidths(new float[]{0.12f, 0.88f});

        PdfPCell iconCell = new PdfPCell(new Phrase(icon, titleFont(8.5f, Color.WHITE)));
        iconCell.setBackgroundColor(accent);
        iconCell.setBorder(Rectangle.NO_BORDER);
        iconCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        iconCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        iconCell.setPaddingTop(9);
        iconCell.setPaddingBottom(9);
        band.addCell(iconCell);

        PdfPCell titleCell = new PdfPCell();
        titleCell.setBackgroundColor(NAVY);
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleCell.setBorderWidthLeft(3.5f);
        titleCell.setBorderColorLeft(accent);
        titleCell.setPadding(8);
        titleCell.addElement(new Paragraph("SECTION " + num + "   ·   " + title.toUpperCase(),
                titleFont(9.5f, Color.WHITE)));
        band.addCell(titleCell);
        doc.add(band);

        PdfPTable underline = new PdfPTable(1);
        underline.setWidthPercentage(100);
        PdfPCell line = new PdfPCell(new Phrase(" "));
        line.setFixedHeight(2.5f);
        line.setBackgroundColor(accent);
        line.setBorder(Rectangle.NO_BORDER);
        underline.addCell(line);
        doc.add(underline);
        spacer(doc, 5);
    }

    private PdfPTable twoCol() throws DocumentException {
        PdfPTable t = new PdfPTable(4);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{1.2f, 1.5f, 1.2f, 1.5f});
        return t;
    }

    private void addPair(PdfPTable t, String l1, String v1, String l2, String v2) {
        t.addCell(labelCell(l1));
        t.addCell(valueCell(v1));
        t.addCell(labelCell(l2));
        t.addCell(valueCell(v2));
    }

    private PdfPCell kv(String label, String value) {
        return kv(label, value, DUSTY_BLUE);
    }

    private PdfPCell kv(String label, String value, Color accent) {
        PdfPCell c = new PdfPCell();
        c.setBorderColor(TRACK);
        c.setBorderWidthLeft(3f);
        c.setBorderWidthTop(0.4f);
        c.setBorderWidthRight(0.4f);
        c.setBorderWidthBottom(0.4f);
        c.setBorderColorLeft(accent);
        c.setPadding(6);
        c.setBackgroundColor(LIGHT_GREY);
        c.addElement(new Paragraph(label.toUpperCase(), smallFont(MUTED)));
        c.addElement(new Paragraph(nz(value), bodyFont(NAVY)));
        return c;
    }

    private PdfPCell miniFact(String label, String value, Color accent) {
        PdfPCell c = new PdfPCell();
        c.setBorderColor(TRACK);
        c.setPadding(5);
        c.setBackgroundColor(Color.WHITE);
        Paragraph p = new Paragraph();
        p.add(new Chunk(label.toUpperCase() + "\n", smallFont(accent)));
        p.add(new Chunk(nz(value), bodyFont(NAVY)));
        c.addElement(p);
        return c;
    }

    private PdfPCell statusCard(String label, String value) {
        return statusCard(label, value, DUSTY_BLUE);
    }

    private PdfPCell statusCard(String label, String value, Color accent) {
        Tone tone = toneOf(value);
        PdfPCell c = new PdfPCell();
        c.setPadding(8);
        c.setBorderColor(TRACK);
        c.setBorderWidthLeft(3.5f);
        c.setBorderColorLeft(tone.fg());
        c.setBackgroundColor(tone.bg());
        c.addElement(new Paragraph(label.toUpperCase(), smallFont(accent)));
        c.addElement(new Paragraph(tone.mark() + "  " + nz(value), titleFont(8.5f, tone.fg())));
        return c;
    }

    private void headerRow(PdfPTable t, String... headers) {
        headerRow(t, DUSTY_BLUE, headers);
    }

    private void headerRow(PdfPTable t, Color accent, String... headers) {
        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h.toUpperCase(), smallFont(Color.WHITE)));
            c.setBackgroundColor(accent);
            c.setPadding(6);
            c.setBorderColor(accent);
            t.addCell(c);
        }
    }

    private PdfPCell cell(String text) {
        PdfPCell c = new PdfPCell(new Phrase(nz(text), bodyFont(NAVY)));
        c.setPadding(5);
        c.setBorderColor(TRACK);
        return c;
    }

    private PdfPCell center(String text) {
        PdfPCell c = cell(text);
        c.setHorizontalAlignment(Element.ALIGN_CENTER);
        return c;
    }

    private PdfPCell labelCell(String text) {
        PdfPCell c = new PdfPCell(new Phrase(text.toUpperCase(), smallFont(SLATE)));
        c.setBackgroundColor(LIGHT_GREY);
        c.setPadding(5);
        c.setBorderColor(TRACK);
        c.setBorderWidthLeft(2.5f);
        c.setBorderColorLeft(DUSTY_BLUE);
        return c;
    }

    private PdfPCell valueCell(String text) {
        PdfPCell c = new PdfPCell(new Phrase(nz(text), bodyFont(NAVY)));
        c.setPadding(5);
        c.setBorderColor(TRACK);
        c.setBackgroundColor(Color.WHITE);
        return c;
    }

    private PdfPCell metricCell(String text, Color color) {
        PdfPCell c = new PdfPCell(new Phrase(nz(text), titleFont(11, color)));
        c.setHorizontalAlignment(Element.ALIGN_CENTER);
        c.setPadding(7);
        c.setBackgroundColor(tint(color, 0.9f));
        c.setBorderColor(TRACK);
        return c;
    }

    private PdfPCell statusPill(String status) {
        Tone tone = toneOf(status);
        PdfPCell c = new PdfPCell(new Phrase(tone.mark() + " " + nz(status), titleFont(7.5f, tone.fg())));
        c.setBackgroundColor(tone.bg());
        c.setHorizontalAlignment(Element.ALIGN_CENTER);
        c.setPadding(5);
        c.setBorderColor(tone.bg());
        return c;
    }

    private PdfPCell priorityPill(String priority) {
        String p = priority == null ? "" : priority.toUpperCase();
        Color fg = MUTED;
        Color bg = NEUTRAL_BG;
        if (p.contains("HIGH")) {
            fg = DANGER;
            bg = DANGER_BG;
        } else if (p.contains("MEDIUM")) {
            fg = WARN;
            bg = WARN_BG;
        } else if (p.contains("LOW")) {
            fg = SUCCESS;
            bg = SUCCESS_BG;
        }
        PdfPCell c = new PdfPCell(new Phrase(nz(priority), titleFont(7.5f, fg)));
        c.setBackgroundColor(bg);
        c.setHorizontalAlignment(Element.ALIGN_CENTER);
        c.setPadding(5);
        c.setBorderColor(bg);
        return c;
    }

    private PdfPCell accentChip(Color color) {
        PdfPCell c = new PdfPCell(new Phrase(" "));
        c.setFixedHeight(3.5f);
        c.setBackgroundColor(color);
        c.setBorder(Rectangle.NO_BORDER);
        return c;
    }

    private void addMonRow(PdfPTable t, String docName, String ref, LocalDate expiry, LocalDate today) {
        String status = EmployeeDossierService.expiryStatus(expiry, today);
        t.addCell(cell(docName));
        t.addCell(cell(nz(ref)));
        t.addCell(cell(date(expiry)));
        t.addCell(statusPill(status));
    }

    private void addComp(
            PdfPTable t, String req, boolean applicable, String status,
            String completed, String evidence
    ) {
        t.addCell(cell(req));
        t.addCell(statusPill(applicable ? "Yes" : "No"));
        t.addCell(statusPill(applicable ? nz(status) : "N/A"));
        t.addCell(cell(nz(completed)));
        t.addCell(cell(nz(evidence)));
    }

    private void addComp(
            PdfPTable t, String req, boolean applicableFlag, boolean forceApplicable,
            String status, String completed, String evidence
    ) {
        addComp(t, req, applicableFlag || forceApplicable, status, completed, evidence);
    }

    private void spacer(Document doc, float pt) throws DocumentException {
        Paragraph p = new Paragraph(" ");
        p.setSpacingBefore(pt);
        doc.add(p);
    }

    private static Font titleFont(float size, Color color) {
        return FontFactory.getFont(FontFactory.HELVETICA_BOLD, size, color);
    }

    private static Font subtitleFont() {
        return subtitleFont(DUSTY_BLUE);
    }

    private static Font subtitleFont(Color color) {
        return FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.5f, color);
    }

    private static Font bodyFont(Color color) {
        return FontFactory.getFont(FontFactory.HELVETICA, 8.5f, color);
    }

    private static Font smallFont(Color color) {
        return FontFactory.getFont(FontFactory.HELVETICA, 7.5f, color);
    }

    private static Color progressColor(int pct) {
        if (pct >= 85) {
            return SUCCESS;
        }
        if (pct >= 50) {
            return DUSTY_BLUE;
        }
        if (pct >= 25) {
            return AMBER;
        }
        return CORAL;
    }

    private static Color tint(Color base, float lighten) {
        int r = Math.min(255, (int) (base.getRed() + (255 - base.getRed()) * lighten));
        int g = Math.min(255, (int) (base.getGreen() + (255 - base.getGreen()) * lighten));
        int b = Math.min(255, (int) (base.getBlue() + (255 - base.getBlue()) * lighten));
        return new Color(r, g, b);
    }

    private static Tone toneOf(String value) {
        String u = value == null ? "" : value.toUpperCase();
        if (u.contains("NOT READY") || u.contains("EXPIRED") || u.contains("INACTIVE") || u.contains("BLOCK")
                || u.contains("MISSING") || u.contains("REJECT") || u.contains("TERMINAT") || u.contains("FAIL")
                || u.equals("NO") || u.equals("OPEN") || u.contains("NONE")) {
            return new Tone(DANGER, DANGER_BG, "[!]");
        }
        if (u.contains("PENDING") || u.contains("PROGRESS") || u.contains("EXPIRING") || u.contains("WARN")
                || u.contains("AWAITING") || u.contains("NOT SEEDED") || u.contains("CHECK")) {
            return new Tone(WARN, WARN_BG, "[~]");
        }
        if (u.contains("N/A") || u.contains("NOT APPLICABLE") || u.equals("—") || u.equals("-")) {
            return new Tone(MUTED, NEUTRAL_BG, "[-]");
        }
        if (u.contains("ACTIVE") || u.equals("READY") || u.contains("APPROVED") || u.contains("VALID")
                || u.contains("COMPLETE") || u.contains("ISSUED") || u.equals("YES") || u.contains("GATES CLEAR")
                || u.contains("COMPLIANT") || u.contains("CLEAR") || u.contains("VERIFIED")
                || u.contains("UPLOADED") || u.contains("SENT") || u.contains("ACCEPTED")) {
            return new Tone(SUCCESS, SUCCESS_BG, "[OK]");
        }
        return new Tone(NAVY, LIGHT_GREY, "[i]");
    }

    private record Tone(Color fg, Color bg, String mark) {}

    private static String nz(String v) {
        return v == null || v.isBlank() ? "—" : v;
    }

    private static String enumName(Enum<?> e) {
        return e == null ? "—" : e.name();
    }

    private static String date(LocalDate d) {
        return d == null ? "—" : D.format(d);
    }

    private static String dateTime(Instant i) {
        return i == null ? "—" : DT.format(i);
    }

    private static String yesNo(Boolean v) {
        if (v == null) return "—";
        return v ? "Yes" : "No";
    }

    private static String yesNo(boolean v) {
        return v ? "Yes" : "No";
    }

    private static String money(java.math.BigDecimal amt, String currency) {
        if (amt == null) return "—";
        return (currency != null ? currency + " " : "") + amt.toPlainString();
    }

    private static String maskId(String id, EmployeeDossierExportMode mode) {
        if (id == null || id.isBlank()) return "—";
        if (mode == EmployeeDossierExportMode.EMPLOYEE_COPY && id.length() > 4) {
            return id.charAt(0) + "XXXX" + id.substring(id.length() - 3);
        }
        return id;
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    private static String firstNonBlank(String... vals) {
        for (String v : vals) {
            if (v != null && !v.isBlank()) return v;
        }
        return "—";
    }

    private static String firstDate(LocalDate a, LocalDate b) {
        return date(a != null ? a : b);
    }

    private static LocalDate firstDateObj(LocalDate a, LocalDate b) {
        return a != null ? a : b;
    }

    private static String accountStatus(DossierModel m) {
        if (m.account() == null) return "NOT_PROVISIONED";
        return m.account().isActive() ? "ACTIVE" : "INACTIVE";
    }

    private static String onboardingStatus(DossierModel m) {
        if (m.co() == null) return "No onboarding record";
        return m.co().getPipelineStatus() != null ? m.co().getPipelineStatus().name() : "—";
    }

    private static String workPermitStatus(DossierModel m) {
        if (m.wp() != null && hasText(m.wp().getWpNumber())) return "ISSUED";
        if (m.wp() != null && hasText(m.wp().getIpaNumber())) return "IPA_ONLY";
        if (hasText(m.employee().getWorkPassNumber())) return "RECORDED";
        return "MISSING";
    }

    private static String documentStatus(DossierModel m) {
        if (m.docs().isEmpty()) return "NONE";
        long pending = m.docs().stream()
                .filter(d -> d.getApprovalStatus() != null
                        && !d.getApprovalStatus().equalsIgnoreCase("APPROVED")
                        && !d.getApprovalStatus().equalsIgnoreCase("VERIFIED"))
                .count();
        return pending == 0 ? "VERIFIED / UPLOADED" : pending + " awaiting verification";
    }

    private static String readyStatus(DossierModel m) {
        if (m.readyToWork()) return "APPROVED";
        if (m.sgReady()) return "GATES CLEAR — AWAITING HR ACTION";
        return "NOT READY";
    }

    private static String ipaStatus(WorkPassRecordEntity wp) {
        if (wp == null || !hasText(wp.getIpaNumber())) return "MISSING";
        LocalDate today = LocalDate.now(SG);
        return "Recorded · " + EmployeeDossierService.expiryStatus(wp.getIpaExpiryDate(), today);
    }

    private static String taskStatusLabel(OnboardingTaskEntity t) {
        if (t == null) return "PENDING";
        if (!t.isApplies() || t.getStatus() == OnboardingTaskStatus.NOT_APPLICABLE) return "N/A";
        return enumName(t.getStatus());
    }

    private static String userLabel(DossierModel m, UUID userId) {
        if (userId == null) return "—";
        String email = m.userLabels().get(userId);
        return email != null ? email : userId.toString().substring(0, 8);
    }

    private static class FooterEvent extends PdfPageEventHelper {
        private final DossierModel model;

        FooterEvent(DossierModel model) {
            this.model = model;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            try {
                PdfPTable footer = new PdfPTable(3);
                footer.setTotalWidth(document.right() - document.left());
                footer.setWidths(new float[]{1.3f, 1.7f, 1f});
                Font f = smallFont(MUTED);
                footer.addCell(footCell("EYOTA WORKRIGHT", f, DUSTY_BLUE));
                footer.addCell(footCell("Confidential · Personnel · "
                        + nz(model.employee().getEmployeeCode()), f, MAUVE));
                footer.addCell(footCell("Page " + writer.getPageNumber()
                        + " / " + DOC_VERSION, f, SLATE));
                footer.writeSelectedRows(0, -1, document.left(), document.bottom() - 12, writer.getDirectContent());

                var cb = writer.getDirectContent();
                cb.setColorStroke(DUSTY_BLUE);
                cb.setLineWidth(1.1f);
                cb.moveTo(document.left(), document.top() + 10);
                cb.lineTo(document.right(), document.top() + 10);
                cb.stroke();
                cb.setColorStroke(MAUVE);
                cb.setLineWidth(0.5f);
                cb.moveTo(document.left(), document.top() + 7.5f);
                cb.lineTo(document.right(), document.top() + 7.5f);
                cb.stroke();
            } catch (Exception ignored) {
                // footer best-effort
            }
        }

        private PdfPCell footCell(String text, Font f, Color accent) {
            PdfPCell c = new PdfPCell(new Phrase(text, f));
            c.setBorder(Rectangle.TOP);
            c.setBorderColor(accent);
            c.setBorderWidthTop(1.2f);
            c.setPaddingTop(5);
            return c;
        }
    }

    public record AttachmentBytes(
            UUID id,
            String fileName,
            String docType,
            String contentType,
            byte[] bytes
    ) {}

    public record DossierModel(
            EmployeeDossierExportMode mode,
            String reportReference,
            Instant generatedAt,
            EmployeeEntity employee,
            AppUserEntity account,
            String managerName,
            CandidateOnboardingEntity co,
            ArrivalRecordEntity arrival,
            WorkPassRecordEntity wp,
            List<WorkPassApplicationEntity> apps,
            List<OnboardingTaskEntity> tasks,
            List<OnboardingDocumentEntity> docs,
            List<OnboardingAuditLogEntity> audits,
            List<PpeIssuanceEntity> ppe,
            EmployeeDossierService.TaskStats stats,
            boolean readyToWork,
            boolean sgReady,
            List<String> readyBlockers,
            Map<UUID, String> userLabels,
            List<AttachmentBytes> imageAttachments,
            List<AttachmentBytes> pdfAttachments
    ) {}
}
