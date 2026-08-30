import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { Batch, Course, Department, FeasibilityReport, Instructor, MeetingTime, Room } from '@schedular/shared';
import { api } from '../api/client';
import { PageHeader } from '../components/Shell';
import { useAuth } from '../auth/AuthContext';

export function DashboardPage() {
  const { user, isAdmin } = useAuth();

  const counts = useQuery({
    queryKey: ['dashboard-counts'],
    queryFn: async () => {
      const [departments, courses, instructors, rooms, batches, meetingTimes] = await Promise.all([
        api.get<Department[]>('/departments'),
        api.get<Course[]>('/courses'),
        api.get<Instructor[]>('/instructors'),
        api.get<Room[]>('/rooms'),
        api.get<Batch[]>('/batches'),
        api.get<MeetingTime[]>('/meeting-times'),
      ]);
      return { departments, courses, instructors, rooms, batches, meetingTimes };
    },
  });

  const feasibility = useQuery({
    queryKey: ['/schedule/validate'],
    queryFn: () => api.post<FeasibilityReport>('/schedule/validate'),
  });

  const c = counts.data;

  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.name.split(' ')[0]}`}
        description="Automated College Timetable Generator — a Genetic Algorithm that builds a conflict-free weekly schedule from your institutional data."
      />
      <div className="page-body">
        <div className="stat-row" style={{ marginBottom: 20 }}>
          <Tile label="Departments" value={c?.departments.length} to="/data/departments" />
          <Tile label="Courses" value={c?.courses.length} to="/data/courses" />
          <Tile label="Instructors" value={c?.instructors.length} to="/data/instructors" />
          <Tile label="Rooms" value={c?.rooms.length} to="/data/rooms" />
          <Tile label="Batches" value={c?.batches.length} to="/data/batches" />
          <Tile label="Time slots" value={c?.meetingTimes.length} to="/data/meeting-times" />
        </div>

        {feasibility.data && (
          <div className={`banner ${feasibility.data.feasible ? 'success' : 'error'}`}>
            {feasibility.data.feasible ? (
              <>
                The registered data can produce a timetable: {feasibility.data.stats.requiredSessions} sessions
                to place across {feasibility.data.stats.availableRoomSlots} room-periods
                ({(feasibility.data.stats.utilisationRatio * 100).toFixed(1)}% utilisation).
              </>
            ) : (
              <>
                <strong>The registered data cannot produce a timetable yet:</strong>
                <ul>{feasibility.data.errors.slice(0, 5).map((e, i) => <li key={i}>{e.message}</li>)}</ul>
              </>
            )}
          </div>
        )}

        <div className="grid-2">
          <div className="card">
            <h3>How it works</h3>
            <p className="hint">The seven stages of the algorithm, as specified in the project proposal.</p>
            <ol style={{ paddingLeft: 18, lineHeight: 1.75, fontSize: 13, margin: 0 }}>
              <li><strong>Encoding</strong> — every required session becomes one gene: course, teacher, room, time slot, batch.</li>
              <li><strong>Initialisation</strong> — 100 random candidate timetables are generated.</li>
              <li><strong>Fitness</strong> — violations are counted and scored as 1 / (1 + total penalty).</li>
              <li><strong>Selection</strong> — tournament selection picks parents, k = 5.</li>
              <li><strong>Crossover</strong> — single-point recombination at rate 0.8, with 20% elitism.</li>
              <li><strong>Mutation</strong> — each gene has a 0.05 chance of being reassigned.</li>
              <li><strong>Termination</strong> — stops once no conflicts remain, or at 1000 generations.</li>
            </ol>
          </div>

          <div className="card">
            <h3>Next steps</h3>
            <p className="hint">
              {isAdmin
                ? 'You are signed in as an administrator and can modify data and run the algorithm.'
                : 'You are signed in as a viewer: you can read and export schedules, but not modify data.'}
            </p>
            <div className="row">
              {isAdmin && <Link className="button" to="/generate"><button className="primary">Generate a timetable</button></Link>}
              <Link to="/timetable"><button>View the current timetable</button></Link>
              <Link to="/analysis"><button>Performance analysis</button></Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Tile({ label, value, to }: { label: string; value?: number; to: string }) {
  return (
    <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="stat">
        <div className="label">{label}</div>
        <div className="value">{value ?? '-'}</div>
      </div>
    </Link>
  );
}
