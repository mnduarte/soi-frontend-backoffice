import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from './common/Icon';
import {
  AccStatusBadge,
  Banner,
  ClinicLogo,
  ConsoleMetric,
  PayBadge,
  SectionTitle,
} from './common/primitives';
import { ClinicUsersSection } from './ClinicUsersSection';
import {
  adminClinicsApi,
  type ClinicListItem,
  type PaymentStatus,
} from '../api/admin-clinics';
import { useUIStore } from '../store/ui.store';
import { formatDateLong, formatLastSeen, money } from '../lib/format';

const CORE_APP_URL =
  (import.meta.env as { VITE_CORE_APP_URL?: string }).VITE_CORE_APP_URL ?? 'http://localhost:5173';

// Quick-pick brand colors (same set as the dentist app). A native color input
// covers anything outside the palette.
const BRAND_PALETTE = ['#2F54EB', '#0EA5E9', '#06A37A', '#7C3AED', '#E11D48', '#D97706', '#DB2777'];

const EDIT_LABEL: CSSProperties = {
  fontSize: 11.5,
  color: 'var(--text-tertiary)',
  marginBottom: 5,
  fontWeight: 500,
};
const EDIT_INPUT: CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 11px',
  fontSize: 13,
  borderRadius: 8,
  border: '1px solid var(--border-default)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  outline: 'none',
};

// =============================================================================
// PaymentNotice — contextual banner shown inside the drawer body. Mirrors what
// the dentist sees from inside their app.
// =============================================================================

function PaymentNotice({ clinic }: { clinic: ClinicListItem }) {
  const { paymentStatus, daysToDue, subscriptionEndsAt, trialEndsAt, status } = clinic;
  // Trials track against trialEndsAt; everything else uses subscriptionEndsAt.
  // We surface this as a "trial" prefix so the operator knows what's about to
  // happen (end of free period vs missed payment).
  const isTrial = status === 'TRIAL';
  const dueDate = isTrial ? trialEndsAt : subscriptionEndsAt;
  const dueLabel = isTrial ? 'Fin de la prueba' : 'Próximo vencimiento';

  if (paymentStatus === 'pending') {
    return (
      <Banner
        tone="info"
        icon="alert"
        title="Cuenta sin activar"
        body="Todavía no se registró un pago. La cuenta está en período de prueba."
      />
    );
  }
  if (paymentStatus === 'ok') {
    return (
      <Banner
        tone="info"
        icon="checkCircle"
        title={isTrial ? 'En período de prueba' : 'Pago al día'}
        body={`${dueLabel}: ${formatDateLong(dueDate)} · faltan ${daysToDue ?? 0} días.`}
      />
    );
  }
  if (paymentStatus === 'due-soon') {
    return (
      <Banner
        tone="warning"
        icon="clock"
        title={
          isTrial
            ? `La prueba termina en ${daysToDue ?? 0} ${(daysToDue ?? 0) === 1 ? 'día' : 'días'}`
            : `Vence en ${daysToDue ?? 0} ${(daysToDue ?? 0) === 1 ? 'día' : 'días'}`
        }
        body={`El consultorio ve un aviso amarillo. ${dueLabel}: ${formatDateLong(dueDate)}.`}
      />
    );
  }
  if (paymentStatus === 'overdue') {
    const over = Math.abs(daysToDue ?? 0);
    return (
      <Banner
        tone="warningStrong"
        icon="alert"
        title={
          isTrial
            ? `Prueba terminada hace ${over} ${over === 1 ? 'día' : 'días'}`
            : `Pago vencido hace ${over} ${over === 1 ? 'día' : 'días'}`
        }
        body={
          isTrial
            ? 'La cuenta sigue activa dentro de la tolerancia. Coordiná el primer pago para no perder los datos.'
            : 'Dentro de la tolerancia. Se le pide regularizar la situación.'
        }
      />
    );
  }
  // grace-end
  const over = Math.abs(daysToDue ?? 0);
  return (
    <Banner
      tone="danger"
      icon="ban"
      title={`${isTrial ? 'Prueba terminada' : 'Vencido'} hace ${over} días — suspensión inminente`}
      body="Se le avisó que en los próximos días no podrá iniciar sesión. Suspendé o extendé la prórroga."
    />
  );
}

// =============================================================================
// DetailRow — label/value row used in the body sections.
// =============================================================================

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{children}</span>
    </div>
  );
}

// =============================================================================
// AccountDetailDrawer — controlled by useUIStore.drawerClinicId.
// =============================================================================

