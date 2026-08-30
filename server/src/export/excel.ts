/**
 * Excel export (FR5): "separate sheets or pages for each batch, teacher and room view".
 * One worksheet per entity, formatted so it prints on a single landscape page.
 */
import ExcelJS from 'exceljs';
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

const LECTURE_FILL = 'FFE8F1FB';
const LAB_FILL = 'FFFDF0E3';
const HEADER_FILL = 'FF1F3A5F';

export async function buildWorkbook(detail: ScheduleRunDetail, view: TimetableView): Promise<ExcelJS.Workbook> {
  const model = buildTimetableModel(detail, view);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Automated College Timetable Generator';
  workbook.created = new Date(detail.createdAt);

  // A summary sheet first, so the file is self-describing when it is emailed onward
  // without any accompanying explanation.
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [{ width: 32 }, { width: 60 }];
  summary.addRows([
    ['Automated College Timetable Generator', ''],
    ['Academia International College', ''],
    ['', ''],
    ['View', view.charAt(0).toUpperCase() + view.slice(1)],
    ['Generated', model.generatedAt],
    ['Fitness score', detail.bestFitness.toFixed(6)],
    ['Hard constraint violations', detail.hardViolations],
    ['Soft constraint violations', detail.softViolations],
    ['Generations', detail.generationsRun],
    ['Computation time (ms)', detail.durationMs],
    ['Sections in this workbook', model.sections.length],
  ]);
  summary.getRow(1).font = { bold: true, size: 14 };
  summary.getRow(2).font = { italic: true };
  summary.getColumn(1).font = { bold: true };

  // Excel forbids duplicate worksheet names outright, and truncation to 31 characters can
  // make two distinct titles collide even when the titles themselves differ. A numeric
  // suffix guarantees uniqueness rather than letting the export throw.
  const usedSheetNames = new Set<string>();
  const uniqueSheetName = (title: string): string => {
    const base = title.replace(/[:\\/?*[\]]/g, '-').slice(0, 31) || 'Sheet';
    if (!usedSheetNames.has(base)) {
      usedSheetNames.add(base);
      return base;
    }
    for (let n = 2; ; n++) {
      const suffix = ` (${n})`;
      const candidate = base.slice(0, 31 - suffix.length) + suffix;
      if (!usedSheetNames.has(candidate)) {
        usedSheetNames.add(candidate);
        return candidate;
      }
    }
  };

  for (const section of model.sections) {
    const sheetName = uniqueSheetName(section.title);
    const sheet = workbook.addWorksheet(sheetName, {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    });

    sheet.columns = [{ width: 14 }, ...model.periods.map(() => ({ width: 24 }))];

    const titleRow = sheet.addRow([section.title, ...model.periods.map(() => '')]);
    titleRow.font = { bold: true, size: 13 };
    sheet.mergeCells(titleRow.number, 1, titleRow.number, model.periods.length + 1);

    const subtitleRow = sheet.addRow([section.subtitle]);
    subtitleRow.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
    sheet.mergeCells(subtitleRow.number, 1, subtitleRow.number, model.periods.length + 1);

    sheet.addRow([]);

    const header = sheet.addRow(['Day / Period', ...model.periods.map((p) => `${p.period}\n${p.label}`)]);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    header.height = 30;
    header.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      cell.border = thinBorder();
    });

    model.days.forEach((day, dayIndex) => {
      const cells = model.periods.map((_, periodIndex) =>
        formatCell(section.grid[dayIndex][periodIndex], view),
      );
      const row = sheet.addRow([DAY_NAMES[day] ?? day, ...cells]);
      row.height = 46;
      row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      row.getCell(1).font = { bold: true };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

      row.eachCell((cell, colNumber) => {
        cell.border = thinBorder();
        if (colNumber === 1) return;
        // FR3 asks for lecture and laboratory sessions to be visually distinguished; the
        // exports carry the same colour coding as the on-screen grid.
        const entries = section.grid[dayIndex][colNumber - 2];
        if (entries.length === 0) return;
        const isLab = entries.some((e) => e.sessionType === 'LAB');
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isLab ? LAB_FILL : LECTURE_FILL },
        };
      });
    });

    sheet.addRow([]);
    const footer = sheet.addRow([`Generated ${model.generatedAt} - ${model.summary}`]);
    footer.font = { size: 8, color: { argb: 'FF888888' } };
  }

  return workbook;
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const side = { style: 'thin' as const, color: { argb: 'FFBBBBBB' } };
  return { top: side, left: side, bottom: side, right: side };
}
