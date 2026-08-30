/**
 * Turns a flat list of assignments into the day x period grids the exports and the UI
 * render.
 *
 * FR5 asks for "separate sheets or pages for each batch, teacher and room view", and FR3
 * asks the on-screen grid for the same three perspectives. Building that pivot once, here,
 * keeps the Excel sheet, the PDF page and the browser grid showing identical content --
 * if they each did their own pivot, they would eventually disagree, and a timetable that
 * differs between the screen and the printout is worse than no timetable.
 */
import { DAYS, PERIODS_PER_DAY } from '@schedular/shared';
import type { Assignment, Day, ScheduleRunDetail, TimetableView } from '@schedular/shared';

export interface CellEntry {
  courseCode: string;
  courseName: string;
  instructorName: string;
  roomNumber: string;
  batchLabel: string;
  sessionType: 'LECTURE' | 'LAB';
  sessionGroupId: string;
  /** True for the second period of a two-period lab, which the grid merges upward. */
  isContinuation: boolean;
}

export interface TimetableSection {
  /** The entity this page/sheet belongs to: a batch, a teacher or a room. */
  key: string;
  title: string;
  subtitle: string;
  /** grid[dayIndex][periodIndex] -> the sessions in that cell (normally 0 or 1). */
  grid: CellEntry[][][];
}

export interface TimetableModel {
  view: TimetableView;
  periods: { period: number; label: string }[];
  days: Day[];
  sections: TimetableSection[];
  generatedAt: string;
  summary: string;
}

export function buildTimetableModel(detail: ScheduleRunDetail, view: TimetableView): TimetableModel {
  const { courses, instructors, rooms, batches, meetingTimes, programs } = detail.reference;

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const instructorById = new Map(instructors.map((i) => [i.id, i]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const batchById = new Map(batches.map((b) => [b.id, b]));
  const meetingTimeById = new Map(meetingTimes.map((m) => [m.id, m]));
  const programById = new Map((programs ?? []).map((p) => [p.id, p]));

  /**
   * Every programme runs a "Semester 5A", so the section alone names six different
   * cohorts. The programme code is what makes the label identify one batch.
   */
  const batchLabel = (batchId: string): string => {
    const batch = batchById.get(batchId);
    if (!batch) return 'Unknown batch';
    const code = programById.get(batch.programId)?.code;
    return `${code ? `${code} ` : ''}Sem ${batch.semester}${batch.section}`;
  };

  const periods = Array.from({ length: PERIODS_PER_DAY }, (_, i) => {
    const sample = meetingTimes.find((m) => m.period === i + 1);
    return {
      period: i + 1,
      label: sample ? `${sample.startTime} - ${sample.endTime}` : `Period ${i + 1}`,
    };
  });

  // A two-period lab appears as two assignment rows sharing a group id. The earlier one is
  // the real cell; the later is flagged so exports can render it as a continuation instead
  // of repeating the course name.
  const firstPeriodOfGroup = new Map<string, number>();
  for (const a of detail.assignments) {
    const mt = meetingTimeById.get(a.meetingTimeId);
    if (!mt) continue;
    const slot = DAYS.indexOf(mt.day) * PERIODS_PER_DAY + (mt.period - 1);
    const current = firstPeriodOfGroup.get(a.sessionGroupId);
    if (current === undefined || slot < current) firstPeriodOfGroup.set(a.sessionGroupId, slot);
  }

  const groupKeyOf = (a: Assignment): string =>
    view === 'batch' ? a.batchId : view === 'teacher' ? a.instructorId : a.roomId;

  const sectionsById = new Map<string, Assignment[]>();
  for (const a of detail.assignments) {
    const key = groupKeyOf(a);
    sectionsById.set(key, [...(sectionsById.get(key) ?? []), a]);
  }

  const titleFor = (key: string): { title: string; subtitle: string } => {
    if (view === 'batch') {
      const b = batchById.get(key);
      if (!b) return { title: 'Unknown batch', subtitle: '' };
      const program = programById.get(b.programId);
      return {
        title: batchLabel(key),
        subtitle: `${program?.name ?? 'Programme'} - ${b.studentCount} students`,
      };
    }
    if (view === 'teacher') {
      const i = instructorById.get(key);
      return i ? { title: i.name, subtitle: i.email } : { title: 'Unknown instructor', subtitle: '' };
    }
    const r = roomById.get(key);
    return r
      ? { title: r.number, subtitle: `${r.building} - capacity ${r.capacity} - ${r.type === 'LAB' ? 'Laboratory' : 'Lecture hall'}` }
      : { title: 'Unknown room', subtitle: '' };
  };

  const sections: TimetableSection[] = [...sectionsById.entries()]
    .map(([key, assignments]) => {
      const grid: CellEntry[][][] = DAYS.map(() =>
        Array.from({ length: PERIODS_PER_DAY }, () => [] as CellEntry[]),
      );

      for (const a of assignments) {
        const mt = meetingTimeById.get(a.meetingTimeId);
        if (!mt) continue;
        const dayIndex = DAYS.indexOf(mt.day);
        const periodIndex = mt.period - 1;
        if (dayIndex < 0 || periodIndex < 0) continue;

        const slot = dayIndex * PERIODS_PER_DAY + periodIndex;
        grid[dayIndex][periodIndex].push({
          courseCode: courseById.get(a.courseId)?.code ?? '?',
          courseName: courseById.get(a.courseId)?.name ?? 'Unknown course',
          instructorName: instructorById.get(a.instructorId)?.name ?? 'Unknown',
          roomNumber: roomById.get(a.roomId)?.number ?? '?',
          batchLabel: batchLabel(a.batchId),
          sessionType: a.sessionType,
          sessionGroupId: a.sessionGroupId,
          isContinuation: firstPeriodOfGroup.get(a.sessionGroupId) !== slot,
        });
      }

      const { title, subtitle } = titleFor(key);
      return { key, title, subtitle, grid };
    })
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));

  return {
    view,
    periods,
    days: [...DAYS],
    sections,
    generatedAt: new Date(detail.createdAt).toLocaleString('en-GB'),
    summary:
      `Fitness ${detail.bestFitness.toFixed(6)} - ${detail.hardViolations} hard and ` +
      `${detail.softViolations} soft constraint violations - ${detail.generationsRun} generations in ${detail.durationMs} ms`,
  };
}

/** One cell rendered as the two short lines that fit a printed timetable square. */
export function formatCell(entries: CellEntry[], view: TimetableView): string {
  if (entries.length === 0) return '';
  return entries
    .map((e) => {
      if (e.isContinuation) return `${e.courseCode} (cont.)`;
      const detail =
        view === 'batch'
          ? `${e.instructorName}\n${e.roomNumber}`
          : view === 'teacher'
            ? `${e.batchLabel}\n${e.roomNumber}`
            : `${e.batchLabel}\n${e.instructorName}`;
      const tag = e.sessionType === 'LAB' ? ' [LAB]' : '';
      return `${e.courseCode}${tag}\n${detail}`;
    })
    .join('\n---\n');
}
