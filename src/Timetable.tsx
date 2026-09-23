/**
 * Shows the winning chromosome as a weekly grid for one batch, teacher or room.
 *
 * This is the "decode" step: each gene (teacher, room, slot) of session i is turned back
 * into readable names and drawn in the cell for its slot.
 */
import { useState } from 'react';
import { DAYS, PERIODS } from './data';
import type { Chromosome, Problem } from './ga/problem';

type View = 'batch' | 'teacher' | 'room';

export function Timetable({ problem, chromosome }: { problem: Problem; chromosome: Chromosome }) {
  const [view, setView] = useState<View>('batch');
  const [selected, setSelected] = useState(0);
  const { courses, teachers, rooms, batches } = problem.data;

  // The names for the second dropdown, e.g. all batch names when viewing by batch.
  const names = { batch: batches, teacher: teachers, room: rooms }[view].map((x) => x.name);

  // cells[slot] = the sessions that the selected batch/teacher/room has in that slot
  const cells: string[][][] = Array.from({ length: DAYS.length * PERIODS.length }, () => []);
  chromosome.forEach((gene, i) => {
    const session = problem.sessions[i];
    // Does this session belong to the selected batch / teacher / room? Skip it if not.
    const owner = { batch: session.batch, teacher: gene.teacher, room: gene.room }[view];
    if (owner !== selected) return;
    // Three lines per cell: the course, then the two things the view doesn't already say
    // (by batch -> teacher + room, by teacher -> batch + room, by room -> batch + teacher).
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
          {names.map((name, i) => <option key={i} value={i}>{name}</option>)}
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
