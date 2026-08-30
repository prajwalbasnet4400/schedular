/** The generated timetable: three perspectives, filtering (FR3) and export (FR5). */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ScheduleRunDetail, TimetableView } from '@schedular/shared';
import { api, downloadFile } from '../api/client';
import { PageHeader } from '../components/Shell';
import { TimetableGrid } from '../components/TimetableGrid';

const VIEWS: { key: TimetableView; label: string; help: string }[] = [
  { key: 'batch', label: 'Batch view', help: 'What a group of students attends.' },
  { key: 'teacher', label: 'Teacher view', help: 'One instructor’s personal weekly schedule.' },
  { key: 'room', label: 'Room view', help: 'How a classroom or laboratory is occupied.' },
];

export function TimetablePage() {
  const [view, setView] = useState<TimetableView>('batch');
  const [entityId, setEntityId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: loadError } = useQuery({
    queryKey: ['/schedule/runs/latest'],
    queryFn: () => api.get<ScheduleRunDetail>('/schedule/runs/latest'),
    retry: false,
  });

  const options = useMemo(() => {
    if (!data) return [];
    const { batches, instructors, rooms, programs } = data.reference;
    if (view === 'batch') {
      // Without the programme code every programme's "Semester 5A" reads identically.
      const programById = new Map((programs ?? []).map((p) => [p.id, p]));
      return batches
        .map((b) => ({
          id: b.id,
          label: `${programById.get(b.programId)?.code ?? '?'} — Semester ${b.semester}${b.section} (${b.studentCount} students)`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    if (view === 'teacher') return instructors.map((i) => ({ id: i.id, label: i.name }));
    return rooms.map((r) => ({ id: r.id, label: `${r.number} - ${r.building} (${r.capacity})` }));
  }, [data, view]);

  const download = async (format: 'pdf' | 'xlsx') => {
    if (!data) return;
    setExporting(format);
    setError(null);
    try {
      await downloadFile(
        `/schedule/runs/${data.id}/export.${format}?view=${view}`,
        `timetable-${view}.${format}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Timetable" />
        <div className="page-body"><p className="muted">Loading the most recent timetable...</p></div>
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <PageHeader title="Timetable" />
        <div className="page-body">
          <div className="banner info">
            {loadError instanceof Error && loadError.message.includes('No timetable')
              ? 'No timetable has been generated yet.'
              : 'The timetable could not be loaded.'}{' '}
            <Link to="/generate">Generate one now.</Link>
          </div>
        </div>
      </>
    );
  }

  const selected = options.find((o) => o.id === entityId);

  return (
    <>
      <PageHeader
        title="Timetable"
        description={`Generated ${new Date(data.createdAt).toLocaleString()} by ${data.createdByName}. ${data.message ?? ''}`}
      />
      <div className="page-body">
        {error && <div className="banner error">{error}</div>}

        <div className="stat-row" style={{ marginBottom: 18 }}>
          <div className="stat">
            <div className="label">Hard violations</div>
            <div className={`value ${data.hardViolations === 0 ? 'good' : 'bad'}`}>{data.hardViolations}</div>
          </div>
          <div className="stat">
            <div className="label">Soft violations</div>
            <div className="value">{data.softViolations}</div>
          </div>
          <div className="stat">
            <div className="label">Fitness</div>
            <div className="value">{data.bestFitness.toFixed(6)}</div>
          </div>
          <div className="stat">
            <div className="label">Generations</div>
            <div className="value">{data.generationsRun}</div>
          </div>
          <div className="stat">
            <div className="label">Computation time</div>
            <div className="value">{(data.durationMs / 1000).toFixed(2)} s</div>
          </div>
          <div className="stat">
            <div className="label">Sessions placed</div>
            <div className="value">{data.assignments.length}</div>
          </div>
        </div>

        {data.hardViolations === 0 ? (
          <div className="banner success">
            This timetable satisfies every hard constraint: no teacher, room or batch is
            double-booked, no room is over capacity, no laboratory session is in a lecture hall,
            and no instructor is scheduled outside their declared availability.
          </div>
        ) : (
          <div className="banner error">
            This timetable still contains {data.hardViolations} hard-constraint violation(s) and is
            not safe to publish. Re-run with a larger population or more generations.
          </div>
        )}

        <div className="card">
          <div className="spread" style={{ marginBottom: 14 }}>
            <div className="row">
              {VIEWS.map((v) => (
                <button
                  key={v.key}
                  className={view === v.key ? 'primary' : ''}
                  onClick={() => { setView(v.key); setEntityId(null); }}
                  title={v.help}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="row">
              <button onClick={() => download('pdf')} disabled={exporting !== null}>
                {exporting === 'pdf' ? 'Preparing...' : 'Export PDF'}
              </button>
              <button onClick={() => download('xlsx')} disabled={exporting !== null}>
                {exporting === 'xlsx' ? 'Preparing...' : 'Export Excel'}
              </button>
            </div>
          </div>

          <div className="spread" style={{ marginBottom: 14 }}>
            <div style={{ minWidth: 280, flex: '1 1 280px' }}>
              <label htmlFor="entity">
                Filter by {view === 'batch' ? 'batch' : view === 'teacher' ? 'instructor' : 'room'}
              </label>
              <select id="entity" value={entityId ?? ''} onChange={(e) => setEntityId(e.target.value || null)}>
                <option value="">All {view === 'batch' ? 'batches' : view === 'teacher' ? 'instructors' : 'rooms'} (combined)</option>
                {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div className="legend">
              <span><span className="swatch lecture" />Lecture</span>
              <span><span className="swatch lab" />Laboratory</span>
            </div>
          </div>

          {!entityId && (
            <div className="banner info">
              Showing every session at once, so cells stack. Choose a specific{' '}
              {view === 'batch' ? 'batch' : view === 'teacher' ? 'instructor' : 'room'} above to read a
              single clean weekly schedule &mdash; that is the view teachers and students actually use.
            </div>
          )}

          {selected && <h3 style={{ marginTop: 0 }}>{selected.label}</h3>}

          <div className="scroll-x">
            <TimetableGrid detail={data} view={view} entityId={entityId} />
          </div>
        </div>
      </div>
    </>
  );
}
