import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from './common/Icon';
import { SectionTitle } from './common/primitives';
import { adminClinicsApi, type ClinicUser } from '../api/admin-clinics';
import { useUIStore } from '../store/ui.store';
import { formatLastSeen } from '../lib/format';

const CORE_APP_URL =
  (import.meta.env as { VITE_CORE_APP_URL?: string }).VITE_CORE_APP_URL ?? 'http://localhost:5173';

function pickError(e: unknown, fallback: string): string {
  const m = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof m === 'string' ? m : fallback;
}

// WhatsApp message with the new/temporary credentials. No phone number → opens
// WhatsApp so the admin picks the recipient (users don't have a phone on file).
function waLink(clinicName: string, username: string, tempPassword: string): string {
  const msg =
    `¡Hola! 👋 Te damos acceso a SOI para ${clinicName}.\n\n` +
    `🔗 ${CORE_APP_URL}/login?u=${username}\n` +
    `👤 Usuario: ${username}\n` +
    `🔑 Contraseña: ${tempPassword}\n\n` +
    `Al entrar vas a poder cambiar la contraseña. ¡Cualquier duda escribinos!`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

interface Cred {
  username: string;
  tempPassword: string;
}

export function ClinicUsersSection({
  clinicId,
  clinicName,
}: {
  clinicId: string;
  clinicName: string;
}) {
  const qc = useQueryClient();
  const showToast = useUIStore(s => s.showToast);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: '',
    username: '',
    role: 'MEMBER' as 'OWNER' | 'MEMBER',
    isClinical: true,
  });
  const [cred, setCred] = useState<Cred | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['clinic-users', clinicId],
    queryFn: () => adminClinicsApi.listUsers(clinicId),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['clinic-users', clinicId] });

  const createMutation = useMutation({
    mutationFn: () =>
      adminClinicsApi.createUser(clinicId, {
        name: form.name.trim(),
        username: form.username.trim(),
        role: form.role,
        isClinical: form.isClinical,
      }),
    onSuccess: data => {
      setCred({ username: data.user.username ?? form.username.trim(), tempPassword: data.tempPassword });
      setAdding(false);
      setForm({ name: '', username: '', role: 'MEMBER', isClinical: true });
      invalidate();
    },
    onError: e => showToast(pickError(e, 'No se pudo crear el usuario')),
  });

  const resetMutation = useMutation({
    mutationFn: (u: ClinicUser) => adminClinicsApi.resetUserPassword(clinicId, u._id),
    onSuccess: data => setCred({ username: data.username ?? '', tempPassword: data.tempPassword }),
    onError: e => showToast(pickError(e, 'No se pudo resetear la contraseña')),
  });

  const deleteMutation = useMutation({
    mutationFn: (u: ClinicUser) => adminClinicsApi.deactivateUser(clinicId, u._id),
    onSuccess: () => {
      showToast('Usuario eliminado');
      invalidate();
    },
    onError: e => showToast(pickError(e, 'No se pudo eliminar el usuario')),
  });

  const canSubmit = form.name.trim().length > 1 && form.username.trim().length > 1;

  return (
    <div>
      <div className="row row--between" style={{ marginTop: 18, marginBottom: 8 }}>
        <SectionTitle style={{ margin: 0 }}>Usuarios del consultorio</SectionTitle>
        {!adding && (
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => {
              setAdding(true);
              setCred(null);
            }}
          >
            <Icon name="userPlus" size={13} /> Agregar
          </button>
        )}
      </div>

      {/* New / reset credentials panel */}
      {cred && (
        <div
          style={{
            background: 'var(--bg-app, #F8FAFC)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
            Contraseña temporal generada
          </div>
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            Usuario <b>{cred.username}</b> · contraseña{' '}
            <b style={{ fontFamily: 'var(--font-mono, monospace)' }}>{cred.tempPassword}</b>
            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Debe cambiarla al entrar. Pasásela por WhatsApp.
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <a
              className="btn btn--primary btn--sm"
              href={waLink(clinicName, cred.username, cred.tempPassword)}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <Icon name="whatsapp" size={13} /> Enviar por WhatsApp
            </a>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => {
                navigator.clipboard?.writeText(`Usuario: ${cred.username}\nContraseña: ${cred.tempPassword}`);
                showToast('Credenciales copiadas');
              }}
            >
              <Icon name="copy" size={13} /> Copiar
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setCred(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Add user form */}
      {adding && (
        <div
          style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <input
              className="input"
              placeholder="Nombre y apellido"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={{ flex: 1 }}
            />
            <input
              className="input"
              placeholder="usuario (único)"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value.toLowerCase() })}
              style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)' }}
            />
          </div>
          <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <select
              className="input"
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as 'OWNER' | 'MEMBER' })}
              style={{ flex: 1 }}
            >
              <option value="MEMBER">Miembro</option>
              <option value="OWNER">Titular (OWNER)</option>
            </select>
            <label className="row" style={{ gap: 6, fontSize: 12.5, flex: 1 }}>
              <input
                type="checkbox"
                checked={form.isClinical}
                onChange={e => setForm({ ...form, isClinical: e.target.checked })}
              />
              Es profesional (atiende pacientes)
            </label>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn btn--primary btn--sm"
              disabled={!canSubmit || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Creando…' : 'Crear usuario'}
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setAdding(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* User list */}
      {isLoading ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>Cargando usuarios…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {users.map(u => {
            const ls = formatLastSeen(u.lastLoginAt);
            return (
              <div
                key={u._id}
                className="row row--between"
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 9,
                  padding: '8px 10px',
                  gap: 8,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
                    {u.name}
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: 5,
                        background: u.role === 'OWNER' ? '#EEF2FF' : 'var(--bg-app, #F1F5F9)',
                        color: u.role === 'OWNER' ? '#3730A3' : 'var(--text-tertiary)',
                      }}
                    >
                      {u.role === 'OWNER' ? 'Titular' : 'Miembro'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{u.username ?? '—'}</span>
                    {' · '}
                    {ls.label}
                  </div>
                </div>
                <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                  <button
                    className="btn btn--secondary btn--icon"
                    title="Resetear contraseña"
                    onClick={() => resetMutation.mutate(u)}
                    disabled={resetMutation.isPending}
                  >
                    <Icon name="key" size={14} />
                  </button>
                  {u.role !== 'OWNER' && (
                    <button
                      className="btn btn--ghost btn--icon"
                      title="Eliminar usuario"
                      onClick={() => {
                        if (confirm(`¿Eliminar a ${u.name}? No podrá iniciar sesión.`)) {
                          deleteMutation.mutate(u);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
