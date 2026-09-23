/**
 * The whole app: press Generate, watch the algorithm converge, read the timetable.
 */
import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COLLEGE } from './data';
import { buildProblem } from './ga/problem';
import { runGA, type Progress, type Result } from './ga/engine';
import { Timetable } from './Timetable';

const problem = buildProblem(COLLEGE);

export function App() {
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<Progress[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const latest = history.at(-1);

  const generate = async () => {
    setRunning(true);
    setHistory([]);
    setResult(null);
    const r = await runGA(problem, (p) => setHistory((h) => [...h, p]));
    setResult(r);
    setRunning(false);
  };

  return (
    <main>
      <h1>College Timetable Generator</h1>
      <p className="muted">
        {COLLEGE.batches.length} batches, {COLLEGE.courses.length} courses, {COLLEGE.teachers.length} teachers,{' '}
        {COLLEGE.rooms.length} rooms &rarr; {problem.sessions.length} sessions to place in 36 weekly slots.
      </p>

      <button onClick={generate} disabled={running}>
        {running ? 'Generating...' : 'Generate timetable'}
      </button>

      {latest && (
        <section>
          <div className="stats">
            <Stat label="Generation" value={latest.generation} />
            <Stat label="Hard violations" value={latest.hardViolations} good={latest.hardViolations === 0} />
            <Stat label="Best fitness" value={latest.bestFitness.toFixed(4)} />
            <Stat label="Time" value={`${(latest.elapsedMs / 1000).toFixed(1)} s`} />
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
        </section>
      )}

      {result && (
        <section>
          <p className={result.hardViolations === 0 ? 'good' : 'bad'}>
            {result.hardViolations === 0
              ? `Clash-free timetable found at generation ${result.solvedAt}. Stopped after ${result.generations} generations with fitness ${result.fitness.toFixed(4)}.`
              : `No clash-free timetable after ${result.generations} generations (${result.hardViolations} clashes left).`}
          </p>
          <Timetable problem={problem} chromosome={result.best} />
        </section>
      )}
    </main>
  );
}

function Stat({ label, value, good }: { label: string; value: string | number; good?: boolean }) {
  return (
    <div className="stat">
      <div className="muted">{label}</div>
      <div className={good === undefined ? 'value' : good ? 'value good' : 'value bad'}>{value}</div>
    </div>
  );
}
