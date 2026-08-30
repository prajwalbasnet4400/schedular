/**
 * Run history and comparative analysis.
 *
 * Expected Outcome 5 promises "a documented analysis of the Genetic Algorithm's
 * performance, including fitness convergence graphs ... comparative analysis of different
 * parameter configurations (population size, mutation rate, crossover rate)". Because each
 * run stores its own parameter snapshot, that comparison is a table of real executions
 * rather than a hand-maintained spreadsheet.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { GAConfig, GenerationProgress, ScheduleRunDetail } from '@schedular/shared';
import { api } from '../api/client';
import { PageHeader } from '../components/Shell';

interface RunRow {
  id: string;
  status: string;
  config: GAConfig;
  bestFitness: number;
  generationsRun: number;
  durationMs: number;
  hardViolations: number;
  softViolations: number;
  createdAt: string;
  createdByName: string;
  message?: string;
}

export function AnalysisPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['/schedule/runs'],
    queryFn: () => api.get<RunRow[]>('/schedule/runs'),
  });

  const { data: detail } = useQuery({
    queryKey: ['/schedule/runs', selectedId],
    queryFn: () => api.get<ScheduleRunDetail>(`/schedule/runs/${selectedId}`),
    enabled: Boolean(selectedId),
  });

  const convergence: GenerationProgress[] = detail?.convergence ?? [];

  return (
    <>
      <PageHeader
        title="Performance Analysis"
        description="Every generation run is recorded with the parameters it used, so configurations can be compared directly. This is the evidence behind the Result Analysis chapter of the report."
      />
      <div className="page-body">
        <div className="card">
          <h3>Run history</h3>
          <p className="hint">Select a run to plot its convergence curve.</p>

          {isLoading ? (
            <p className="muted">Loading...</p>
          ) : runs.length === 0 ? (
            <p className="muted">No runs recorded yet.</p>
          ) : (
            <div className="scroll-x">
              <table className="data">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Status</th>
                    <th className="numeric">Pop.</th>
                    <th className="numeric">Mut.</th>
                    <th className="numeric">Cross.</th>
                    <th className="numeric">k</th>
                    <th className="numeric">Seed</th>
                    <th className="numeric">Gens</th>
                    <th className="numeric">Time</th>
                    <th className="numeric">Fitness</th>
                    <th className="numeric">Hard</th>
                    <th className="numeric">Soft</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      style={{
                        cursor: 'pointer',
                        background: selectedId === r.id ? '#eef4fb' : undefined,
                      }}
                    >
                      <td>{new Date(r.createdAt).toLocaleString()}</td>
                      <td>
                        <span className={`pill ${r.status === 'COMPLETED' && r.hardViolations === 0 ? 'ok' : 'bad'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="numeric">{r.config?.populationSize ?? '-'}</td>
                      <td className="numeric">{r.config?.mutationRate ?? '-'}</td>
                      <td className="numeric">{r.config?.crossoverRate ?? '-'}</td>
                      <td className="numeric">{r.config?.tournamentSize ?? '-'}</td>
                      <td className="numeric">{r.config?.seed ?? '-'}</td>
                      <td className="numeric">{r.generationsRun}</td>
                      <td className="numeric">{(r.durationMs / 1000).toFixed(2)} s</td>
                      <td className="numeric">{r.bestFitness.toFixed(6)}</td>
                      <td className="numeric">
                        <span className={r.hardViolations === 0 ? 'pill ok' : 'pill bad'}>{r.hardViolations}</span>
                      </td>
                      <td className="numeric">{r.softViolations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {detail && (
          <div className="card">
            <h3>Convergence &mdash; run {detail.id.slice(-6)}</h3>
            <p className="hint">{detail.message}</p>

            <div className="stat-row" style={{ marginBottom: 18 }}>
              <div className="stat">
                <div className="label">Final fitness</div>
                <div className="value">{detail.bestFitness.toFixed(6)}</div>
              </div>
              <div className="stat">
                <div className="label">Generations</div>
                <div className="value">{detail.generationsRun}</div>
              </div>
              <div className="stat">
                <div className="label">Time</div>
                <div className="value">{(detail.durationMs / 1000).toFixed(2)} s</div>
              </div>
              <div className="stat">
                <div className="label">Hard violations</div>
                <div className={`value ${detail.hardViolations === 0 ? 'good' : 'bad'}`}>{detail.hardViolations}</div>
              </div>
            </div>

            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={convergence} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                  <XAxis dataKey="generation" stroke="#8a97a6" fontSize={11} />
                  <YAxis stroke="#8a97a6" fontSize={11} width={72} tickFormatter={(v: number) => v.toFixed(4)} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} labelFormatter={(l) => `Generation ${l}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="bestFitness" name="Best fitness" stroke="#2f7ac7" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="averageFitness" name="Average fitness" stroke="#94a7bb" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <h3 style={{ marginTop: 22 }}>Constraint violations in the final timetable</h3>
            <div className="scroll-x">
              <table className="data">
                <thead>
                  <tr><th>Constraint</th><th>Kind</th><th className="numeric">Violations</th></tr>
                </thead>
                <tbody>
                  {detail.breakdown &&
                    Object.entries(detail.breakdown.counts).map(([key, count]) => {
                      const isHard = [
                        'teacherConflict', 'roomConflict', 'batchConflict', 'capacityViolation',
                        'roomTypeMismatch', 'instructorUnavailable', 'instructorUnqualified',
                      ].includes(key);
                      return (
                        <tr key={key}>
                          <td>{humanise(key)}</td>
                          <td>
                            <span className={`pill ${isHard ? 'bad' : 'lecture'}`}>{isHard ? 'Hard' : 'Soft'}</span>
                          </td>
                          <td className="numeric">
                            <span className={isHard && count > 0 ? 'pill bad' : undefined}>{count}</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function humanise(key: string): string {
  const words = key.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
