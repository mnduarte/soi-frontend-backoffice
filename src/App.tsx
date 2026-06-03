import { RouterProvider, createBrowserRouter, redirect } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminAuthStore } from './store/admin-auth.store';

function requireAuth() {
  const token = useAdminAuthStore.getState().accessToken;
  if (!token) return redirect('/login');
  return null;
}

const router = createBrowserRouter([
  {
    path: '/login',
    lazy: () => import('./pages/AdminLoginPage').then(m => ({ Component: m.default })),
  },
  {
    path: '/',
    loader: requireAuth,
    lazy: () => import('./components/AdminLayout').then(m => ({ Component: m.default })),
    children: [
      { index: true, lazy: () => import('./pages/MetricsPage').then(m => ({ Component: m.default })) },
      { path: 'clinics', lazy: () => import('./pages/ClinicListPage').then(m => ({ Component: m.default })) },
      { path: 'clinics/:id', lazy: () => import('./pages/ClinicDetailPage').then(m => ({ Component: m.default })) },
      { path: 'banners', lazy: () => import('./pages/BannersPage').then(m => ({ Component: m.default })) },
    ],
  },
]);

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
