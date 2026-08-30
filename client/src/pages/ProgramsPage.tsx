import { useQuery } from '@tanstack/react-query';
import { ResourcePage, Field } from '../components/ResourcePage';
import { api } from '../api/client';
import type { Department, Program } from '@schedular/shared';

type Row = Program & { department: Department };
type Form = { code: string; name: string; departmentId: string; totalSemesters: number };

export function ProgramsPage() {
  const { data: departments = [] } = useQuery({
    queryKey: ['/departments'],
    queryFn: () => api.get<Department[]>('/departments'),
  });

  return (
    <ResourcePage<Row, Form>
      title="Programs"
      description="Degree programmes offered by the college. Every student batch belongs to one programme."
      endpoint="/programs"
      emptyForm={{ code: '', name: '', departmentId: '', totalSemesters: 8 }}
      toForm={(p) => ({ code: p.code, name: p.name, departmentId: p.departmentId, totalSemesters: p.totalSemesters })}
      rowKey={(p) => p.id}
      rowLabel={(p) => p.name}
      columns={[
        { header: 'Code', render: (p) => <span className="mono">{p.code}</span> },
        { header: 'Name', render: (p) => p.name },
        { header: 'Department', render: (p) => p.department?.name ?? '-' },
        { header: 'Semesters', numeric: true, render: (p) => p.totalSemesters },
      ]}
      renderForm={(form, update) => (
        <div className="grid-2">
          <Field label="Code">
            <input value={form.code} onChange={(e) => update({ code: e.target.value })} placeholder="CSIT" required />
          </Field>
          <Field label="Name">
            <input value={form.name} onChange={(e) => update({ name: e.target.value })} required />
          </Field>
          <Field label="Department">
            <select value={form.departmentId} onChange={(e) => update({ departmentId: e.target.value })} required>
              <option value="">Select a department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Total semesters">
            <input type="number" min={1} max={12} value={form.totalSemesters}
              onChange={(e) => update({ totalSemesters: Number(e.target.value) })} required />
          </Field>
        </div>
      )}
    />
  );
}
