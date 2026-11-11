import { jsPDF } from 'jspdf';
import { EmployeeDto } from '../services/employee-api.service';
import { OnboardingDetailDto } from '../services/onboarding-api.service';

type PdfCtx = {
  doc: jsPDF;
  y: number;
  pageW: number;
  margin: number;
  contentW: number;
};

const ACCENT: [number, number, number] = [15, 76, 117];
const MUTED: [number, number, number] = [100, 110, 120];
const LINE: [number, number, number] = [220, 226, 232];
const TEXT: [number, number, number] = [28, 35, 45];

function ensureSpace(ctx: PdfCtx, need: number): void {
  const pageH = ctx.doc.internal.pageSize.getHeight();
  if (ctx.y + need <= pageH - ctx.margin) {
    return;
  }
  ctx.doc.addPage();
  ctx.y = ctx.margin;
}

function sectionHeader(ctx: PdfCtx, icon: string, title: string): void {
  ensureSpace(ctx, 18);
  ctx.doc.setFillColor(...ACCENT);
  ctx.doc.roundedRect(ctx.margin, ctx.y, ctx.contentW, 9, 1.5, 1.5, 'F');
  ctx.doc.setTextColor(255, 255, 255);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(10);
  ctx.doc.text(`${icon}  ${title}`, ctx.margin + 4, ctx.y + 6.2);
  ctx.y += 14;
  ctx.doc.setTextColor(...TEXT);
}

function fieldRow(ctx: PdfCtx, label: string, value: string | null | undefined, col: 0 | 1): void {
  const colW = (ctx.contentW - 6) / 2;
  const x = ctx.margin + (col === 0 ? 0 : colW + 6);
  const display = value && String(value).trim() ? String(value) : '—';
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(7.5);
  ctx.doc.setTextColor(...MUTED);
  ctx.doc.text(label.toUpperCase(), x, ctx.y);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(9.5);
  ctx.doc.setTextColor(...TEXT);
  const lines = ctx.doc.splitTextToSize(display, colW - 2);
  ctx.doc.text(lines, x, ctx.y + 4.5);
}

function twoColPair(
  ctx: PdfCtx,
  left: [string, string | null | undefined],
  right: [string, string | null | undefined],
): void {
  ensureSpace(ctx, 16);
  fieldRow(ctx, left[0], left[1], 0);
  fieldRow(ctx, right[0], right[1], 1);
  ctx.y += 14;
}

function divider(ctx: PdfCtx): void {
  ensureSpace(ctx, 6);
  ctx.doc.setDrawColor(...LINE);
  ctx.doc.setLineWidth(0.3);
  ctx.doc.line(ctx.margin, ctx.y, ctx.margin + ctx.contentW, ctx.y);
  ctx.y += 6;
}

function yesNo(v: boolean | null | undefined): string {
  if (v == null) return '—';
  return v ? 'Yes' : 'No';
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('en-SG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return v;
  }
}

/**
 * Professional HR employee + onboarding profile PDF
 * (sectioned hierarchy, accent headers, two-column reference grid).
 */
