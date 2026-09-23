/**
 * Shows the winning chromosome as a weekly grid for one batch, teacher or room.
 */
import { useState } from 'react';
import { DAYS, PERIODS } from './data';
import type { Chromosome, Problem } from './ga/problem';

type View = 'batch' | 'teacher' | 'room';

export function Timetable({ problem, chromosome }: { problem: Problem; chromosome: Chromosome }) {
  const [view, setView] = useState<View>('batch');
  const [selected, setSelected] = useState(0);
  const { courses, teachers, rooms, batches } = problem.data;

  const names = { batch: batches, teacher: teachers, room: rooms }[view].map((x) => x.name);

  // cells[slot] = the sessions that the selected batch/teacher/room has in that slot
  const cells: string[][][] = Array.from({ length: DAYS.length * PERIODS.length }, () => []);
  chromosome.forEach((gene, i) => {
    const session = problem.sessions[i];
    const owner = { batch: session.batch, teacher: gene.teacher, room: gene.room }[view];
    if (owner !== selected) return;
    const lines = [
      courses[session.course].code,
      view !== 'batch' ? batches[session.batch].name : teachers[gene.teacher].name,
      view !== 'room' ? rooms[gene.room].name : teachers[gene.teacher].name,
    ];
    cells[gene.slot].push(lines);
  });

  return (
    <div>
      <div className="controls">
        <select value={view} onChange={(e) => { setView(e.target.value as View); setSelected(0); }}>
          <option value="batch">By batch</option>
          <option value="teacher">By teacher</option>
          <option value="room">By room</option>
        </select>
        <select value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
          {names.map((name, i) => <option key={name} value={i}>{name}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th />
              {PERIODS.map((p) => <th key={p}>{p}</th>)}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, d) => (
              <tr key={day}>
                <th>{day}</th>
                {PERIODS.map((p, period) => (
                  <td key={p}>
                    {cells[d * PERIODS.length + period].map((lines, k) => (
                      <div className="session" key={k}>
                        <strong>{lines[0]}</strong>
                        <span>{lines[1]}</span>
                        <span>{lines[2]}</span>
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
