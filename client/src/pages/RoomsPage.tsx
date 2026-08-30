import { ResourcePage, Field } from '../components/ResourcePage';
import type { Room } from '@schedular/shared';

type Form = { number: string; building: string; capacity: number; type: 'LECTURE_HALL' | 'LAB' };

export function RoomsPage() {
  return (
    <ResourcePage<Room, Form>
      title="Rooms"
      description="Classrooms and laboratories. Seating capacity is a hard constraint: a batch is never placed in a room too small for it."
      endpoint="/rooms"
      emptyForm={{ number: '', building: 'Main', capacity: 40, type: 'LECTURE_HALL' }}
      toForm={(r) => ({ number: r.number, building: r.building, capacity: r.capacity, type: r.type })}
      rowKey={(r) => r.id}
      rowLabel={(r) => r.number}
      columns={[
        { header: 'Room', render: (r) => <span className="mono">{r.number}</span> },
        { header: 'Building', render: (r) => r.building },
        { header: 'Type', render: (r) => (
          <span className={`pill ${r.type === 'LAB' ? 'lab' : 'lecture'}`}>
            {r.type === 'LAB' ? 'Laboratory' : 'Lecture hall'}
          </span>
        ) },
        { header: 'Capacity', numeric: true, render: (r) => r.capacity },
      ]}
      renderForm={(form, update) => (
        <div className="grid-2">
          <Field label="Room number">
            <input value={form.number} onChange={(e) => update({ number: e.target.value })} placeholder="A-101" required />
          </Field>
          <Field label="Building">
            <input value={form.building} onChange={(e) => update({ building: e.target.value })} required />
          </Field>
          <Field label="Seating capacity">
            <input type="number" min={1} max={500} value={form.capacity} onChange={(e) => update({ capacity: Number(e.target.value) })} required />
          </Field>
          <Field label="Type">
            <select value={form.type} onChange={(e) => update({ type: e.target.value as Form['type'] })}>
              <option value="LECTURE_HALL">Lecture hall</option>
              <option value="LAB">Laboratory</option>
            </select>
          </Field>
        </div>
      )}
    />
  );
}
