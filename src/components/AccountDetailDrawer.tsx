import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from './common/Icon';
import {
  AccStatusBadge,
  ClinicLogo,
  ConsoleMetric,
  PayBadge,
  SectionTitle,
} from './common/primitives';
import { ClinicUsersSection } from './ClinicUsersSection';
import {
  adminClinicsApi,
  type ClinicPaymentMethod,
  type MpPreapprovalStatus,
  type AccessLevel,
  type ClinicListItem,
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


// =============================================================================
const METHOD_LABEL: Record<ClinicPaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  MERCADO_PAGO: 'Mercado Pago',
  OTHER: 'Otro',
};

/** Qué está viviendo el consultorio, dicho como lo vive él. */
const ACCESO: Record<AccessLevel, { txt: string; sub: string; tono: string }> = {
  ok:       { txt: 'Acceso completo',  sub: 'Sin ningún aviso en pantalla', tono: 'var(--success)' },
  soft:     { txt: 'Acceso completo',  sub: 'Ve el aviso amarillo: "no nos figura el pago"', tono: 'var(--warning)' },
  firm:     { txt: 'Acceso completo',  sub: 'Ve el aviso naranja, anunciando la fecha del corte', tono: '#C2410C' },
  readonly: { txt: 'Solo lectura',     sub: 'Consulta fichas pero no puede cargar nada', tono: 'var(--danger)' },
  blocked:  { txt: 'Sin acceso',       sub: 'No puede iniciar sesión', tono: 'var(--danger)' },
};

