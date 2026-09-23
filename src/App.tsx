/**
 * The whole app, top to bottom:
 *   1. the college data (editable)       -> DataEditor.tsx
 *   2. the GA parameters (editable)      -> FIELDS below
 *   3. Generate: runs the GA in the browser, drawing the chart as it goes
 *   4. the best timetable                -> Timetable.tsx
 */
import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COLLEGE, type CollegeData } from './data';
import { buildProblem, type Problem } from './ga/problem';
import { CONFIG, runGA, type Config, type Progress, type Result } from './ga/engine';
import { DataEditor } from './DataEditor';
import { Timetable } from './Timetable';

/** The parameter inputs: which Config field, its label, help text and allowed range. */
const FIELDS: { key: keyof Config; label: string; help: string; min: number; max: number; step: number }[] = [
  { key: 'populationSize', label: 'Population size', help: 'Candidate timetables in each generation.', min: 2, max: 1000, step: 10 },
  { key: 'maxGenerations', label: 'Max generations', help: 'Stop after this many generations at most.', min: 1, max: 10000, step: 100 },
  { key: 'crossoverRate', label: 'Crossover rate', help: 'Chance a child mixes two parents instead of copying one.', min: 0, max: 1, step: 0.05 },
  { key: 'mutationRate', label: 'Mutation rate', help: "Chance each gene gets a new room, slot, or both.", min: 0, max: 1, step: 0.01 },
  { key: 'tournamentSize', label: 'Tournament size (k)', help: 'Timetables compared to pick each parent; bigger = greedier.', min: 1, max: 50, step: 1 },
  { key: 'elitismRate', label: 'Elitism rate', help: 'Share of the best timetables kept unchanged.', min: 0, max: 0.9, step: 0.05 },
  { key: 'patience', label: 'Patience (generations)', help: 'Once clash-free, stop after this many generations without improvement.', min: 1, max: 1000, step: 5 },
  { key: 'seed', label: 'Random seed', help: 'Same seed + same settings = same result.', min: 0, max: 999999, step: 1 },
];