export function AccountDetailDrawer() {
  const clinicId = useUIStore(s => s.drawerClinicId);
  const close = useUIStore(s => s.closeDrawer);
  const showToast = useUIStore(s => s.showToast);
  const qc = useQueryClient();

  const { data: clinic } = useQuery({
    queryKey: ['admin-clinic', clinicId],
    queryFn: () => adminClinicsApi.findById(clinicId!),
    enabled: Boolean(clinicId),
  });

  // Editable profile fields, synced from the loaded clinic.
  const [form, setForm] = useState({ name: '', doctorName: '', brandColor: '#2F54EB' });
  useEffect(() => {
    if (clinic) {
      setForm({ name: clinic.name, doctorName: clinic.doctorName ?? '', brandColor: clinic.brandColor });
    }
  }, [clinic?._id]);

  // Esc closes the drawer.
  useEffect(() => {
    if (!clinicId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [clinicId, close]);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['admin-clinics'] });
    qc.invalidateQueries({ queryKey: ['admin-metrics'] });
    qc.invalidateQueries({ queryKey: ['admin-clinic', clinicId] });
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      adminClinicsApi.update(clinicId!, {
        name: form.name.trim(),
        doctorName: form.doctorName.trim(),
        brandColor: form.brandColor,
      }),
    onSuccess: () => {
      showToast('Cambios guardados');
      refreshAll();
    },
  });

  const paymentMutation = useMutation({
    mutationFn: () => adminClinicsApi.recordPayment(clinicId!),
    onSuccess: () => {
      showToast(`Pago registrado — ${clinic?.name ?? ''}`);
      refreshAll();
    },
  });
  const extendMutation = useMutation({
    mutationFn: () => adminClinicsApi.extendSubscription(clinicId!, 7),
    onSuccess: () => {
      showToast(`Prórroga de 7 días — ${clinic?.name ?? ''}`);
      refreshAll();
    },
  });
  const suspendMutation = useMutation({
    mutationFn: () => adminClinicsApi.suspend(clinicId!),
    onSuccess: () => {
      showToast(`${clinic?.name ?? ''} suspendido`);
      refreshAll();
    },
  });
  const reactivateMutation = useMutation({
    mutationFn: () => adminClinicsApi.reactivate(clinicId!),
    onSuccess: () => {
      showToast(`${clinic?.name ?? ''} reactivado`);
      refreshAll();
    },
  });
  const impersonateMutation = useMutation({
    mutationFn: () => adminClinicsApi.impersonate(clinicId!),
    onSuccess: data => {
      // Open the clinic app in a new tab carrying the short-lived JWT. The
      // core-app-frontend reads `?imp=...` and signs the operator in as the
      // OWNER user with a persistent banner.
      window.open(`${CORE_APP_URL}/login?imp=${data.accessToken}`, '_blank');
    },
  });

  if (!clinicId) return null;

  const c: ClinicListItem | undefined = clinic;
  const ls = formatLastSeen(c?.lastLoginAt ?? null);
  const due = c?.subscriptionEndsAt ?? null;
  const pendingPayActions: PaymentStatus[] = ['due-soon', 'overdue', 'grace-end'];
  const showPayActions =
    c && pendingPayActions.includes(c.paymentStatus) && c.status !== 'TRIAL';

  const dirty =
    !!c &&
    (form.name.trim() !== c.name ||
      form.doctorName.trim() !== (c.doctorName ?? '') ||
      form.brandColor.toLowerCase() !== c.brandColor.toLowerCase());

  return (
    <>
      <div
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(2px)',
          zIndex: 80,
          display: 'flex',
          justifyContent: 'flex-end',
          animation: 'fadeIn 0.18s ease-out',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: 440,
            maxWidth: '100%',
            height: '100%',
            background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-xl)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {!c ? (
            <div style={{ padding: 24, color: 'var(--text-tertiary)' }}>Cargando…</div>
          ) : (
            <>
              {/* header */}
              <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="row row--between" style={{ marginBottom: 14 }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 600,
                    }}
                  >
                    Consultorio
                  </span>
                  <button className="btn btn--ghost btn--icon" onClick={close}>
                    <Icon name="x" size={16} />
                  </button>
                </div>
                <div className="row" style={{ gap: 13 }}>
                  <ClinicLogo
                    color={c.brandColor}
                    size={52}
                    logoStyle={c.logoStyle}
                    initials={c.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 1 }}>
                      {c.doctorName ?? '—'}
                    </div>
                    <div className="row" style={{ gap: 7, marginTop: 7 }}>
                      <AccStatusBadge status={c.status} activated={c.activated} />
                      <PayBadge paymentStatus={c.paymentStatus} daysToDue={c.daysToDue} />
                    </div>
                  </div>
                </div>
              </div>

              {/* body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                <div style={{ marginBottom: 18 }}>
                  <PaymentNotice clinic={c} />
                </div>

                {/* quick stats */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  <ConsoleMetric
                    label="Pacientes"
                    value={c.patientsCount.toLocaleString('es-AR')}
                  />
                  <ConsoleMetric
                    label="Último acceso"
                    value={
                      <span style={{ fontSize: 14, fontWeight: 600 }}>
                        {ls.label}
                      </span>
                    }
                  />
                </div>

                {/* impersonate */}
                <button
                  className="btn btn--secondary"
                  disabled={impersonateMutation.isPending}
                  onClick={() => impersonateMutation.mutate()}
                  style={{ width: '100%', marginBottom: 20 }}
                >
                  <Icon name="eye" size={14} />{' '}
                  {impersonateMutation.isPending
                    ? 'Abriendo…'
                    : `Impersonar — ver como ${(c.doctorName ?? 'el OWNER')
                        .split(' ')
                        .slice(0, 2)
                        .join(' ')}`}
                </button>

                <SectionTitle>Editar consultorio</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  <label style={{ display: 'block' }}>
                    <div style={EDIT_LABEL}>Nombre del consultorio</div>
                    <input
                      style={EDIT_INPUT}
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </label>
                  <label style={{ display: 'block' }}>
                    <div style={EDIT_LABEL}>Doctor/a</div>
                    <input
                      style={EDIT_INPUT}
                      value={form.doctorName}
                      onChange={e => setForm(f => ({ ...f, doctorName: e.target.value }))}
                    />
                  </label>
                  <div>
                    <div style={EDIT_LABEL}>Color de marca</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {BRAND_PALETTE.map(col => {
                        const active = form.brandColor.toLowerCase() === col.toLowerCase();
                        return (
                          <button
                            key={col}
                            type="button"
                            title={col}
                            onClick={() => setForm(f => ({ ...f, brandColor: col }))}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 7,
                              background: col,
                              cursor: 'pointer',
                              border: active ? '2px solid var(--text-primary)' : '2px solid transparent',
                              boxShadow: '0 0 0 1px var(--border-subtle)',
                            }}
                          />
                        );
                      })}
                      <input
                        type="color"
                        value={form.brandColor}
                        onChange={e => setForm(f => ({ ...f, brandColor: e.target.value }))}
                        title="Color personalizado"
                        style={{ width: 30, height: 30, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                  <button
                    className="btn btn--primary btn--sm"
                    style={{ alignSelf: 'flex-start' }}
                    disabled={!dirty || updateMutation.isPending}
                    onClick={() => updateMutation.mutate()}
                  >
                    <Icon name="check" size={13} />{' '}
                    {updateMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>

                <SectionTitle>Datos de la cuenta</SectionTitle>
                <div style={{ marginBottom: 8 }}>
                  <DetailRow label="Usuario">
                    <span className="mono">{c.slug}</span>
                  </DetailRow>
                  <DetailRow label="Localidad">{c.city ?? '—'}</DetailRow>
                  <DetailRow label="WhatsApp">{c.phone ?? '—'}</DetailRow>
                  <DetailRow label="Email">
                    {c.contactEmail || <span style={{ color: 'var(--text-tertiary)' }}>Sin email</span>}
                  </DetailRow>
                  <DetailRow label="Alta">{formatDateLong(c.createdAt)}</DetailRow>
                </div>

                <SectionTitle>Facturación</SectionTitle>
                <div style={{ marginBottom: 8 }}>
                  <DetailRow label="Plan">Mensual · {money(28000)}</DetailRow>
                  <DetailRow
                    label={
                      c.paymentStatus === 'overdue' || c.paymentStatus === 'grace-end'
                        ? 'Venció'
                        : 'Próximo cobro'
                    }
                  >
                    {due ? formatDateLong(due) : '—'}
                  </DetailRow>
                  <DetailRow label="Estado de pago">
                    <PayBadge paymentStatus={c.paymentStatus} daysToDue={c.daysToDue} />
                  </DetailRow>
                </div>

                {showPayActions && (
                  <div className="row" style={{ gap: 8, marginTop: 12 }}>
                    <button
                      className="btn btn--primary btn--sm"
                      style={{ flex: 1 }}
                      onClick={() => paymentMutation.mutate()}
                      disabled={paymentMutation.isPending}
                    >
                      <Icon name="check" size={13} /> Registrar pago
                    </button>
                    <button
                      className="btn btn--secondary btn--sm"
                      style={{ flex: 1 }}
                      onClick={() => extendMutation.mutate()}
                      disabled={extendMutation.isPending}
                    >
                      <Icon name="clock" size={13} /> Dar prórroga
                    </button>
                  </div>
                )}

                <ClinicUsersSection clinicId={clinicId} clinicName={c.name} />
              </div>

              {/* footer */}
              <div
                style={{
                  padding: '14px 20px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                {c.status === 'SUSPENDED' ? (
                  <button
                    className="btn btn--primary"
                    style={{ flex: 1 }}
                    onClick={() => reactivateMutation.mutate()}
                    disabled={reactivateMutation.isPending}
                  >
                    <Icon name="play" size={13} /> Reactivar cuenta
                  </button>
                ) : (
                  <button
                    className="btn btn--secondary"
                    style={{ flex: 1 }}
                    onClick={() => suspendMutation.mutate()}
                    disabled={suspendMutation.isPending}
                  >
                    <Icon name="pause" size={13} /> Suspender
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
