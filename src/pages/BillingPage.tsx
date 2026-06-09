import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminClinicsApi, type ClinicListItem } from '../api/admin-clinics';
import {
  ClinicLogo,
  ConsoleMetric,
  PayBadge,
  money,
} from '../components/common/primitives';
import { Icon } from '../components/common/Icon';
import { useUIStore } from '../store/ui.store';
import { formatDateLong } from '../lib/format';

// Order clinics by urgency: grace-end first (action needed today), then
// overdue, then due-soon, ok, pending. Within a bucket, by daysToDue asc.
const URGENCY_ORDER: Record<string, number> = {
  'grace-end': 0,
  overdue: 1,
  'due-soon': 2,
  ok: 3,
  pending: 4,
};

export default function BillingPage() {
  const openDrawer = useUIStore(s => s.openDrawer);

  const { data: list } = useQuery({
    queryKey: ['admin-clinics', 1, 100],
    queryFn: () => adminClinicsApi.findAll(1, 100),
  });
  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => adminClinicsApi.getMetrics(),
  });

  // Show every clinic — trials are now part of the funnel: a trial about to
  // expire is just as actionable as a paid subscription about to expire.
  const sorted = useMemo(() => {
    const items = list?.clinics ?? [];
    return [...items].sort((a, b) => {
      const ua = URGENCY_ORDER[a.paymentStatus] ?? 99;
      const ub = URGENCY_ORDER[b.paymentStatus] ?? 99;
      if (ua !== ub) return ua - ub;
      return (a.daysToDue ?? 99) - (b.daysToDue ?? 99);
    });
  }, [list]);

  const collected =
    Math.round(((metrics?.activeClinics ?? 0) * (metrics?.planPriceMonthly ?? 0)) * 0.82);

  return (
    <div className="content fade-in">
      <div className="r-metrics" style={{ marginBottom: 20 }}>
        <ConsoleMetric
          label="Ingreso mensual"
          value={money(metrics?.mrr ?? 0)}
          icon="dollar"
          tone="success"
        />
        <ConsoleMetric
          label="Vencidos"
          value={(metrics?.overdueCount ?? 0) + (metrics?.graceEndCount ?? 0)}
          icon="alert"
          tone={
            (metrics?.overdueCount ?? 0) + (metrics?.graceEndCount ?? 0)
              ? 'danger'
              : 'default'
          }
        />
        <ConsoleMetric
          label="Por vencer"
          value={metrics?.dueSoonCount ?? 0}
          icon="clock"
          tone={metrics?.dueSoonCount ? 'warning' : 'default'}
        />
        <ConsoleMetric
          label="Cobrado este mes"
          value={money(collected)}
          sub="82% de cobranza (estimado)"
          icon="checkCircle"
        />
      </div>

      <div className="table-wrap">
        <div
          style={{
            padding: '13px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Estado de cobranza · ordenado por urgencia
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Consultorio</th>
                <th>Plan</th>
                <th>Vencimiento</th>
                <th>Pago</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <BillingRow
                  key={c._id}
                  clinic={c}
                  planPrice={metrics?.planPriceMonthly ?? 0}
                  onOpen={() => openDrawer(c._id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BillingRow({
  clinic,
  planPrice,
  onOpen,
}: {
  clinic: ClinicListItem;
  planPrice: number;
  onOpen: () => void;
}) {
  return (
    <tr onClick={onOpen}>
      <td>
        <div className="row" style={{ gap: 11 }}>
          <ClinicLogo color={clinic.brandColor} size={32} logoStyle={clinic.logoStyle} />
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{clinic.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
              {clinic.doctorName ?? '—'}
            </div>
          </div>
        </div>
      </td>
      <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
        {clinic.status === 'TRIAL' ? (
          <span style={{ color: 'var(--text-tertiary)' }}>Prueba gratuita</span>
        ) : (
          `${money(planPrice)}/mes`
        )}
      </td>
      <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
        {clinic.status === 'TRIAL' ? (
          clinic.trialEndsAt ? (
            <>
              {formatDateLong(clinic.trialEndsAt)}
              <span style={{ color: 'var(--text-tertiary)', marginLeft: 6, fontSize: 11 }}>
                · fin de prueba
              </span>
            </>
          ) : (
            '—'
          )
        ) : clinic.subscriptionEndsAt ? (
          formatDateLong(clinic.subscriptionEndsAt)
        ) : (
          '—'
        )}
      </td>
      <td><PayBadge paymentStatus={clinic.paymentStatus} daysToDue={clinic.daysToDue} /></td>
      <td>
        <Icon name="chevronRight" size={15} style={{ color: 'var(--text-tertiary)' }} />
      </td>
    </tr>
  );
}