export function App() {
  const [data, setData] = useState<CollegeData>(COLLEGE); // college data, starts as the sample
  const [config, setConfig] = useState<Config>(CONFIG); // GA parameters, start as the proposal's
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<Progress[]>([]); // one entry per generation (the chart)
  /** The result, and the problem it was solved for (the data may be edited afterwards). */
  const [result, setResult] = useState<{ run: Result; problem: Problem } | null>(null);
  const latest = history.at(-1);

  // Step 1 runs whenever the data changes, so data mistakes show up while editing.
  const built = useMemo(() => {
    try {
      return { problem: buildProblem(data), error: null };
    } catch (e) {
      return { problem: null, error: (e as Error).message };
    }
  }, [data]);

  // Pressing Generate: tidy the parameters, clear the old run, run the GA.
  const generate = async () => {
    const problem = built.problem;
    if (!problem) return;
    const clean = sanitize(config);
    setConfig(clean);
    setRunning(true);
    setHistory([]);
    setResult(null);
    // Each generation calls back with its progress, which adds a point to the chart.
    const r = await runGA(problem, (p) => setHistory((h) => [...h, p]), clean);
    setResult({ run: r, problem });
    setRunning(false);
  };

  return (
    <main>
      <h1>College Timetable Generator</h1>
      <p className="muted">
        {data.batches.length} batches, {data.courses.length} courses, {data.teachers.length} teachers,{' '}
        {data.rooms.length} rooms
        {built.problem && <> &rarr; {built.problem.sessions.length} sessions to place in 36 weekly slots.</>}
      </p>
      {built.error && <p className="bad">Can't build a timetable from this data: {built.error}</p>}

      <details>
        <summary>Edit college data</summary>
        <p className="muted hint">
          The input to the algorithm. Each course becomes one session per weekly lecture, and
          each session may only use a teacher who can teach it and a room big enough for the batch.
          Edits are not saved; reloading the page restores the sample data.
        </p>
        <DataEditor data={data} onChange={setData} disabled={running} />
        <button className="secondary" disabled={running} onClick={() => setData(COLLEGE)}>
          Reset to sample data
        </button>
      </details>

      <h2>Algorithm parameters</h2>
      <p className="muted hint">Defaults are the values from the project proposal.</p>
      <div className="params">
        {FIELDS.map((f) => (
          <label key={f.key}>
            <span className="muted">{f.label}</span>
            <input
              type="number"
              min={f.min}
              max={f.max}
              step={f.step}
              value={config[f.key]}
              disabled={running}
              onChange={(e) => setConfig({ ...config, [f.key]: Number(e.target.value) })}
            />
            <small className="muted">{f.help}</small>
          </label>
        ))}
      </div>

      <div className="controls">
        <button onClick={generate} disabled={running || !built.problem}>
          {running ? 'Generating...' : 'Generate timetable'}
        </button>
        <button className="secondary" onClick={() => setConfig(CONFIG)} disabled={running}>
          Reset to proposal defaults
        </button>
      </div>

      {latest && (
        <section>
          <h2>Progress</h2>
          <div className="stats">
            <Stat label="Generation" value={latest.generation} help="How many rounds of evolution so far." />
            <Stat label="Hard violations" value={latest.hardViolations} good={latest.hardViolations === 0} help="Clashes in the best timetable. Must be 0." />
            <Stat label="Best fitness" value={latest.bestFitness.toFixed(4)} help="1 / (1 + penalty). 1.0 is perfect." />
            <Stat label="Time" value={`${(latest.elapsedMs / 1000).toFixed(1)} s`} help="Time since Generate was pressed." />
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={history} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="generation" fontSize={12} />
              <YAxis yAxisId="hard" fontSize={12} allowDecimals={false} />
              <YAxis yAxisId="fitness" orientation="right" fontSize={12} domain={[0, 'auto']} />
              <Tooltip />
              <Legend />
              <Line yAxisId="hard" dataKey="hardViolations" name="Hard violations" stroke="#dc2626" dot={false} isAnimationActive={false} />
              <Line yAxisId="fitness" dataKey="bestFitness" name="Best fitness" stroke="#2563eb" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="muted hint">
            Each point is one generation. <b className="bad">Hard violations</b> counts the clashes
            in the best timetable (a teacher, room or batch booked twice in the same slot); it must
            reach 0. <b style={{ color: '#2563eb' }}>Best fitness</b> is 1 / (1 + penalty), where
            each clash costs 100 and teacher idle gaps and uneven days cost a little. 1.0 is a
            perfect timetable.
          </p>
        </section>
      )}

      {result && (
        <section>
          <h2>Timetable</h2>
          <p className={result.run.hardViolations === 0 ? 'good' : 'bad'}>
            {result.run.hardViolations === 0
              ? `Clash-free timetable found at generation ${result.run.solvedAt}. Stopped after ${result.run.generations} generations with fitness ${result.run.fitness.toFixed(4)}.`
              : `No clash-free timetable after ${result.run.generations} generations (${result.run.hardViolations} clashes left).`}
          </p>
          <p className="muted hint">
            The best timetable found. Pick a batch, teacher or room to see its week: no cell ever
            holds two classes, because that would be a clash.
          </p>
          <Timetable problem={result.problem} chromosome={result.run.best} />
        </section>
      )}
    </main>
  );
}

/** One of the four boxes above the chart. `good` colours the value green or red. */
function Stat({ label, value, good, help }: { label: string; value: string | number; good?: boolean; help: string }) {
  return (
    <div className="stat">
      <div className="muted">{label}</div>
      <div className={good === undefined ? 'value' : good ? 'value good' : 'value bad'}>{value}</div>
      <small className="muted">{help}</small>
    </div>
  );
}

/** Keeps every field inside its range; whole-number fields are rounded. */
function sanitize(config: Config): Config {
  const clean = { ...config };
  for (const f of FIELDS) {
    const n = Number.isFinite(config[f.key]) ? config[f.key] : CONFIG[f.key];
    const bounded = Math.min(f.max, Math.max(f.min, n));
    clean[f.key] = f.step >= 1 ? Math.round(bounded) : bounded;
  }
  return clean;
}
