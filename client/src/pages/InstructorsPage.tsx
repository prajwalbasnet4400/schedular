import { useQuery } from '@tanstack/react-query';
import { ResourcePage, Field } from '../components/ResourcePage';
import { api } from '../api/client';
import { DAYS, PERIODS_PER_DAY } from '@schedular/shared';
import type { Course, Day, Department, MeetingTime } from '@schedular/shared';

const DAY_NAMES: Record<Day, string> = {
  SUN: 'Sun', MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri',
};

interface Row {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  department: Department;
  courses: { id: string; code: string; name: string }[];
  availability: { meetingTimeId: string }[];
}

type Form = {
  name: string; email: string; departmentId: string;
  qualifiedCourseIds: string[]; availableSlotIds: string[];
};

/**
 * Weekly availability editor (FR1: "teachers with subject expertise and availability").
 *
 * Thirty-six checkboxes in a vertical list is unusable, so availability is presented as
 * the week itself -- days down, periods across -- with click-to-toggle cells and
 * whole-row/whole-column shortcuts. Administrators think in terms of "Dr Sharma does not
 * come in on Friday", and this lets them express that in one click.
 */
function AvailabilityMatrix({
  meetingTimes,
  selected,
  onChange,
}: {
  meetingTimes: MeetingTime[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const byDayPeriod = new Map<string, MeetingTime>();
  for (const mt of meetingTimes) byDayPeriod.set(`${mt.day}:${mt.period}`, mt);
  const periods = Array.from({ length: PERIODS_PER_DAY }, (_, i) => i + 1);
  const selectedSet = new Set(selected);

  const toggle = (id: string) => {
    onChange(selectedSet.has(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const setMany = (ids: string[], value: boolean) => {
    const next = new Set(selected);
    for (const id of ids) {
      if (value) next.add(id);
      else next.delete(id);
    }
    onChange([...next]);
  };

  const idsForDay = (day: Day) =>
    periods.map((p) => byDayPeriod.get(`${day}:${p}`)?.id).filter((x): x is string => Boolean(x));

  return (
    <div className="scroll-x">
      <table className="availability">
        <thead>
          <tr>
            <th>Day</th>
            {periods.map((p) => {
              const sample = meetingTimes.find((m) => m.period === p);
              return (
                <th key={p}>
                  P{p}
                  {sample && <div style={{ fontWeight: 400, color: 'var(--muted)' }}>{sample.startTime}</div>}
                </th>
              );
            })}
            <th>All</th>
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => {
            const dayIds = idsForDay(day);
            const allOn = dayIds.length > 0 && dayIds.every((id) => selectedSet.has(id));
            return (
              <tr key={day}>
                <th>{DAY_NAMES[day]}</th>
                {periods.map((p) => {
                  const mt = byDayPeriod.get(`${day}:${p}`);
                  if (!mt) return <td key={p} style={{ background: '#f4f6f9' }} />;
                  const on = selectedSet.has(mt.id);
                  return (
                    <td key={p}>
                      <button
                        type="button"
                        className={on ? 'on' : ''}
                        onClick={() => toggle(mt.id)}
                        title={`${DAY_NAMES[day]} period ${p} (${mt.startTime}-${mt.endTime}) - ${on ? 'available' : 'unavailable'}`}
                      >
                        {on ? 'Free' : '-'}
                      </button>
                    </td>
                  );
                })}
                <td>
                  <button type="button" onClick={() => setMany(dayIds, !allOn)} title={allOn ? 'Clear this day' : 'Select this day'}>
                    {allOn ? 'Clear' : 'All'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="row" style={{ marginTop: 8 }}>
        <button type="button" className="small" onClick={() => onChange(meetingTimes.map((m) => m.id))}>
          Available all week
        </button>
        <button type="button" className="small" onClick={() => onChange([])}>
          Clear all
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          {selected.length} of {meetingTimes.length} slots available
        </span>
      </div>
    </div>
  );
}

export function InstructorsPage() {
  const { data: departments = [] } = useQuery({ queryKey: ['/departments'], queryFn: () => api.get<Department[]>('/departments') });
  const { data: courses = [] } = useQuery({ queryKey: ['/courses'], queryFn: () => api.get<Course[]>('/courses') });
  const { data: meetingTimes = [] } = useQuery({ queryKey: ['/meeting-times'], queryFn: () => api.get<MeetingTime[]>('/meeting-times') });

  return (
    <ResourcePage<Row, Form>
      title="Instructors"
      description="Teaching staff, the subjects they are qualified for, and the periods they are available. Both are hard constraints: the algorithm will never assign an unqualified or unavailable teacher."
      endpoint="/instructors"
      emptyForm={{ name: '', email: '', departmentId: '', qualifiedCourseIds: [], availableSlotIds: [] }}
      toForm={(i) => ({
        name: i.name,
        email: i.email,
        departmentId: i.departmentId,
        qualifiedCourseIds: i.courses.map((c) => c.id),
        availableSlotIds: i.availability.map((a) => a.meetingTimeId),
      })}
      rowKey={(i) => i.id}
      rowLabel={(i) => i.name}
      columns={[
        { header: 'Name', render: (i) => <strong>{i.name}</strong> },
        { header: 'Department', render: (i) => i.department?.code ?? '-' },
        { header: 'Qualified for', render: (i) => (
          <span className="mono">{i.courses?.map((c) => c.code).join(', ') || '-'}</span>
        ) },
        { header: 'Available slots', numeric: true, render: (i) => (
          <span className={i.availability?.length === 0 ? 'pill bad' : undefined}>
            {i.availability?.length ?? 0}
          </span>
        ) },
      ]}
      renderForm={(form, update) => (
        <>
          <div className="grid-2">
            <Field label="Full name">
              <input value={form.name} onChange={(e) => update({ name: e.target.value })} required />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} required />
            </Field>
            <Field label="Department">
              <select value={form.departmentId} onChange={(e) => update({ departmentId: e.target.value })} required>
                <option value="">Select a department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>

          <Field label={`Subjects this instructor can teach (${form.qualifiedCourseIds.length} selected)`}>
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: 10 }}>
              {courses.map((c) => (
                <label key={c.id} style={{ display: 'flex', gap: 8, fontWeight: 400, marginBottom: 5, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={form.qualifiedCourseIds.includes(c.id)}
                    onChange={(e) =>
                      update({
                        qualifiedCourseIds: e.target.checked
                          ? [...form.qualifiedCourseIds, c.id]
                          : form.qualifiedCourseIds.filter((id) => id !== c.id),
                      })
                    }
                  />
                  <span className="mono">{c.code}</span> {c.name}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Weekly availability">
            <AvailabilityMatrix
              meetingTimes={meetingTimes}
              selected={form.availableSlotIds}
              onChange={(availableSlotIds) => update({ availableSlotIds })}
            />
          </Field>
        </>
      )}
    />
  );
}
