import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const DATA_LINKS = [
  { to: '/data/departments', label: 'Departments' },
  { to: '/data/programs', label: 'Programs' },
  { to: '/data/courses', label: 'Courses' },
  { to: '/data/instructors', label: 'Instructors' },
  { to: '/data/rooms', label: 'Rooms' },
  { to: '/data/batches', label: 'Batches' },
  { to: '/data/meeting-times', label: 'Time Slots' },
];

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Timetable Generator</h1>
          <p>Academia International College</p>
        </div>

        <div className="sidebar-section">Schedule</div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/generate">Generate</NavLink>
          <NavLink to="/timetable">Timetable</NavLink>
          <NavLink to="/analysis">Analysis</NavLink>
        </nav>

        <div className="sidebar-section">Institutional Data</div>
        <nav>
          {DATA_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to}>{link.label}</NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="who">{user?.name}</div>
          <div className="role">{user?.role === 'ADMIN' ? 'Administrator' : 'Viewer'}</div>
          <button className="small" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="page-header">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}
