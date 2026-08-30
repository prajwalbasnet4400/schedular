/**
 * The weekly timetable rendered with AG-Grid.
 *
 * FR3: "The system shall display the generated timetable in an interactive grid interface
 * with filtering capability by teacher, batch, room and department. The grid shall visually
 * distinguish between lecture sessions and laboratory sessions using colour coding."
 *
 * Days are rows and periods are columns, which is how a timetable is read on a noticeboard.
 * Each cell holds a session object rather than a string, so a custom cell renderer can
 * colour-code it and show the three facts that matter -- course, who, and where -- without
 * the reader having to cross-reference anything.
 */
import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { DAYS, PERIODS_PER_DAY } from '@schedular/shared';
import type { Day, ScheduleRunDetail, TimetableView } from '@schedular/shared';

const DAY_NAMES: Record<Day, string> = {
  SUN: 'Sunday', MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday',
};

interface Session {
  courseCode: string;
  courseName: string;
  primary: string;
  secondary: string;
  sessionType: 'LECTURE' | 'LAB';
  isContinuation: boolean;
}

interface DayRow {
  day: string;
  [period: string]: string | Session[] | undefined;
}

function SessionCell(params: ICellRendererParams<DayRow>) {
  const sessions = params.value as Session[] | undefined;
  if (!sessions || sessions.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0' }}>
      {sessions.map((s, i) => (
        <div
          key={i}
          className={`session ${s.sessionType === 'LAB' ? 'lab' : 'lecture'}${s.isContinuation ? ' continuation' : ''}`}
          title={`${s.courseCode} - ${s.courseName}\n${s.primary}\n${s.secondary}`}
        >
          <span className="code">
            {s.courseCode}
            {s.sessionType === 'LAB' && ' (Lab)'}
            {s.isContinuation && ' cont.'}
          </span>
          <span className="meta">{s.primary}</span>
          <span className="meta">{s.secondary}</span>
        </div>
      ))}
    </div>
  );
}

export function TimetableGrid({
  detail,
  view,
  entityId,
}: {
  detail: ScheduleRunDetail;
  view: TimetableView;
  /** When set, only this batch / teacher / room is shown. */
  entityId: string | null;
}) {
  const { courses, instructors, rooms, batches, meetingTimes, programs } = detail.reference;

  const rowData = useMemo<DayRow[]>(() => {
    const courseById = new Map(courses.map((c) => [c.id, c]));
    const instructorById = new Map(instructors.map((i) => [i.id, i]));
    const roomById = new Map(rooms.map((r) => [r.id, r]));
    const batchById = new Map(batches.map((b) => [b.id, b]));
    const meetingTimeById = new Map(meetingTimes.map((m) => [m.id, m]));
    const programById = new Map((programs ?? []).map((p) => [p.id, p]));

    // The earliest period of a session group is the real cell; a two-period lab's second
    // row is flagged so it renders as a continuation rather than looking like a repeat.
    const firstSlotOfGroup = new Map<string, number>();
    for (const a of detail.assignments) {
      const mt = meetingTimeById.get(a.meetingTimeId);
      if (!mt) continue;
      const slot = DAYS.indexOf(mt.day) * PERIODS_PER_DAY + (mt.period - 1);
      const current = firstSlotOfGroup.get(a.sessionGroupId);
      if (current === undefined || slot < current) firstSlotOfGroup.set(a.sessionGroupId, slot);
    }

    const rows: DayRow[] = DAYS.map((day) => {
      const row: DayRow = { day: DAY_NAMES[day] };
      for (let p = 1; p <= PERIODS_PER_DAY; p++) row[`p${p}`] = [] as Session[];
      return row;
    });

    for (const a of detail.assignments) {
      if (entityId) {
        const key = view === 'batch' ? a.batchId : view === 'teacher' ? a.instructorId : a.roomId;
        if (key !== entityId) continue;
      }

      const mt = meetingTimeById.get(a.meetingTimeId);
      if (!mt) continue;
      const dayIndex = DAYS.indexOf(mt.day);
      if (dayIndex < 0) continue;

      const slot = dayIndex * PERIODS_PER_DAY + (mt.period - 1);
      const course = courseById.get(a.courseId);
      const batch = batchById.get(a.batchId);
      // Programme code included: six programmes each run a "Sem 5A".
      const batchLabel = batch
        ? `${programById.get(batch.programId)?.code ?? ''} Sem ${batch.semester}${batch.section}`.trim()
        : 'Batch';

      const session: Session = {
        courseCode: course?.code ?? '?',
        courseName: course?.name ?? 'Unknown course',
        primary:
          view === 'batch'
            ? (instructorById.get(a.instructorId)?.name ?? 'Unknown')
            : view === 'teacher'
              ? batchLabel
              : batchLabel,
        secondary:
          view === 'room'
            ? (instructorById.get(a.instructorId)?.name ?? 'Unknown')
            : (roomById.get(a.roomId)?.number ?? '?'),
        sessionType: a.sessionType,
        isContinuation: firstSlotOfGroup.get(a.sessionGroupId) !== slot,
      };

      (rows[dayIndex][`p${mt.period}`] as Session[]).push(session);
    }

    return rows;
  }, [detail, view, entityId, courses, instructors, rooms, batches, meetingTimes, programs]);

  const columnDefs = useMemo<ColDef<DayRow>[]>(() => {
    const periodColumns: ColDef<DayRow>[] = Array.from({ length: PERIODS_PER_DAY }, (_, i) => {
      const period = i + 1;
      const sample = meetingTimes.find((m) => m.period === period);
      return {
        field: `p${period}`,
        headerName: sample ? `Period ${period}\n${sample.startTime}-${sample.endTime}` : `Period ${period}`,
        cellRenderer: SessionCell,
        autoHeight: true,
        wrapHeaderText: true,
        autoHeaderHeight: true,
        flex: 1,
        minWidth: 140,
        sortable: false,
        filter: false,
        cellStyle: { padding: '3px', lineHeight: 1.3 },
      };
    });

    return [
      {
        field: 'day',
        headerName: 'Day',
        pinned: 'left',
        width: 110,
        sortable: false,
        filter: false,
        cellStyle: { fontWeight: 600, background: '#f7f9fb' },
      },
      ...periodColumns,
    ];
  }, [meetingTimes]);

  return (
    <div className="ag-theme-quartz" style={{ width: '100%' }}>
      <AgGridReact<DayRow>
        rowData={rowData}
        columnDefs={columnDefs}
        domLayout="autoHeight"
        headerHeight={54}
        suppressCellFocus
        defaultColDef={{ resizable: true }}
      />
    </div>
  );
}
