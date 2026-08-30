/**
 * PDF export (FR5): "print-ready PDF ... formatted for immediate distribution to teachers
 * and students". One landscape page per batch, teacher or room.
 */
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import type { ScheduleRunDetail, TimetableView } from '@schedular/shared';
import { buildTimetableModel, formatCell } from './timetable-view';

const DAY_NAMES: Record<string, string> = {
  SUN: 'Sunday',
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
};

// pdfmake requires a font descriptor. The standard 14 PDF fonts are built into every
// reader, so using Helvetica keeps the output dependency-free and the file small.
const printer = new PdfPrinter({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
});

const LECTURE_FILL = '#eef4fb';
const LAB_FILL = '#fdf3e8';
const HEADER_FILL = '#1f3a5f';

export function buildPdf(detail: ScheduleRunDetail, view: TimetableView): PDFKit.PDFDocument {
  const model = buildTimetableModel(detail, view);
  const viewLabel = view.charAt(0).toUpperCase() + view.slice(1);

  const content: Content[] = [];

  model.sections.forEach((section, index) => {
    if (index > 0) content.push({ text: '', pageBreak: 'before' });

    content.push(
      { text: 'Academia International College', style: 'college' },
      { text: 'Weekly Class Timetable', style: 'heading' },
      { text: `${viewLabel} view - ${section.title}`, style: 'subheading' },
      { text: section.subtitle, style: 'muted', margin: [0, 0, 0, 10] },
    );

    const header: TableCell[] = [
      { text: 'Day', style: 'tableHeader' },
      ...model.periods.map((p) => ({
        text: `Period ${p.period}\n${p.label}`,
        style: 'tableHeader',
      })),
    ];

    const body: TableCell[][] = [header];

    model.days.forEach((day, dayIndex) => {
      const row: TableCell[] = [{ text: DAY_NAMES[day] ?? day, style: 'dayCell' }];
      model.periods.forEach((_, periodIndex) => {
        const entries = section.grid[dayIndex][periodIndex];
        const isLab = entries.some((e) => e.sessionType === 'LAB');
        row.push({
          text: formatCell(entries, view),
          style: 'sessionCell',
          fillColor: entries.length === 0 ? undefined : isLab ? LAB_FILL : LECTURE_FILL,
        });
      });
      body.push(row);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: ['auto', ...model.periods.map(() => '*')],
        body,
      },
      layout: {
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
      },
    });

    content.push({
      text: `Generated ${model.generatedAt}   |   ${model.summary}`,
      style: 'footer',
      margin: [0, 12, 0, 0],
    });
  });

  if (model.sections.length === 0) {
    content.push({ text: 'This timetable contains no scheduled sessions.', style: 'muted' });
  }

  const definition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [24, 28, 24, 28],
    defaultStyle: { font: 'Helvetica', fontSize: 8 },
    styles: {
      college: { fontSize: 13, bold: true, alignment: 'center' },
      heading: { fontSize: 10, alignment: 'center', margin: [0, 2, 0, 0] },
      subheading: { fontSize: 11, bold: true, alignment: 'center', margin: [0, 6, 0, 0] },
      muted: { fontSize: 8, color: '#666666', alignment: 'center' },
      tableHeader: { bold: true, color: '#ffffff', fillColor: HEADER_FILL, alignment: 'center', fontSize: 8 },
      dayCell: { bold: true, fontSize: 8, margin: [2, 10, 2, 10] },
      sessionCell: { fontSize: 7, alignment: 'center', margin: [1, 4, 1, 4] },
      footer: { fontSize: 6, color: '#999999', alignment: 'center' },
    },
    info: {
      title: `Timetable (${viewLabel} view)`,
      author: 'Automated College Timetable Generator',
      subject: 'Weekly class timetable',
    },
    footer: (currentPage, pageCount) => ({
      text: `Page ${currentPage} of ${pageCount}`,
      style: 'footer',
      margin: [0, 6, 0, 0],
    }),
    content,
  };

  return printer.createPdfKitDocument(definition);
}
