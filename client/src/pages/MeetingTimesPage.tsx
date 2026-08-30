import { ResourcePage, Field } from '../components/ResourcePage';
import { DAYS, PERIODS_PER_DAY } from '@schedular/shared';
import type { Day, MeetingTime } from '@schedular/shared';

const DAY_NAMES: Record<Day, string> = {
  SUN: 'Sunday', MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday',
};

type Form = { day: Day; period: number; startTime: string; endTime: string };

export function MeetingTimesPage() {
  return (
    <ResourcePage<MeetingTime, Form>
      title="Time Slots"
      description="The weekly period grid. Sunday to Friday, following the Tribhuvan University morning shift; Saturday is a holiday."
      endpoint="/meeting-times"
      emptyForm={{ day: 'SUN', period: 1, startTime: '06:30', endTime: '07:30' }}
      toForm={(m) => ({ day: m.day, period: m.period, startTime: m.startTime, endTime: m.endTime })}
      rowKey={(m) => m.id}
      rowLabel={(m) => `${DAY_NAMES[m.day]} period ${m.period}`}
      columns={[
        { header: 'Day', render: (m) => DAY_NAMES[m.day] },
        { header: 'Period', numeric: true, render: (m) => m.period },
        { header: 'Time', render: (m) => <span className="mono">{m.startTime} - {m.endTime}</span> },
      ]}
      renderForm={(form, update) => (
        <div className="grid-2">
          <Field label="Day">
            <select value={form.day} onChange={(e) => update({ day: e.target.value as Day })}>
              {DAYS.map((d) => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
            </select>
          </Field>
          <Field label="Period">
            <input type="number" min={1} max={PERIODS_PER_DAY} value={form.period}
              onChange={(e) => update({ period: Number(e.target.value) })} required />
          </Field>
          <Field label="Start time">
            <input type="time" value={form.startTime} onChange={(e) => update({ startTime: e.target.value })} required />
          </Field>
          <Field label="End time">
            <input type="time" value={form.endTime} onChange={(e) => update({ endTime: e.target.value })} required />
          </Field>
        </div>
      )}
    />
  );
}
