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
  LastSeenCell,
  PayBadge,
} from '../components/common/primitives';
import { Icon } from '../components/common/Icon';
import { useUIStore } from '../store/ui.store';

// "pending" is a synthetic filter — it means OWNER hasn't finished the
// invite-link setup flow yet, regardless of subscription status.
type StatusFilter = 'all' | 'pending' | ClinicStatus;
type PayFilterKey = PaymentStatus | null;

// Fecha y hora exactas de la ultima conexion (la etiqueta relativa sola no
// alcanza cuando hay que cotejar con otra cosa).
function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

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
          {/* Chips en vez de pestanas: "Sin activar" y su contador se partian
              en tres renglones contra el subrayado. Una pastilla por filtro no
              se rompe y el numero entra adentro, junto a lo que cuenta. */}
          <div className="acc-chips">
            {STATUS_TABS.map(t => (
              <button
                key={t.key}
                type="button"
                className={`acc-chip ${statusFilter === t.key ? 'is-on' : ''}`}
                onClick={() => setStatusFilter(t.key)}
              >
                {t.label}
                <span className="acc-chip__n">{tabCounts[t.key]}</span>
              </button>
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
        </div>
        {/* Tarjetas en vez de tabla: con siete columnas habia que deslizarse
            para leer una fila entera, y las de la derecha (pago, ultimo acceso)
            son justo las que se miran. Apilado entra todo de una. */}
        <div className="acc-list">
          {filtered.map(c => (
            <ClinicCard key={c._id} clinic={c} onOpen={() => openDrawer(c._id)} />
          ))}
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

function ClinicCard({
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
    <button type="button" className="acc-card" onClick={onOpen}>
      <div className="acc-card__head">
        <ClinicLogo
          color={clinic.brandColor}
          size={38}
          logoStyle={clinic.logoStyle}
          initials={initials}
        />
        <div className="acc-card__id">
          <div className="acc-card__name">{clinic.name}</div>
          <div className="acc-card__sub">
            {clinic.doctorName ?? '—'} · {clinic.city ?? '—'}
          </div>
          <div className="acc-card__slug mono">{clinic.slug}</div>
        </div>
        <Icon name="chevronRight" size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
      </div>

      <div className="acc-card__badges">
        <AccStatusBadge status={clinic.status} activated={clinic.activated} />
        <PayBadge paymentStatus={clinic.paymentStatus} daysToDue={clinic.daysToDue} />
        {/* Solo cuando el consultorio esta limitado de verdad. Un chip por cada
            cuenta al dia seria ruido: lo normal no necesita etiqueta. */}
        {clinic.status !== 'SUSPENDED' && clinic.access.level === 'readonly' && (
          <span className="acc-lim">Solo lectura</span>
        )}
        {clinic.status !== 'SUSPENDED' && clinic.access.level === 'blocked' && (
          <span className="acc-lim">Sin acceso</span>
        )}
      </div>

      <div className="acc-card__foot">
        {/* "hace 1 dia" para el pantallazo y la fecha exacta al lado, que es lo
            que sirve cuando hay que cruzarlo con algo (un reclamo, un pago). */}
        <span className="acc-card__seen">
          <LastSeenCell
            lastSeenAt={clinic.lastSeenAt}
            lastLoginAt={clinic.lastLoginAt}
          />
          {(clinic.lastSeenAt ?? clinic.lastLoginAt) && (
            <span className="acc-card__exact mono">
              {fechaHora((clinic.lastSeenAt ?? clinic.lastLoginAt)!)}
            </span>
          )}
        </span>
        <span className="acc-card__pac">
          {clinic.patientsCount
            ? `${clinic.patientsCount.toLocaleString('es-AR')} pacientes`
            : 'Sin pacientes'}
        </span>
      </div>
    </button>
  );
}
