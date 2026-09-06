import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { setOnUnauthorized } from './api/client.ts';
import { useMe } from './api/queries.ts';
import AppShell from './components/AppShell.tsx';
import { ToastProvider } from './components/Toast.tsx';
import ExercisePage from './pages/ExercisePage.tsx';
import ExercisesPage from './pages/ExercisesPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import StatusPage from './pages/StatusPage.tsx';

function UnauthorizedBridge(): null {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    setOnUnauthorized(() => {
      queryClient.clear();
      navigate('/login');
    });
    return () => setOnUnauthorized(null);
  }, [navigate, queryClient]);

  return null;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isPending, isError } = useMe();

  if (isPending) {
    return <p>Laster …</p>;
  }

  if (isError || !data?.authenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <UnauthorizedBridge />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<StatusPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="exercises" element={<ExercisesPage />} />
          <Route path="exercises/:id" element={<ExercisePage />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
