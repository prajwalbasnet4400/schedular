/**
 * Edit the college data the algorithm schedules: courses, teachers, rooms and batches.
 *
 * One generic table drives all four tabs: TABS says which columns each tab has, and
 * every edit produces a new CollegeData that App passes back to buildProblem (Step 1).
 * Nothing is saved; the data lives only in the page.
 */
import { useState } from 'react';
import type { CollegeData } from './data';

type ListKey = keyof CollegeData;

interface Column {
  field: string;
  label: string;
  /** `codes` is a comma-separated list of course codes. */
  type: 'text' | 'number' | 'codes';
  width?: number;
}

const TABS: { key: ListKey; label: string; columns: Column[]; blank: object }[] = [
  {
    key: 'courses',
    label: 'Courses',
    columns: [
      { field: 'code', label: 'Code', type: 'text', width: 110 },
      { field: 'name', label: 'Name', type: 'text' },
      { field: 'lecturesPerWeek', label: 'Lectures / week', type: 'number', width: 120 },
    ],
    blank: { code: '', name: '', lecturesPerWeek: 3 },
  },
  {
    key: 'teachers',
    label: 'Teachers',
    columns: [
      { field: 'name', label: 'Name', type: 'text', width: 220 },
      { field: 'courses', label: 'Can teach (course codes)', type: 'codes' },
    ],
    blank: { name: '', courses: [] },
  },
  {
    key: 'rooms',
    label: 'Rooms',
    columns: [
      { field: 'name', label: 'Name', type: 'text' },
      { field: 'capacity', label: 'Capacity', type: 'number', width: 120 },
    ],
    blank: { name: '', capacity: 40 },
  },
  {
    key: 'batches',
    label: 'Batches',
    columns: [
      { field: 'name', label: 'Name', type: 'text', width: 140 },
      { field: 'size', label: 'Students', type: 'number', width: 100 },
      { field: 'courses', label: 'Takes (course codes)', type: 'codes' },
    ],
    blank: { name: '', size: 30, courses: [] },
  },
];

/** A row of any tab, e.g. { name: 'A-101', capacity: 50 } for a room. */
type Row = Record<string, string | number | string[]>;

export function DataEditor({
  data,
  onChange,
  disabled,
}: {
  data: CollegeData;
  onChange: (data: CollegeData) => void;
  disabled: boolean;
}) {
  const [tab, setTab] = useState<ListKey>('courses');
  const { columns, blank } = TABS.find((t) => t.key === tab)!;
  const rows = data[tab] as unknown as Row[];


  /** Change one field of one row in the current tab. */
  const setCell = (i: number, field: string, value: Row[string]) => {
    const courses = tab === 'courses' ? rows : data.courses;
    const next = { ...data, [tab]: rows.map((row, j) => (j === i ? { ...row, [field]: value } : row)) };

    // Renaming a course code also renames it wherever teachers and batches refer to it --
    // unless another course already has that code, which would merge the two.
    const code = String(value);
    if (tab === 'courses' && field === 'code' && code && !courses.some((c) => c.code === code)) {
      replaceCode(next, String(rows[i].code), [code]);
    }
    onChange(next);
  };

  /** Delete a row. Deleting a course also removes it from teachers' and batches' lists. */
  const removeRow = (i: number) => {
    const next = { ...data, [tab]: rows.filter((_, j) => j !== i) };
    if (tab === 'courses') replaceCode(next, String(rows[i].code), []);
    onChange(next);
  };

  return (
    <div className="editor">
      <div className="controls">
        {TABS.map((t) => (
          <button key={t.key} className={t.key === tab ? '' : 'secondary'} onClick={() => setTab(t.key)}>
            {t.label} ({data[t.key].length})
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((c) => <th key={c.field} style={{ width: c.width }}>{c.label}</th>)}
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.field}>
                    <Cell column={c} value={row[c.field]} disabled={disabled} onChange={(v) => setCell(i, c.field, v)} />
                  </td>
                ))}
                <td>
                  <button className="secondary icon" title="Remove" disabled={disabled}
                    onClick={() => removeRow(i)}>
                    &times;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="secondary" disabled={disabled} onClick={() => onChange({ ...data, [tab]: [...rows, { ...blank } as Row] })}>
        + Add
      </button>
    </div>
  );
}

/** Replaces a course code in every teacher's and batch's course list (none = remove it). */
function replaceCode(data: CollegeData, old: string, replacement: string[]) {
  const swap = (codes: string[]) => codes.flatMap((c) => (c === old ? replacement : [c]));
  data.teachers = data.teachers.map((t) => ({ ...t, courses: swap(t.courses) }));
  data.batches = data.batches.map((b) => ({ ...b, courses: swap(b.courses) }));
}

/** One input box in the table, of the right kind for its column. */
function Cell({ column, value, disabled, onChange }: {
  column: Column;
  value: Row[string];
  disabled: boolean;
  onChange: (value: Row[string]) => void;
}) {
  if (column.type === 'number') {
    return <input type="number" min={0} value={value as number} disabled={disabled}
      onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))} />;
  }

  if (column.type === 'codes') {
    // Committed on blur, so a half-typed list (e.g. a trailing comma) is not rewritten while typing.
    const text = (value as string[]).join(', ');
    return <input key={text} defaultValue={text} disabled={disabled} placeholder="e.g. CSC311, CSC312"
      onBlur={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />;
  }

  // A course code is also committed on blur, so a rename happens once, not on every keystroke.
  if (column.field === 'code') {
    return <input key={value as string} defaultValue={value as string} disabled={disabled}
      onBlur={(e) => e.target.value.trim() !== value && onChange(e.target.value.trim())} />;
  }

  return <input value={value as string} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
}
