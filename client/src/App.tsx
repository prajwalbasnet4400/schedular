import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Shell } from './components/Shell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { GeneratePage } from './pages/GeneratePage';
import { TimetablePage } from './pages/TimetablePage';
import { AnalysisPage } from './pages/AnalysisPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { ProgramsPage } from './pages/ProgramsPage';
import { CoursesPage } from './pages/CoursesPage';
import { InstructorsPage } from './pages/InstructorsPage';
import { RoomsPage } from './pages/RoomsPage';
import { BatchesPage } from './pages/BatchesPage';
import { MeetingTimesPage } from './pages/MeetingTimesPage';

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 40, color: '#6b7887' }}>Loading...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/generate" element={<GeneratePage />} />
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/data/departments" element={<DepartmentsPage />} />
        <Route path="/data/programs" element={<ProgramsPage />} />
        <Route path="/data/courses" element={<CoursesPage />} />
        <Route path="/data/instructors" element={<InstructorsPage />} />
        <Route path="/data/rooms" element={<RoomsPage />} />
        <Route path="/data/batches" element={<BatchesPage />} />
        <Route path="/data/meeting-times" element={<MeetingTimesPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
