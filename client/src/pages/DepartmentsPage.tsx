import { ResourcePage, Field } from '../components/ResourcePage';
import type { Department } from '@schedular/shared';

export function DepartmentsPage() {
  return (
    <ResourcePage<Department, { code: string; name: string }>
      title="Departments"
      description="Academic departments. Courses, instructors and programmes are each attached to one."
      endpoint="/departments"
      emptyForm={{ code: '', name: '' }}
      toForm={(d) => ({ code: d.code, name: d.name })}
      rowKey={(d) => d.id}
      rowLabel={(d) => d.name}
      columns={[
        { header: 'Code', render: (d) => <span className="mono">{d.code}</span> },
        { header: 'Name', render: (d) => d.name },
      ]}
      renderForm={(form, update) => (
        <div className="grid-2">
          <Field label="Code">
            <input value={form.code} onChange={(e) => update({ code: e.target.value })} placeholder="DOCA" required />
          </Field>
          <Field label="Name">
            <input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Department of Computer Application" required />
          </Field>
        </div>
      )}
    />
  );
}
