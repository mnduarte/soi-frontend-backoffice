import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  adminClinicsApi,
  type ClinicListItem,
  type ClinicStatus,
  type PaymentStatus,
} from '../api/admin-clinics';
import {
  AccStatusBadge,
  Banner,
  ClinicLogo,
  ConsoleMetric,
  LastSeenCell,
  PayBadge,
  money,
} from '../components/common/primitives';
import { Icon } from '../components/common/Icon';
import { useUIStore } from '../store/ui.store';

// "pending" is a synthetic filter — it means OWNER hasn't finished the
// invite-link setup flow yet, regardless of subscription status.
type StatusFilter = 'all' | 'pending' | ClinicStatus;
type PayFilterKey = PaymentStatus | null;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',       label: 'Todos' },
  { key: 'ACTIVE',    label: 'Activos' },
  { key: 'pending',   label: 'Sin activar' },
  { key: 'SUSPENDED', label: 'Suspendidos' },
];

export default function AccountsPage() {
  const openDrawer = useUIStore(s => s.openDrawer);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [payFilter, setPayFilter] = useState<PayFilterKey>(null);

  const { data: list } = useQuery({
    queryKey: ['admin-clinics', 1, 100],
    queryFn: () => adminClinicsApi.findAll(1, 100),
  });
  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => adminClinicsApi.getMetrics(),
  });

  const clinics = list?.clinics ?? [];

  // Counts per tab so the user can see the distribution while filtering.
  const tabCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: clinics.length,
      ACTIVE: 0,
      TRIAL: 0,
      pending: 0,
      SUSPENDED: 0,
    };
    for (const c of clinics) {
      counts[c.status]++;
      if (!c.activated && c.status !== 'SUSPENDED') counts.pending++;
    }
    return counts;
  }, [clinics]);

  const filtered = useMemo(() => {
    return clinics.filter(c => {
      if (statusFilter === 'pending') {
        if (c.activated || c.status === 'SUSPENDED') return false;
      } else if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }
      if (payFilter && c.paymentStatus !== payFilter) return false;
      return true;
    });
  }, [clinics, statusFilter, payFilter]);

  return (
    <div className="content fade-in">
      {/* metrics */}
      <div className="r-metrics" style={{ marginBottom: 20 }}>
        <ConsoleMetric
          label="Consultorios activos"
          value={metrics?.activeClinics ?? 0}
          sub={`${metrics?.pendingActivationCount ?? 0} sin activar · ${metrics?.suspendedClinics ?? 0} suspendidos`}
          icon="building"
          tone="brand"
        />
        <ConsoleMetric
          label="Ingreso mensual (MRR)"
          value={money(metrics?.mrr ?? 0)}
          sub={`${money(metrics?.planPriceMonthly ?? 0)} / consultorio`}
          icon="trendUp"
          tone="success"
        />
        <ConsoleMetric
          label="Pagos vencidos"
          value={(metrics?.overdueCount ?? 0) + (metrics?.graceEndCount ?? 0)}
          sub={
            (metrics?.overdueCount ?? 0) + (metrics?.graceEndCount ?? 0)
              ? 'Requieren acción'
              : 'Todo al día'
          }
          icon="alert"
          tone={(metrics?.overdueCount ?? 0) + (metrics?.graceEndCount ?? 0) ? 'danger' : 'default'}
        />
        <ConsoleMetric
          label="Altas del mes"
          value={metrics?.newThisMonth ?? 0}
          sub="Últimos 30 días"
          icon="userPlus"
        />
      </div>

      {/* morosidad banners */}
      <div className="col" style={{ gap: 10, marginBottom: 20 }}>
        {(metrics?.graceEndCount ?? 0) > 0 && (
          <Banner
            tone="danger"
            icon="ban"
            title={`${metrics!.graceEndCount} ${
              metrics!.graceEndCount === 1 ? 'cuenta supera' : 'cuentas superan'
            } los ${metrics!.gracePeriodDays} días de mora`}
            body="Se les avisó que en los próximos días se suspende el inicio de sesión. Regularizá o extendé la prórroga."
            action="Ver morosos"
            onAction={() => { setPayFilter('grace-end'); setStatusFilter('all'); }}
          />
        )}
        {(metrics?.overdueCount ?? 0) > 0 && (
          <Banner
            tone="warningStrong"
            icon="alert"
            title={`${metrics!.overdueCount} ${
              metrics!.overdueCount === 1 ? 'consultorio tiene' : 'consultorios tienen'
            } el pago vencido`}
            body={`Dentro de la tolerancia de ${metrics!.gracePeriodDays} días. Conviene contactarlos antes de que se suspendan.`}
            action="Contactar"
            onAction={() => { setPayFilter('overdue'); setStatusFilter('all'); }}
          />
        )}
        {(metrics?.dueSoonCount ?? 0) > 0 && (
          <Banner
            tone="warning"
            icon="clock"
            title={`${metrics!.dueSoonCount} ${
              metrics!.dueSoonCount === 1 ? 'pago vence' : 'pagos vencen'
            } esta semana`}
            body="Próximos a vencer. Se les muestra un aviso amarillo dentro de su app."
            action="Ver próximos"
            onAction={() => { setPayFilter('due-soon'); setStatusFilter('all'); }}
          />
        )}
      </div>

      {/* table */}
      <div className="table-wrap">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
          }}
        >
          <div className="tabs" style={{ borderBottom: 'none', padding: 0 }}>
            {STATUS_TABS.map(t => (
              <div
                key={t.key}
                className={`tab ${statusFilter === t.key ? 'is-active' : ''}`}
                onClick={() => setStatusFilter(t.key)}
              >
                {t.label} <span className="tab__count">{tabCounts[t.key]}</span>
              </div>
            ))}
          </div>
          <div className="spacer" />
          {payFilter && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setPayFilter(null)}
              style={{ color: 'var(--brand-primary)' }}
            >
              <Icon name="x" size={13} /> Filtro de pago
            </button>
          )}
          <button className="btn btn--secondary btn--sm">
            <Icon name="filter" size={13} /> Filtros
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Consultorio</th>
                <th>Usuario</th>
                <th>Estado</th>
                <th>Último acceso</th>
                <th style={{ textAlign: 'right' }}>Pacientes</th>
                <th>Pago</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <ClinicRow key={c._id} clinic={c} onOpen={() => openDrawer(c._id)} />
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 13,
            }}
          >
            No hay consultorios con este filtro.
          </div>
        )}
      </div>
    </div>
  );
}

