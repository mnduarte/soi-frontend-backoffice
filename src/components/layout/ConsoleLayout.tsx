import { useState, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ConsoleSidebar } from './ConsoleSidebar';
import { ConsoleTopbar } from './ConsoleTopbar';
import { ToastHost } from '../common/primitives';
import { Icon } from '../common/Icon';
import { adminClinicsApi } from '../../api/admin-clinics';
import { AccountDetailDrawer } from '../AccountDetailDrawer';
import { PasswordResetDrawer } from '../PasswordResetDrawer';
import { useUIStore } from '../../store/ui.store';
import { money } from '../../lib/format';

// Titles + subtitles shown by the topbar for each top-level route. Kept in a
// lookup so the layout doesn't need to know about each page's contents.
function headerFor(
  pathname: string,
  metrics?: { activeClinics: number; totalClinics: number; mrr: number },
): { title: string; sub?: string } {
  if (pathname.startsWith('/accounts/new')) {
    return { title: 'Nuevo consultorio', sub: 'Alta e invitación' };
  }
  if (pathname.startsWith('/accounts')) {
    return {
      title: 'Consultorios',
      sub: metrics
        ? `${metrics.activeClinics} activos · ${metrics.totalClinics} en total`
        : undefined,
    };
  }
  if (pathname.startsWith('/billing')) {
    return {
      title: 'Facturación',
      sub: metrics ? `${money(metrics.mrr)} de ingreso mensual` : undefined,
    };
  }
  if (pathname.startsWith('/settings')) {
    return { title: 'Ajustes', sub: 'Configuración de la consola' };
  }
  return { title: 'Consola' };
}

export default function ConsoleLayout(): ReactNode {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => adminClinicsApi.getMetrics(),
  });
  const openResetInbox = useUIStore(s => s.openResetInbox);
  // 30s poll so a fresh reset request shows up without a manual refresh.
  const { data: resetCount } = useQuery({
    queryKey: ['admin-reset-requests-count'],
    queryFn: () => adminClinicsApi.countPasswordResetRequests(),
    refetchInterval: 30_000,
  });

  const head = headerFor(pathname, metrics);
  const isNewAccount = pathname.startsWith('/accounts/new');
  const pendingResets = resetCount?.count ?? 0;

  const topbarRight = isNewAccount ? null : (
    <>
      <button
        className="btn btn--ghost btn--icon"
        onClick={openResetInbox}
        title={pendingResets ? `${pendingResets} pedidos de reset` : 'Pedidos de reset'}
        style={{ position: 'relative' }}
      >
        <Icon name="bell" />
        {pendingResets > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 8,
              background: 'var(--danger)',
              color: 'white',
              fontSize: 10.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {pendingResets > 9 ? '9+' : pendingResets}
          </span>
        )}
      </button>
      <button className="btn btn--primary" onClick={() => navigate('/accounts/new')}>
        <Icon name="userPlus" />{' '}
        <span className="btn-label-desktop">Nuevo consultorio</span>
      </button>
    </>
  );

  return (
    <>
      <div className="app">
        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}
        <ConsoleSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          counts={{
            total: metrics?.totalClinics ?? 0,
            overdue: (metrics?.overdueCount ?? 0) + (metrics?.graceEndCount ?? 0),
          }}
        />
        <div className="main">
          <ConsoleTopbar
            title={head.title}
            sub={head.sub}
            right={topbarRight}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <Outlet />
        </div>
      </div>
      <AccountDetailDrawer />
      <PasswordResetDrawer />
      <ToastHost />
    </>
  );
}
