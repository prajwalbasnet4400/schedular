import { useQuery } from '@tanstack/react-query';
import { ResourcePage, Field } from '../components/ResourcePage';
import { api } from '../api/client';
import type { Course, Department } from '@schedular/shared';

type Row = Course & { department: Department; instructors: { id: string; name: string }[] };
type Form = {
  code: string; name: string; creditHours: number;
  lecturesPerWeek: number; labsPerWeek: number;
  type: 'LECTURE' | 'LAB'; departmentId: string;
};

export function CoursesPage() {
  const { data: departments = [] } = useQuery({
    queryKey: ['/departments'],
    queryFn: () => api.get<Department[]>('/departments'),
  });

  return (
    <ResourcePage<Row, Form>
      title="Courses"
      description="Subjects with their weekly teaching load. Each required lecture or lab becomes one gene in the algorithm's chromosome."
      endpoint="/courses"
      emptyForm={{ code: '', name: '', creditHours: 3, lecturesPerWeek: 3, labsPerWeek: 0, type: 'LECTURE', departmentId: '' }}
      toForm={(c) => ({
        code: c.code, name: c.name, creditHours: c.creditHours,
        lecturesPerWeek: c.lecturesPerWeek, labsPerWeek: c.labsPerWeek,
        type: c.type, departmentId: c.departmentId,
      })}
      rowKey={(c) => c.id}
      rowLabel={(c) => `${c.code} ${c.name}`}
      columns={[
        { header: 'Code', render: (c) => <span className="mono">{c.code}</span> },
        { header: 'Name', render: (c) => c.name },
        { header: 'Type', render: (c) => (
          <span className={`pill ${c.type === 'LAB' ? 'lab' : 'lecture'}`}>{c.type === 'LAB' ? 'Lab' : 'Lecture'}</span>
        ) },
        { header: 'Credits', numeric: true, render: (c) => c.creditHours },
        { header: 'Lectures/wk', numeric: true, render: (c) => c.lecturesPerWeek },
        { header: 'Labs/wk', numeric: true, render: (c) => c.labsPerWeek },
        { header: 'Qualified staff', numeric: true, render: (c) => c.instructors?.length ?? 0 },
      ]}
      renderForm={(form, update) => (
        <>
          <div className="grid-2">
            <Field label="Code">
              <input value={form.code} onChange={(e) => update({ code: e.target.value })} placeholder="CSC311" required />
            </Field>
            <Field label="Name">
              <input value={form.name} onChange={(e) => update({ name: e.target.value })} required />
            </Field>
            <Field label="Department">
              <select value={form.departmentId} onChange={(e) => update({ departmentId: e.target.value })} required>
                <option value="">Select a department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => update({ type: e.target.value as 'LECTURE' | 'LAB' })}>
                <option value="LECTURE">Lecture only</option>
                <option value="LAB">Includes laboratory</option>
              </select>
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Credit hours">
              <input type="number" min={1} max={6} value={form.creditHours} onChange={(e) => update({ creditHours: Number(e.target.value) })} required />
            </Field>
            <Field label="Lectures per week">
              <input type="number" min={0} max={10} value={form.lecturesPerWeek} onChange={(e) => update({ lecturesPerWeek: Number(e.target.value) })} required />
            </Field>
            <Field label="Lab sessions per week (each occupies two consecutive periods)">
              <input type="number" min={0} max={5} value={form.labsPerWeek} onChange={(e) => update({ labsPerWeek: Number(e.target.value) })} required />
            </Field>
          </div>
        </>
      )}
    />
  );
}
