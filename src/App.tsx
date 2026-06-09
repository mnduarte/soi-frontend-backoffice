import { Navigate, RouterProvider, createBrowserRouter, redirect } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminAuthStore } from './store/admin-auth.store';

// requireAuth: returning `redirect(...)` rather than throwing is the React
// Router v7 pattern — throwing the response is interpreted as a real error and
// renders the error boundary instead of navigating.
function requireAuth() {
  const token = useAdminAuthStore.getState().accessToken;
  if (!token) return redirect('/login');
  return null;
}

const router = createBrowserRouter([
  {
    path: '/login',
    lazy: () =>
      import('./pages/AdminLoginPage').then(m => ({ Component: m.default })),
  },
  {
    path: '/',
    loader: requireAuth,
    lazy: () =>
      import('./components/layout/ConsoleLayout').then(m => ({ Component: m.default })),
    children: [
      { index: true, element: <Navigate to="/accounts" replace /> },
      {
        path: 'accounts',
        lazy: () =>
          import('./pages/AccountsPage').then(m => ({ Component: m.default })),
      },
      {
        path: 'accounts/new',
        lazy: () =>
          import('./pages/NewAccountPage').then(m => ({ Component: m.default })),
      },
      {
        path: 'billing',
        lazy: () =>
          import('./pages/BillingPage').then(m => ({ Component: m.default })),
      },
      {
        path: 'settings',
        lazy: () =>
          import('./pages/SettingsPage').then(m => ({ Component: m.default })),
      },
    ],
  },
]);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
