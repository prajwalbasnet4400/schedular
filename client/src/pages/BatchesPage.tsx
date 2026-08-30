import { useQuery } from '@tanstack/react-query';
import { ResourcePage, Field } from '../components/ResourcePage';
import { api } from '../api/client';
import type { Batch, Course, Program } from '@schedular/shared';

type Row = Batch & { program: Program; courses: { id: string; code: string; name: string }[] };
type Form = { programId: string; semester: number; section: string; studentCount: number; courseIds: string[] };

export function BatchesPage() {
  const { data: programs = [] } = useQuery({ queryKey: ['/programs'], queryFn: () => api.get<Program[]>('/programs') });
  const { data: courses = [] } = useQuery({ queryKey: ['/courses'], queryFn: () => api.get<Course[]>('/courses') });

  return (
    <ResourcePage<Row, Form>
      title="Batches"
      description="Student cohorts and the courses they take this semester. Student count drives the room-capacity constraint."
      endpoint="/batches"
      emptyForm={{ programId: '', semester: 1, section: 'A', studentCount: 40, courseIds: [] }}
      toForm={(b) => ({
        programId: b.programId, semester: b.semester, section: b.section,
        studentCount: b.studentCount, courseIds: b.courses.map((c) => c.id),
      })}
      rowKey={(b) => b.id}
      rowLabel={(b) => `${b.program?.code} Sem ${b.semester}${b.section}`}
      columns={[
        { header: 'Batch', render: (b) => <strong>{b.program?.code} Sem {b.semester}{b.section}</strong> },
        { header: 'Programme', render: (b) => b.program?.name ?? '-' },
        { header: 'Students', numeric: true, render: (b) => b.studentCount },
        { header: 'Courses', numeric: true, render: (b) => b.courses?.length ?? 0 },
      ]}
      renderForm={(form, update) => (
        <>
          <div className="grid-2">
            <Field label="Programme">
              <select value={form.programId} onChange={(e) => update({ programId: e.target.value })} required>
                <option value="">Select a programme</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Semester">
              <input type="number" min={1} max={12} value={form.semester} onChange={(e) => update({ semester: Number(e.target.value) })} required />
            </Field>
            <Field label="Section">
              <input value={form.section} onChange={(e) => update({ section: e.target.value })} maxLength={4} required />
            </Field>
            <Field label="Number of students">
              <input type="number" min={1} max={500} value={form.studentCount} onChange={(e) => update({ studentCount: Number(e.target.value) })} required />
            </Field>
          </div>
          <Field label={`Enrolled courses (${form.courseIds.length} selected)`}>
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: 10 }}>
              {courses.map((c) => (
                <label key={c.id} style={{ display: 'flex', gap: 8, fontWeight: 400, marginBottom: 5, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={form.courseIds.includes(c.id)}
                    onChange={(e) =>
                      update({
                        courseIds: e.target.checked
                          ? [...form.courseIds, c.id]
                          : form.courseIds.filter((id) => id !== c.id),
                      })
                    }
                  />
                  <span className="mono">{c.code}</span> {c.name}
                </label>
              ))}
            </div>
          </Field>
        </>
      )}
    />
  );
}
