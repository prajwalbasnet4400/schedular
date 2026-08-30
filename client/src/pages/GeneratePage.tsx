/**
 * Timetable generation with a live convergence chart.
 *
 * FR4: "The system shall provide real-time feedback during schedule generation, displaying
 * the current generation number and fitness score so that administrators can monitor the
 * optimization progress."
 *
 * The chart is fed by a server-sent event stream, so the curve is drawn as the search
 * happens rather than replayed afterwards. This is also the screen that produces the
 * fitness convergence graph promised by Expected Outcome 5.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { DEFAULT_GA_CONFIG } from '@schedular/shared';
import type { FeasibilityReport, GAConfig, GenerationEvent, GenerationProgress } from '@schedular/shared';
import { api, ApiError, getToken } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/Shell';

type Status = 'idle' | 'validating' | 'running' | 'completed' | 'failed';

const PARAMETERS: { key: keyof GAConfig; label: string; step: number; min: number; max: number; help: string }[] = [
  { key: 'populationSize', label: 'Population size', step: 10, min: 10, max: 1000, help: 'Candidate timetables held in each generation.' },
  { key: 'maxGenerations', label: 'Maximum generations', step: 50, min: 1, max: 10000, help: 'Upper bound on evolutionary cycles.' },
  { key: 'crossoverRate', label: 'Crossover rate', step: 0.05, min: 0, max: 1, help: 'Share of offspring produced by recombination.' },
  { key: 'mutationRate', label: 'Mutation rate', step: 0.01, min: 0, max: 1, help: 'Per-gene probability of random reassignment.' },
  { key: 'tournamentSize', label: 'Tournament size (k)', step: 1, min: 2, max: 50, help: 'Candidates compared when choosing a parent.' },
  { key: 'elitismRate', label: 'Elitism rate', step: 0.05, min: 0, max: 0.9, help: 'Top fraction carried forward unchanged.' },
  { key: 'seed', label: 'Random seed', step: 1, min: 0, max: 999999, help: 'Fixes the random stream, making a run reproducible.' },
];

export function GeneratePage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [config, setConfig] = useState<GAConfig>(DEFAULT_GA_CONFIG);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<GenerationProgress[]>([]);
  const [latest, setLatest] = useState<GenerationProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [feasibility, setFeasibility] = useState<FeasibilityReport | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => () => sourceRef.current?.close(), []);

  const checkFeasibility = useCallback(async () => {
    setStatus('validating');
    setMessage(null);
    try {
      const report = await api.post<FeasibilityReport>('/schedule/validate');
      setFeasibility(report);
      setStatus('idle');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Validation failed.');
      setStatus('failed');
    }
  }, []);

  useEffect(() => {
    void checkFeasibility();
  }, [checkFeasibility]);

  const start = async () => {
    setStatus('running');
    setProgress([]);
    setLatest(null);
    setMessage(null);
    setRunId(null);

    try {
      const started = await api.post<{ runId: string; totalSessions: number }>('/schedule/generate', config);
      setRunId(started.runId);
      setTotalSessions(started.totalSessions);

      // EventSource cannot set an Authorization header, so the token travels as a query
      // parameter here; the server accepts that for GET requests only.
      const source = new EventSource(`/api/schedule/runs/${started.runId}/stream?token=${getToken()}`);
      sourceRef.current = source;

      source.onmessage = (event) => {
        const payload = JSON.parse(event.data) as GenerationEvent;
        if (payload.type === 'progress') {
          setLatest(payload.progress);
          setProgress((current) => [...current, payload.progress]);
        } else if (payload.type === 'completed') {
          setStatus('completed');
          setMessage(
            `Finished in ${payload.generationsRun} generations (${(payload.durationMs / 1000).toFixed(2)} s). ` +
              `Final fitness ${payload.bestFitness.toFixed(6)}.`,
          );
          source.close();
        } else if (payload.type === 'failed') {
          setStatus('failed');
          setMessage(payload.message);
          source.close();
        }
      };

      source.onerror = () => {
        // A closed stream after completion is normal; only surface a genuine drop.
        if (source.readyState === EventSource.CLOSED && status === 'running') {
          setStatus('failed');
          setMessage('Lost connection to the generation stream.');
        }
      };
    } catch (e) {
      setStatus('failed');
      if (e instanceof ApiError && e.status === 422) {
        const body = e.payload as { feasibility?: FeasibilityReport };
        if (body?.feasibility) setFeasibility(body.feasibility);
        setMessage('The registered data cannot produce a timetable. See the problems listed below.');
      } else {
        setMessage(e instanceof Error ? e.message : 'Generation failed to start.');
      }
    }
  };

  const cancel = async () => {
    if (!runId) return;
    await api.post(`/schedule/runs/${runId}/cancel`);
  };

  const chartData = progress.map((p) => ({
    generation: p.generation,
    best: p.bestFitness,
    average: p.averageFitness,
    hard: p.hardViolations,
  }));

  return (
    <>
      <PageHeader
        title="Generate Timetable"
        description="Runs the Genetic Algorithm over the registered institutional data. The chart updates live, one point per five generations, as the population evolves."
      />
      <div className="page-body">
        {!isAdmin && (
          <div className="banner warning">
            You are signed in as a viewer. Generating a timetable requires the administrator role.
          </div>
        )}

        {feasibility && !feasibility.feasible && (
          <div className="banner error">
            <strong>This data cannot produce a timetable.</strong>
            <ul>
              {feasibility.errors.map((e, i) => <li key={i}>{e.message}</li>)}
            </ul>
          </div>
        )}
        {feasibility?.warnings.map((w, i) => (
          <div className="banner warning" key={i}>{w.message}</div>
        ))}

        {message && (
          <div className={`banner ${status === 'failed' ? 'error' : 'success'}`}>{message}</div>
        )}

        {feasibility && (
          <div className="stat-row" style={{ marginBottom: 18 }}>
            <Stat label="Sessions to place" value={feasibility.stats.requiredSessions} />
            <Stat label="Room-slot capacity" value={feasibility.stats.availableRoomSlots} />
            <Stat label="Utilisation" value={`${(feasibility.stats.utilisationRatio * 100).toFixed(1)}%`} />
            <Stat label="Batches" value={feasibility.stats.batches} />
            <Stat label="Instructors" value={feasibility.stats.instructors} />
            <Stat label="Rooms" value={feasibility.stats.rooms} />
          </div>
        )}

        <div className="card">
          <h3>Algorithm parameters</h3>
          <p className="hint">
            Defaults are the values specified in the project proposal. Changing them and comparing
            outcomes is what the Analysis screen records.
          </p>
          <div className="grid-2">
            {PARAMETERS.map((p) => (
              <div className="field" key={p.key}>
                <label htmlFor={p.key}>{p.label}</label>
                <input
                  id={p.key}
                  type="number"
                  step={p.step}
                  min={p.min}
                  max={p.max}
                  value={config[p.key] as number}
                  disabled={status === 'running'}
                  onChange={(e) => setConfig((c) => ({ ...c, [p.key]: Number(e.target.value) }))}
                />
                <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{p.help}</div>
              </div>
            ))}
          </div>
          <div className="row">
            <button
              className="primary"
              onClick={start}
              disabled={!isAdmin || status === 'running' || status === 'validating' || feasibility?.feasible === false}
            >
              {status === 'running' ? 'Generating...' : 'Generate timetable'}
            </button>
            {status === 'running' && <button onClick={cancel}>Stop</button>}
            <button onClick={checkFeasibility} disabled={status === 'running'}>Re-check data</button>
            <button onClick={() => setConfig(DEFAULT_GA_CONFIG)} disabled={status === 'running'}>
              Reset to proposal defaults
            </button>
            {status === 'completed' && (
              <button className="primary" onClick={() => navigate('/timetable')}>View timetable</button>
            )}
          </div>
        </div>

        {(status === 'running' || progress.length > 0) && (
          <div className="card">
            <div className="spread">
              <h3 style={{ margin: 0 }}>Convergence</h3>
              <span className="muted" style={{ fontSize: 12 }}>
                {totalSessions > 0 && `${totalSessions} sessions being placed`}
              </span>
            </div>

            <div className="stat-row" style={{ margin: '14px 0 18px' }}>
              <Stat label="Generation" value={latest?.generation ?? 0} />
              <Stat label="Best fitness" value={latest ? latest.bestFitness.toFixed(6) : '-'} />
              <Stat
                label="Hard violations"
                value={latest?.hardViolations ?? '-'}
                tone={latest ? (latest.hardViolations === 0 ? 'good' : 'bad') : undefined}
              />
              <Stat label="Soft violations" value={latest?.softViolations ?? '-'} />
              <Stat label="Elapsed" value={latest ? `${(latest.elapsedMs / 1000).toFixed(1)} s` : '-'} />
            </div>

            {latest?.hardViolations === 0 && status === 'running' && (
              <div className="banner success">
                A conflict-free timetable has been found. The algorithm is now refining soft
                preferences such as instructor idle gaps and daily balance.
              </div>
            )}

            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 22, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                  <XAxis dataKey="generation" stroke="#8a97a6" fontSize={11}
                    label={{ value: 'Generation', position: 'insideBottom', offset: -18, fontSize: 11, fill: '#8a97a6' }} />
                  <YAxis stroke="#8a97a6" fontSize={11} width={70}
                    tickFormatter={(v: number) => v.toFixed(4)} />
                  <Tooltip
                    formatter={(v: number, name) => [name === 'hard' ? v : v.toFixed(6), name]}
                    labelFormatter={(l) => `Generation ${l}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} verticalAlign="top" height={26} />
                  <Line type="monotone" dataKey="best" name="Best fitness" stroke="#2f7ac7" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="average" name="Average fitness" stroke="#94a7bb" strokeWidth={1.5} dot={false} strokeDasharray="4 3" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ width: '100%', height: 170, marginTop: 12 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                  <XAxis dataKey="generation" stroke="#8a97a6" fontSize={11} />
                  <YAxis stroke="#8a97a6" fontSize={11} width={70} allowDecimals={false} />
                  <Tooltip labelFormatter={(l) => `Generation ${l}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} verticalAlign="top" height={26} />
                  <Line type="stepAfter" dataKey="hard" name="Hard constraint violations" stroke="#c0392b" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'bad' }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className={`value ${tone ?? ''}`}>{value}</div>
    </div>
  );
}
