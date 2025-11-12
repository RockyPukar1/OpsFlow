import { useEffect } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';

import LoginForm from '@/components/auth/LoginForm';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import RegisterForm from '@/components/auth/RegisterForm';
import { socketService } from '@/lib/socket';
import Dashboard from '@/pages/Dashboard';
import Projects from '@/pages/Projects';
import { useAuthStore } from '@/store/authStore';

function App() {
  const { isAuthenticated, accessToken, initializeAuth } = useAuthStore();

  // Initialize auth on app start
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      socketService.connect(accessToken);
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated, accessToken]);

  return (
    <>
      <RouterProvider
        router={createBrowserRouter([
          {
            path: '/',
            element: isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            ),
          },
          {
            path: '/login',
            element: isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginForm />,
          },
          {
            path: '/register',
            element: isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterForm />,
          },
          {
            path: '/dashboard',
            element: (
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            ),
          },
          {
            path: '/projects',
            element: (
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            ),
          },
          {
            path: '*',
            element: <Navigate to="/" replace />,
          },
        ])}
      />
      <Toaster position="top-right" />
    </>
  );
}

export default App;