function ClinicRow({
  clinic,
  onOpen,
}: {
  clinic: ClinicListItem;
  onOpen: () => void;
}) {
  const initials = clinic.name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
  return (
    <tr onClick={onOpen}>
      <td>
        <div className="row" style={{ gap: 11 }}>
          <ClinicLogo
            color={clinic.brandColor}
            size={34}
            logoStyle={clinic.logoStyle}
            initials={initials}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{clinic.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
              {clinic.doctorName ?? '—'} · {clinic.city ?? '—'}
            </div>
          </div>
        </div>
      </td>
      <td>
        <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
          {clinic.slug}
        </span>
      </td>
      <td><AccStatusBadge status={clinic.status} activated={clinic.activated} /></td>
      <td><LastSeenCell lastLoginAt={clinic.lastLoginAt} /></td>
      <td style={{ textAlign: 'right' }} className="text-tabular">
        {clinic.patientsCount ? clinic.patientsCount.toLocaleString('es-AR') : '—'}
      </td>
      <td>
        <PayBadge paymentStatus={clinic.paymentStatus} daysToDue={clinic.daysToDue} />
      </td>
      <td>
        <Icon
          name="chevronRight"
          size={15}
          style={{ color: 'var(--text-tertiary)' }}
        />
      </td>
    </tr>
  );
}
