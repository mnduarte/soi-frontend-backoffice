import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import {
  ClinicLogo,
  CopyField,
  initialsOf,
} from '../components/common/primitives';
import { adminClinicsApi, type LogoStyle } from '../api/admin-clinics';
import { useUIStore } from '../store/ui.store';
import { slugify } from '../lib/format';

const BRAND_OPTIONS = [
  '#2F54EB', '#0EA5E9', '#06A37A', '#7C3AED',
  '#E11D48', '#D97706', '#0F766E', '#DB2777',
];

function generatePassword(): string {
  const adj = ['sol', 'rio', 'mar', 'luz', 'pan', 'ave', 'tren', 'faro'];
  const word = adj[Math.floor(Math.random() * adj.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${n}`;
}

function suggestUsername(clinic: string, doctor: string): string {
  const fromClinic = slugify(clinic);
  if (fromClinic) return fromClinic;
  const last = doctor
    .split(/\s+/)
    .filter(w => !/^dr|^dra/i.test(w))
    .pop();
  return slugify(last ?? '');
}

export default function NewAccountPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const showToast = useUIStore(s => s.showToast);

  const [clinic, setClinic] = useState('');
  const [doctor, setDoctor] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [brand, setBrand] = useState(BRAND_OPTIONS[0]);
  const [logoStyle] = useState<LogoStyle>('tooth');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [channel, setChannel] = useState<'whatsapp' | 'link'>('whatsapp');
  const [msgOverride, setMsgOverride] = useState<string | null>(null);

  // Suggested username derived from clinic/doctor names. NOT auto-applied — the
  // operator chooses to use it with the "Usar sugerencia" button so the clinic
  // display name and the login slug stay decoupled (the dentist might want
  // "Consultorio Matias Duarte" as the name but `mduarte` as the username).
  const suggestion = useMemo(() => suggestUsername(clinic, doctor), [clinic, doctor]);

  const slug = slugify(username);

  const { data: slugCheck } = useQuery({
    queryKey: ['admin-slug-check', slug],
    queryFn: () => adminClinicsApi.checkSlug(slug),
    enabled: slug.length >= 3,
  });
  const taken = slug.length >= 3 && slugCheck?.available === false;

  const inviteLink = `${import.meta.env.VITE_CORE_APP_URL ?? 'http://localhost:5173'}/login?u=${slug || 'consultorio'}`;
  const initials = initialsOf(clinic || 'Co');

  // Default WhatsApp message body — editable. Re-derived live while the user
  // hasn't typed anything, frozen once they edit.
  const firstName = doctor.replace(/^(dra|dr)\.?\s*/i, '').split(/\s+/)[0] || '';
  const defaultMsg = useMemo(
    () =>
      `¡Hola${firstName ? ' ' + firstName : ''}! 👋 Te damos la bienvenida a SOI (Sistema Odontológico Integral) para tu consultorio.

Tu acceso:
🔗 ${inviteLink}
👤 Usuario: ${slug || '—'}
🔑 Contraseña: ${password}

Al entrar vas a poder cambiar la contraseña. ¡Cualquier duda escribinos!`,
    [firstName, inviteLink, slug, password],
  );
  // The textarea shows the override if the operator typed anything, otherwise
  // it always reflects the latest auto-generated message — that way edits to
  // username/password/clinic keep the preview in sync.
  const msg = msgOverride ?? defaultMsg;

  const createMutation = useMutation({
    mutationFn: () =>
      adminClinicsApi.create({
        name: clinic.trim(),
        doctorName: doctor.trim(),
        city: city.trim() || undefined,
        phone: phone.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        slug: slug || undefined,
        password,
        brandColor: brand,
        logoStyle,
      }),
    onSuccess: data => {
      qc.invalidateQueries({ queryKey: ['admin-clinics'] });
      qc.invalidateQueries({ queryKey: ['admin-metrics'] });
      const credsLine = `${data.ownerCredentials.username} / ${data.ownerCredentials.tempPassword}`;
      if (channel === 'whatsapp' && phone) {
        const url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
        showToast(`Invitación abierta para WhatsApp · ${credsLine}`);
      } else {
        navigator.clipboard?.writeText(inviteLink).catch(() => {});
        showToast(`Link copiado · ${credsLine}`);
      }
      navigate('/accounts');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(typeof msg === 'string' ? msg : 'No se pudo crear');
    },
  });

  const canCreate =
    clinic.trim().length > 0
    && doctor.trim().length > 0
    && slug.length >= 3
    && !taken
    && (channel === 'link' || phone.trim().length > 0);

  return (
    <div className="content fade-in" style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => navigate('/accounts')}
            style={{ marginBottom: 8, paddingLeft: 0 }}
          >
            <Icon name="arrowLeft" size={14} /> Volver a consultorios
          </button>
          <h1 className="page-title">Nuevo consultorio</h1>
          <div className="page-sub">Cargá los datos, generá el acceso y enviá la invitación.</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 20,
          alignItems: 'start',
        }}
        className="na-grid"
      >
        {/* ============================== FORM ============================== */}
        <div className="col" style={{ gap: 16 }}>
          {/* Datos */}
          <div className="card">
            <div className="card__header">
              <div className="card__title">Datos del consultorio</div>
            </div>
            <div className="card__body col" style={{ gap: 14 }}>
              <div className="form-row form-row--2">
                <Field label="Nombre del consultorio" req>
                  <input
                    className="input"
                    placeholder="Ej. Sonrisas del Sur"
                    value={clinic}
                    onChange={e => setClinic(e.target.value)}
                  />
                </Field>
                <Field label="Doctor/a a cargo" req>
                  <input
                    className="input"
                    placeholder="Ej. Dra. Renata Acosta"
                    value={doctor}
                    onChange={e => setDoctor(e.target.value)}
                  />
                </Field>
              </div>
              <div className="form-row form-row--2">
                <Field label="Localidad">
                  <input
                    className="input"
                    placeholder="Ej. Caseros"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                  />
                </Field>
                <Field
                  label="WhatsApp"
                  req={channel === 'whatsapp'}
                  hint={channel === 'whatsapp' ? 'Para enviar la invitación' : 'Opcional'}
                >
                  <input
                    className="input"
                    placeholder="+54 9 11 …"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Email" hint="Opcional — puede no tener">
                <input
                  className="input"
                  placeholder="hola@consultorio.com"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Marca */}
          <div className="card">
            <div className="card__header">
              <div>
                <div className="card__title">Marca</div>
                <div className="card__sub">Cómo se ve su app</div>
              </div>
            </div>
            <div className="card__body col" style={{ gap: 16 }}>
              <Field label="Color de los botones">
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  {BRAND_OPTIONS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBrand(c)}
                      title={c}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: c,
                        cursor: 'pointer',
                        border:
                          brand === c
                            ? '2px solid var(--text-primary)'
                            : '2px solid transparent',
                        boxShadow:
                          brand === c
                            ? '0 0 0 2px var(--bg-surface) inset'
                            : 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                      }}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Logo" hint="Por defecto usa el diente de SOI">
                <div
                  className="row"
                  style={{
                    gap: 9,
                    padding: '7px 12px 7px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12.5,
                    fontWeight: 500,
                    border: '1.5px solid var(--brand-primary)',
                    background: 'var(--brand-primary-50)',
                    color: 'var(--brand-primary-600)',
                    display: 'inline-flex',
                    alignSelf: 'flex-start',
                  }}
                >
                  <ClinicLogo color={brand} size={30} logoStyle="tooth" />
                  Diente (default)
                </div>
              </Field>
            </div>
          </div>

          {/* Acceso */}
          <div className="card">
            <div className="card__header">
              <div>
                <div className="card__title">Acceso</div>
                <div className="card__sub">El usuario lo elegís vos · la contraseña es temporal</div>
              </div>
            </div>
            <div className="card__body col" style={{ gap: 14 }}>
              <Field
                label="Usuario"
                hint="Único por consultorio · mínimo 3 caracteres"
                error={
                  taken
                    ? 'Ese usuario ya existe'
                    : slug.length > 0 && slug.length < 3
                    ? `Faltan ${3 - slug.length} caracteres`
                    : null
                }
              >
                <input
                  className="input mono"
                  placeholder={suggestion ? `Ej. ${suggestion}` : 'Ej. matias-duarte'}
                  value={username}
                  // Lightly normalize (lowercase + drop spaces) but accept
                  // dots, dashes, underscores, anything else literally — no
                  // live slugify because trimming trailing dots while the
                  // operator is mid-type makes the input feel like it's
                  // rejecting characters.
                  onChange={e =>
                    setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))
                  }
                  style={
                    taken || (slug.length > 0 && slug.length < 3)
                      ? { borderColor: 'var(--danger)' }
                      : undefined
                  }
                />
                <div
                  className="row"
                  style={{ gap: 10, marginTop: 6, fontSize: 11.5, flexWrap: 'wrap' }}
                >
                  {slug.length >= 3 && !taken && (
                    <span className="row" style={{ gap: 5, color: 'var(--success)' }}>
                      <Icon name="checkCircle" size={13} /> Disponible
                    </span>
                  )}
                  {suggestion && suggestion !== slug && (
                    <button
                      type="button"
                      onClick={() => setUsername(suggestion)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--brand-primary-600)',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 11.5,
                      }}
                    >
                      Usar sugerencia: <b className="mono">{suggestion}</b>
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Contraseña temporal" hint="La cambia en el primer ingreso">
                <div className="row" style={{ gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <CopyField value={password} reveal mono />
                  </div>
                  <button
                    className="btn btn--secondary btn--icon"
                    title="Generar otra"
                    onClick={() => setPassword(generatePassword())}
                  >
                    <Icon name="refresh" size={14} />
                  </button>
                </div>
              </Field>
            </div>
          </div>
        </div>

        {/* ============================== PREVIEW / SEND ============================== */}
        <div className="col" style={{ gap: 16, position: 'sticky', top: 0 }}>
          {/* preview */}
          <div className="card">
            <div className="card__header">
              <div className="card__title">Vista previa</div>
            </div>
            <div className="card__body" style={{ background: 'var(--bg-muted)' }}>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 22,
                  textAlign: 'center',
                }}
              >
                <ClinicLogo color={brand} size={48} logoStyle={logoStyle} initials={initials} />
                <div style={{ fontWeight: 600, fontSize: 15, marginTop: 12 }}>
                  {clinic || 'Tu consultorio'}
                </div>
                <div
                  style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}
                >
                  {doctor || 'Doctor/a'}
                </div>
                <div
                  style={{ height: 34, borderRadius: 6, background: 'var(--bg-muted)', marginBottom: 8 }}
                />
                <div
                  style={{ height: 34, borderRadius: 6, background: 'var(--bg-muted)', marginBottom: 12 }}
                />
                <div
                  style={{
                    height: 36,
                    borderRadius: 6,
                    background: brand,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  Ingresar
                </div>
              </div>
            </div>
          </div>

          {/* send */}
          <div className="card">
            <div className="card__header">
              <div className="card__title">Enviar invitación</div>
            </div>
            <div className="card__body col" style={{ gap: 14 }}>
              <div
                className="row"
                style={{
                  gap: 0,
                  background: 'var(--bg-muted)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 3,
                }}
              >
                {[
                  { k: 'whatsapp' as const, label: 'WhatsApp', icon: 'whatsapp' as const },
                  { k: 'link' as const, label: 'Link', icon: 'link' as const },
                ].map(t => (
                  <button
                    key={t.k}
                    onClick={() => setChannel(t.k)}
                    style={{
                      flex: 1,
                      height: 30,
                      borderRadius: 5,
                      fontSize: 12.5,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: channel === t.k ? 'var(--bg-surface)' : 'transparent',
                      color: channel === t.k ? 'var(--text-primary)' : 'var(--text-secondary)',
                      boxShadow: channel === t.k ? 'var(--shadow-xs)' : 'none',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    <Icon name={t.icon} size={13} /> {t.label}
                  </button>
                ))}
              </div>

              {channel === 'whatsapp' ? (
                <>
                  <Field label="Mensaje" hint="Editable">
                    <textarea
                      className="input"
                      style={{
                        height: 'auto',
                        minHeight: 168,
                        padding: 10,
                        lineHeight: 1.5,
                        resize: 'vertical',
                      }}
                      value={msg}
                      onChange={e => setMsgOverride(e.target.value)}
                    />
                  </Field>
                  <div
                    className="row"
                    style={{ fontSize: 11.5, color: 'var(--text-tertiary)', justifyContent: 'space-between' }}
                  >
                    <span>
                      Se envía a{' '}
                      <b style={{ color: 'var(--text-secondary)' }}>{phone || '—'}</b>
                    </span>
                    {msgOverride != null && (
                      <button
                        type="button"
                        onClick={() => setMsgOverride(null)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--brand-primary-600)',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: 11.5,
                        }}
                      >
                        Restaurar mensaje original
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <Field label="Link de invitación">
                  <CopyField value={inviteLink} mono={false} />
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 6 }}>
                    Compartilo por donde quieras.
                  </div>
                </Field>
              )}
            </div>
          </div>

          <div className="col" style={{ gap: 8 }}>
            <button
              className={`btn ${channel === 'whatsapp' ? 'btn--whatsapp' : 'btn--primary'} btn--lg`}
              disabled={!canCreate || createMutation.isPending}
              style={{ width: '100%', opacity: canCreate ? 1 : 0.5 }}
              onClick={() => createMutation.mutate()}
            >
              <Icon name={channel === 'whatsapp' ? 'send' : 'link'} size={15} />
              {channel === 'whatsapp'
                ? 'Crear y enviar por WhatsApp'
                : 'Crear y copiar link'}
            </button>
            {!canCreate && (
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--text-tertiary)',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                Para habilitar el botón faltan:{' '}
                {[
                  !clinic.trim() && 'nombre del consultorio',
                  !doctor.trim() && 'doctor/a',
                  slug.length < 3 && 'usuario (mín. 3 caracteres)',
                  taken && 'usuario disponible',
                  channel === 'whatsapp' && !phone.trim() && 'teléfono de WhatsApp',
                ]
                  .filter(Boolean)
                  .join(', ')}
              </div>
            )}
            <button
              className="btn btn--ghost"
              style={{ width: '100%' }}
              onClick={() => navigate('/accounts')}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 900px) { .na-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  req?: boolean;
  error?: string | null;
  children: ReactNode;
}

function Field({ label, hint, req, error, children }: FieldProps) {
  return (
    <div>
      <div className="row row--between" style={{ marginBottom: 6 }}>
        <label className="field-label" style={{ margin: 0 }}>
          {label}
          {req && <span style={{ color: 'var(--danger)' }}> *</span>}
        </label>
        {hint && !error && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{hint}</span>
        )}
        {error && (
          <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 500 }}>{error}</span>
        )}
      </div>
      {children}
    </div>
  );
}
