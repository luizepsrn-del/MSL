import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminShell } from '../design-system';
import { useTheme } from './theme';
import { Showcase } from './routes/Showcase';

/** The product itself — the desktop admin shell from the design system's patterns. */
function Admin() {
  const { theme, setTheme } = useTheme();
  return <AdminShell theme={theme} onThemeChange={setTheme} />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/app" element={<Admin />} />
      <Route path="/design-system" element={<Showcase />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