export function downloadEmployeeProfilePdf(
  employee: EmployeeDto,
  onboarding: OnboardingDetailDto | null,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - margin * 2;
  const ctx: PdfCtx = { doc, y: margin, pageW, margin, contentW };

  // Brand header band
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('EYOTA Workright', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Employee & Onboarding Profile', margin, 19);
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleString('en-SG')}`, pageW - margin, 12, { align: 'right' });
  ctx.y = 36;

  // Hero identity
  doc.setTextColor(...TEXT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(employee.fullName || '—', margin, ctx.y);
  ctx.y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const roleLine = [
    employee.employeeCode,
    employee.designation,
    employee.department,
  ]
    .filter(Boolean)
    .join('  ·  ');
  doc.text(roleLine || '—', margin, ctx.y);
  ctx.y += 6;

  // Status pills
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const pills = [
    `Employment: ${employee.employmentStatus || '—'}`,
    `Account: ${employee.accountStatus || (employee.active ? 'ACTIVE' : 'INACTIVE')}`,
    onboarding
      ? `Pipeline: ${onboarding.pipelineStatus} (${onboarding.checklistProgress}%)`
      : 'Onboarding: not linked',
  ];
  let px = margin;
  for (const p of pills) {
    const tw = doc.getTextWidth(p) + 6;
    doc.setFillColor(236, 242, 247);
    doc.roundedRect(px, ctx.y, tw, 6, 1.2, 1.2, 'F');
    doc.setTextColor(...ACCENT);
    doc.text(p, px + 3, ctx.y + 4.2);
    px += tw + 3;
  }
  ctx.y += 12;
  divider(ctx);

  sectionHeader(ctx, '●', 'Personal & contact');
  twoColPair(ctx, ['Full name', employee.fullName], ['Employee code', employee.employeeCode]);
  twoColPair(ctx, ['Personal email', employee.personalEmail], ['Mobile', employee.mobile]);
  twoColPair(ctx, ['Date of birth', fmtDate(employee.dateOfBirth)], ['Gender', employee.gender]);
  twoColPair(ctx, ['Nationality', employee.nationality], ['Alt. contact', employee.alternativeContact]);
  twoColPair(ctx, ['Residential address', employee.residentialAddress], ['Work location', employee.workLocationMode]);

  sectionHeader(ctx, '●', 'Employment');
  twoColPair(ctx, ['Designation', employee.designation], ['Department', employee.department]);
  twoColPair(
    ctx,
    ['Employment type', employee.employmentType],
    ['Employment status', employee.employmentStatus],
  );
  twoColPair(
    ctx,
    ['Date of joining', fmtDate(employee.dateOfJoining)],
    ['Probation end', fmtDate(employee.probationEnd)],
  );
  twoColPair(
    ctx,
    ['Invitation email', employee.invitationEmailStatus],
    ['Login active', yesNo(employee.active)],
  );

  sectionHeader(ctx, '●', 'Work pass & identity');
  twoColPair(ctx, ['Work pass type', employee.workPassType], ['Work pass no.', employee.workPassNumber]);
  twoColPair(
    ctx,
    ['Work pass expiry', fmtDate(employee.workPassExpiry)],
    ['FIN', employee.finNumber],
  );
  twoColPair(
    ctx,
    ['Passport no.', employee.passportNumber],
    ['Passport expiry', fmtDate(employee.passportExpiry)],
  );

  if (onboarding) {
    sectionHeader(ctx, '●', 'Onboarding summary');
    twoColPair(
      ctx,
      ['Pipeline status', onboarding.pipelineStatus],
      ['Checklist progress', `${onboarding.checklistProgress}%`],
    );
    twoColPair(
      ctx,
      ['Foreign worker', yesNo(onboarding.foreignWorker)],
      ['Worker category', onboarding.workerCategory],
    );
    twoColPair(ctx, ['Sector', onboarding.sector], ['Account status', onboarding.accountStatus]);
    twoColPair(
      ctx,
      ['Medical', onboarding.medicalStatus],
      ['SIP', onboarding.sipStatus],
    );
    twoColPair(
      ctx,
      ['Onboard programme', onboarding.onboardProgrammeStatus],
      ['Quarantine', onboarding.quarantineStatus],
    );

    if (onboarding.arrival) {
      sectionHeader(ctx, '●', 'Arrival & housing');
      const a = onboarding.arrival;
      twoColPair(
        ctx,
        ['Planned arrival', fmtDate(a.plannedArrivalDate)],
        ['Actual arrival', fmtDate(a.actualArrivalDate)],
      );
      twoColPair(ctx, ['Flight', a.flightNumber], ['Airport', a.arrivalAirport]);
      twoColPair(
        ctx,
        ['Accommodation', a.accommodationAddress],
        ['Housing confirmed', yesNo(a.housingConfirmed)],
      );
      twoColPair(
        ctx,
        ['Bond arranged', yesNo(a.bondArranged)],
        ['Insurance arranged', yesNo(a.insuranceArranged)],
      );
      twoColPair(
        ctx,
        ['MOM address registered', yesNo(a.momAddressRegistered)],
        ['Security bond', yesNo(a.securityBondPurchased)],
      );
    }

    if (onboarding.workPass) {
      sectionHeader(ctx, '●', 'IPA / Work permit records');
      const w = onboarding.workPass;
      twoColPair(ctx, ['IPA number', w.ipaNumber], ['IPA expiry', fmtDate(w.ipaExpiryDate)]);
      twoColPair(ctx, ['WP number', w.wpNumber], ['WP expiry', fmtDate(w.wpExpiryDate)]);
      twoColPair(ctx, ['FIN', w.finNumber], ['Card collected', yesNo(w.cardCollected)]);
      twoColPair(ctx, ['TP number', w.tpNumber], ['TP valid', yesNo(w.tpValid)]);
    }

    if (onboarding.tasks?.length) {
      sectionHeader(ctx, '●', 'Checklist tasks');
      for (const t of onboarding.tasks) {
        ensureSpace(ctx, 7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...TEXT);
        const mark = t.status === 'COMPLETED' || t.status === 'DONE' ? '[x]' : '[ ]';
        const line = `${mark} ${t.title || t.taskCode} — ${t.status}`;
        doc.text(doc.splitTextToSize(line, contentW), margin, ctx.y);
        ctx.y += 6;
      }
      ctx.y += 2;
    }

    if (onboarding.documents?.length) {
      sectionHeader(ctx, '●', 'Document vault');
      for (const d of onboarding.documents) {
        ensureSpace(ctx, 7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...TEXT);
        doc.text(
          doc.splitTextToSize(`• ${d.docType} — ${d.fileName} (v${d.versionNo})`, contentW),
          margin,
          ctx.y,
        );
        ctx.y += 6;
      }
    }
  } else {
    sectionHeader(ctx, '●', 'Onboarding');
    ensureSpace(ctx, 10);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('No onboarding pipeline record linked to this employee.', margin, ctx.y);
    ctx.y += 8;
  }

  // Footer on each page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `Confidential — EYOTA HR  ·  Page ${i} of ${pages}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );
  }

  const safeName = (employee.employeeCode || employee.fullName || 'employee')
    .replace(/[^\w\-]+/g, '_');
  doc.save(`EYOTA_${safeName}_profile.pdf`);
}