const MP_LABEL: Record<MpPreapprovalStatus, string> = {
  pending: 'Falta que autorice',
  authorized: 'Activo',
  paused: 'Pausado',
  cancelled: 'Cancelado',
};

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
    qc.invalidateQueries({ queryKey: ['admin-clinic-payments', clinicId] });
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

  // Historial de pagos del consultorio.
  const { data: payments = [] } = useQuery({
    queryKey: ['admin-clinic-payments', clinicId],
    queryFn: () => adminClinicsApi.listPayments(clinicId!),
    enabled: !!clinicId,
  });

  // Alta de pago: el monto viene precargado con lo que paga este consultorio,
  // porque el caso normal es "pagó lo de siempre". Editable para los que no.
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(todayYMD());
  const [payMethod, setPayMethod] = useState<ClinicPaymentMethod>('TRANSFER');
  const [payNotes, setPayNotes] = useState('');
  const [payMonths, setPayMonths] = useState(1);
  // Instante de referencia, tomado al ABRIR el formulario. Leer el reloj
  // durante el render hace que dos renders del mismo estado den distinto.
  const [payRef, setPayRef] = useState(() => Date.now());

  const paymentMutation = useMutation({
    mutationFn: () =>
      adminClinicsApi.recordPayment(clinicId!, {
        months: payMonths,
        amount: payAmount ? Number(payAmount) : undefined,
        paidAt: new Date(`${payDate}T12:00:00`).toISOString(),
        method: payMethod,
        notes: payNotes.trim() || undefined,
      }),
    onSuccess: () => {
      showToast(`Pago registrado — ${clinic?.name ?? ''}`);
      setPayOpen(false);
      setPayNotes('');
      setPayMonths(1);
      refreshAll();
    },
  });

  const delPaymentMutation = useMutation({
    mutationFn: (paymentId: string) => adminClinicsApi.deletePayment(clinicId!, paymentId),
    onSuccess: () => { showToast('Pago borrado'); refreshAll(); },
  });

  // ---- Débito automático ----
  const mpCreateMutation = useMutation({
    mutationFn: () => adminClinicsApi.createMpSubscription(clinicId!),
    onSuccess: r => {
      showToast('Suscripción creada — mandale el link al consultorio');
      if (r.initPoint) void navigator.clipboard?.writeText(r.initPoint).catch(() => {});
      refreshAll();
    },
    onError: () => showToast('No se pudo crear la suscripción'),
  });
  const mpCancelMutation = useMutation({
    mutationFn: () => adminClinicsApi.cancelMpSubscription(clinicId!),
    onSuccess: () => { showToast('Débito automático cancelado'); refreshAll(); },
    onError: () => showToast('No se pudo cancelar'),
  });
  const mpSyncMutation = useMutation({
    mutationFn: () => adminClinicsApi.syncMpSubscription(clinicId!),
    onSuccess: r => { showToast(`Estado en Mercado Pago: ${MP_LABEL[r.status]}`); refreshAll(); },
    onError: () => showToast('No se pudo consultar'),
  });

  // Precio propio del consultorio. Vacío = vuelve al de lista.
  const [priceEdit, setPriceEdit] = useState<string | null>(null);
  const priceMutation = useMutation({
    mutationFn: (v: number | null) => adminClinicsApi.updatePrice(clinicId!, v),
    onSuccess: () => { showToast('Precio actualizado'); setPriceEdit(null); refreshAll(); },
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
  // Presencia SIN respaldo al login, a diferencia de la lista.
  //
  // En la lista hay una sola celda y ahí el respaldo evita que una cuenta con
  // meses de uso figure como "Nunca". Acá al lado está "Último ingreso" con ese
  // mismo dato: si esta caja también cayera al login, mostraría dos veces lo
  // mismo y volvería a hacer pasar el login por actividad — que es justo lo que
  // había que arreglar. Sin dato se dice que no hay dato.
  const ls = c?.lastSeenAt ? formatLastSeen(c.lastSeenAt) : null;
  const due = c?.subscriptionEndsAt ?? null;
  // Show payment/extension actions for any clinic (TRIAL, ACTIVE, or SUSPENDED).
  const showPayActions = Boolean(c);

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
                {/* Cómo viene la prueba. Lo primero que se quiere saber de una
                    cuenta nueva: desde cuándo, por qué mes va y cuándo empieza
                    a pagar. */}
                {c.trial && (
                  <div className="trial-box">
                    <div className="trial-box__top">
                      <Icon name="calendar" size={13} />
                      <b>
                        {c.trial.month > 0
                          ? `Prueba · mes ${c.trial.month} de ${c.trial.months}`
                          : 'Prueba terminada'}
                      </b>
                    </div>
                    <div className="trial-box__sub">
                      Desde el {formatDateLong(c.trial.startedAt)}
                      {c.trial.endsAt && (
                        <> · {c.trial.month > 0 ? 'termina' : 'terminó'} el {formatDateLong(c.trial.endsAt)}</>
                      )}
                    </div>
                    {c.trial.endsAt && c.trial.month > 0 && (
                      <div className="trial-box__sub">
                        Primer cobro el {formatDateLong(c.trial.endsAt)}
                      </div>
                    )}
                  </div>
                )}

                {/* Qué está viviendo el consultorio ahora. Sale de la misma
                    función que corta el acceso, así que no puede discrepar con
                    lo que el dentista ve en pantalla. */}
                {(() => {
                  const manual = c.status === 'SUSPENDED';
                  const finDePrueba =
                    c.access.trial && c.access.level === 'ok' && c.access.daysOverdue >= 0;
                  const a = manual
                    ? { txt: 'Suspendido a mano', sub: 'No puede iniciar sesión. Se reactiva desde acá.', tono: 'var(--danger)' }
                    : finDePrueba
                      ? { txt: 'Acceso completo', sub: 'Ve el aviso de que terminaron sus dos meses de prueba', tono: 'var(--warning)' }
                      : ACCESO[c.access.level];
                  const vencido = c.access.daysOverdue > 0;
                  return (
                    <div className="acceso-box" style={{ borderColor: a.tono }}>
                      <div className="acceso-box__top">
                        <span className="acceso-box__dot" style={{ background: a.tono }} />
                        <span className="acceso-box__txt" style={{ color: a.tono }}>{a.txt}</span>
                        {!manual && vencido && (
                          <span className="acceso-box__dias">
                            {c.access.daysOverdue} {c.access.daysOverdue === 1 ? 'día' : 'días'} de atraso
                          </span>
                        )}
                      </div>
                      <div className="acceso-box__sub">{a.sub}</div>
                      {!manual && c.access.readonlyAt && c.access.level !== 'readonly' && c.access.level !== 'blocked' && (
                        <div className="acceso-box__sub">
                          Pasa a solo lectura el {formatDateLong(c.access.readonlyAt)}
                          {c.access.blockedAt ? ` · sin acceso el ${formatDateLong(c.access.blockedAt)}` : ''}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Lo primero: registrar el pago es la razon por la que se
                    abre una cuenta nueve de cada diez veces. Estaba al final,
                    despues de datos, facturacion, debito e historial. */}
                {/* Formulario de alta. Se abre al tocar "Registrar pago": antes
                    el boton cobraba de una y no dejaba rastro de cuanto ni como. */}
                {payOpen && (
                  <div className="pay-form">
                    <div className="pay-form__row">
                      <label className="pay-form__f">
                        <span>Monto</span>
                        <input
                          className="input"
                          inputMode="numeric"
                          autoFocus
                          placeholder={String(c.effectivePrice * payMonths)}
                          value={payAmount}
                          onChange={e => setPayAmount(e.target.value.replace(/[^\d]/g, ''))}
                        />
                      </label>
                      <label className="pay-form__f">
                        <span>Fecha</span>
                        <input
                          type="date"
                          className="input"
                          value={payDate}
                          onChange={e => setPayDate(e.target.value)}
                        />
                      </label>
                    </div>
                    <label className="pay-form__f">
                      <span>Medio</span>
                      <div className="acc-chips">
                        {(Object.keys(METHOD_LABEL) as ClinicPaymentMethod[]).map(m => (
                          <button
                            key={m}
                            type="button"
                            className={`acc-chip ${payMethod === m ? 'is-on' : ''}`}
                            onClick={() => setPayMethod(m)}
                          >
                            {METHOD_LABEL[m]}
                          </button>
                        ))}
                      </div>
                    </label>
                    <label className="pay-form__f">
                      <span>Meses que cubre</span>
                      <div className="acc-chips">
                        {[1, 2, 3, 6, 12].map(m => (
                          <button
                            key={m}
                            type="button"
                            className={`acc-chip ${payMonths === m ? 'is-on' : ''}`}
                            onClick={() => setPayMonths(m)}
                          >
                            {m === 1 ? '1 mes' : `${m} meses`}
                          </button>
                        ))}
                      </div>
                    </label>

                    {/* La consecuencia, antes de confirmar. Es lo que evita
                        registrar dos veces sin darse cuenta: si ya estaba pago,
                        acá se ve que el mes se SUMA y hasta cuándo queda. */}
                    {(() => {
                      const cubierto = c.subscriptionEndsAt ? new Date(c.subscriptionEndsAt) : null;
                      const desde = cubierto && cubierto.getTime() > payRef ? cubierto : new Date(payRef);
                      const hasta = new Date(desde);
                      hasta.setMonth(hasta.getMonth() + payMonths);
                      const yaPago = cubierto && cubierto.getTime() > payRef;
                      return (
                        <div className="pay-form__hasta">
                          {yaPago && (
                            <>Ya está pago hasta el <b>{formatDateLong(cubierto)}</b>. </>
                          )}
                          Con este pago queda hasta el <b>{formatDateLong(hasta.toISOString())}</b>.
                        </div>
                      );
                    })()}

                    <label className="pay-form__f">
                      <span>Nota (opcional)</span>
                      <input
                        className="input"
                        placeholder="Ej: pagó los dos meses juntos"
                        value={payNotes}
                        onChange={e => setPayNotes(e.target.value)}
                      />
                    </label>
                    <div className="row" style={{ gap: 8, marginTop: 4 }}>
                      <button
                        className="btn btn--primary btn--sm"
                        style={{ flex: 1 }}
                        onClick={() => paymentMutation.mutate()}
                        disabled={paymentMutation.isPending}
                      >
                        <Icon name="check" size={13} /> Guardar pago
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={() => setPayOpen(false)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                {showPayActions && !payOpen && (
                  <div className="row" style={{ gap: 8, marginTop: 12 }}>
                    <button
                      className="btn btn--primary btn--sm"
                      style={{ flex: 1 }}
                      onClick={() => { setPayAmount(''); setPayDate(todayYMD()); setPayRef(Date.now()); setPayOpen(true); }}
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
                  {/* Presencia: "¿está adentro ahora?". Antes esta caja decía
                      "Último acceso" pero mostraba el último LOGIN, así que
                      marcaba "En línea ahora" a quien entró y cerró la
                      notebook. Ahora sale del latido de la app. */}
                  <ConsoleMetric
                    label="Actividad"
                    value={
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {ls?.online && (
                          <span
                            className="dot"
                            style={{ background: 'var(--success)' }}
                          />
                        )}
                        {ls ? (
                          ls.label
                        ) : (
                          <span
                            style={{
                              color: 'var(--text-tertiary)',
                              fontWeight: 500,
                            }}
                          >
                            Sin registro aún
                          </span>
                        )}
                      </span>
                    }
                  />
                  {/* Uso: "¿sigue usándolo?". Es otra pregunta y la presencia
                      no la contesta — se puede tener la pestaña abierta todo
                      el día sin cargar nada, que es exactamente cómo se ve un
                      cliente antes de irse. */}
                  <ConsoleMetric
                    label="Turnos · 7 días"
                    value={
                      <span style={{ fontSize: 14, fontWeight: 600 }}>
                        {c.turnos7d === undefined ? '—' : c.turnos7d}
                      </span>
                    }
                  />
                  <ConsoleMetric
                    label="Último ingreso"
                    value={
                      <span style={{ fontSize: 14, fontWeight: 600 }}>
                        {c.lastLoginAt ? formatLastSeen(c.lastLoginAt).label : 'Nunca'}
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
                  {/* Estaba fijo en 28.000 sin importar lo configurado: mostraba
                      un numero que podia no ser el que se cobraba. */}
                  <DetailRow label="Plan">
                    {priceEdit === null ? (
                      <span className="row" style={{ gap: 8 }}>
                        Mensual · {money(c.effectivePrice)}
                        {c.planPriceMonthly == null && (
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            (precio de lista)
                          </span>
                        )}
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => setPriceEdit(String(c.planPriceMonthly ?? ''))}
                        >
                          <Icon name="edit" size={12} /> Cambiar
                        </button>
                      </span>
                    ) : (
                      <span className="row" style={{ gap: 6 }}>
                        <input
                          className="input"
                          inputMode="numeric"
                          autoFocus
                          placeholder={String(c.effectivePrice)}
                          value={priceEdit}
                          onChange={e => setPriceEdit(e.target.value.replace(/[^\d]/g, ''))}
                          style={{ width: 110, height: 30 }}
                        />
                        <button
                          className="btn btn--primary btn--sm"
                          onClick={() => priceMutation.mutate(priceEdit ? Number(priceEdit) : null)}
                          disabled={priceMutation.isPending}
                        >
                          <Icon name="check" size={12} />
                        </button>
                        <button className="btn btn--ghost btn--sm" onClick={() => setPriceEdit(null)}>
                          <Icon name="x" size={13} />
                        </button>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          vacío = precio de lista
                        </span>
                      </span>
                    )}
                  </DetailRow>
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


                {/* Débito automático. El dentista autoriza UNA vez desde el link
                    y de ahí Mercado Pago cobra solo; el webhook asienta cada
                    cobro y corre el vencimiento sin que nadie toque nada. */}
                <SectionTitle>Débito automático</SectionTitle>
                <div className="mp-box">
                  {!c.mpPreapprovalStatus || c.mpPreapprovalStatus === 'cancelled' ? (
                    <>
                      <div className="mp-box__msg">
                        Sin débito automático. Hoy hay que pedirle el pago todos los meses.
                      </div>
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={() => mpCreateMutation.mutate()}
                        disabled={mpCreateMutation.isPending || !c.contactEmail}
                        title={c.contactEmail ? undefined : 'Necesita un email de contacto'}
                      >
                        <Icon name="creditCard" size={13} /> Activar débito automático
                      </button>
                      {!c.contactEmail && (
                        <div className="mp-box__warn">
                          Cargale un email de contacto: Mercado Pago lo necesita.
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <DetailRow label="Estado">
                        <span className={`mp-state is-${c.mpPreapprovalStatus}`}>
                          {MP_LABEL[c.mpPreapprovalStatus]}
                        </span>
                      </DetailRow>
                      <DetailRow label="Primer cobro">
                        {c.mpFirstChargeAt ? formatDateLong(c.mpFirstChargeAt) : '—'}
                      </DetailRow>
                      {c.mpLastFailureAt && (
                        <DetailRow label="Último rechazo">
                          <span style={{ color: 'var(--danger)' }}>
                            {formatDateLong(c.mpLastFailureAt)} · revisá la tarjeta con el Dr.
                          </span>
                        </DetailRow>
                      )}
                      {c.mpPreapprovalStatus === 'pending' && c.mpInitPoint && (
                        <div className="mp-box__link">
                          <span>Mandale este link para que autorice:</span>
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() => {
                              void navigator.clipboard?.writeText(c.mpInitPoint!).catch(() => {});
                              showToast('Link copiado');
                            }}
                          >
                            <Icon name="link" size={13} /> Copiar link
                          </button>
                        </div>
                      )}
                      <div className="row" style={{ gap: 8, marginTop: 10 }}>
                        <button
                          className="btn btn--secondary btn--sm"
                          onClick={() => mpSyncMutation.mutate()}
                          disabled={mpSyncMutation.isPending}
                          title="Releer el estado en Mercado Pago"
                        >
                          <Icon name="refresh" size={13} /> Actualizar
                        </button>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => mpCancelMutation.mutate()}
                          disabled={mpCancelMutation.isPending}
                          style={{ color: 'var(--danger)' }}
                        >
                          Cancelar débito
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Historial. Sin esto el sistema sabia HASTA CUANDO estaba paga
                    una cuenta, pero no que se pago, cuando ni cuanto. */}
                {payments.length > 0 && (
                  <>
                    <SectionTitle>Pagos ({payments.length})</SectionTitle>
                    <div className="pay-list">
                      {payments.map(pg => (
                        <div key={pg._id} className="pay-item">
                          <div className="pay-item__main">
                            <span className="pay-item__amount mono">{money(pg.amount)}</span>
                            <span className="pay-item__meta">
                              {formatDateLong(pg.paidAt)} · {METHOD_LABEL[pg.method]}
                            </span>
                            {pg.notes && <span className="pay-item__note">{pg.notes}</span>}
                          </div>
                          <button
                            className="btn btn--ghost btn--icon btn--sm"
                            title="Borrar este pago"
                            onClick={() => delPaymentMutation.mutate(pg._id)}
                            style={{ color: 'var(--danger)' }}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
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
