import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from './common/Icon';
import { adminClinicsApi, type PasswordResetRequestItem } from '../api/admin-clinics';
import { useUIStore } from '../store/ui.store';
import { formatLastSeen } from '../lib/format';

// Inbox-style side panel that lists pending password reset requests. The
// admin clicks "Resetear y avisar" → we call resetCredentials (which auto-
// closes pending requests for that clinic) and pop a WhatsApp deep link
// with the new temp password pre-filled.
export function PasswordResetDrawer() {
  const open = useUIStore(s => s.resetInboxOpen);
  const close = useUIStore(s => s.closeResetInbox);
  const showToast = useUIStore(s => s.showToast);
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-reset-requests'],
    queryFn: () => adminClinicsApi.listPasswordResetRequests(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const resolveMutation = useMutation({
    mutationFn: (id: string) => adminClinicsApi.resolvePasswordResetRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reset-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-reset-requests-count'] });
    },
  });

  const resetAndNotifyMutation = useMutation({
    mutationFn: async (item: PasswordResetRequestItem) => {
      if (!item.clinic) throw new Error('Sin clínica asociada');
      const { tempPassword } = await adminClinicsApi.resetCredentials(item.clinic._id);
      return { item, tempPassword };
    },
    onSuccess: ({ item, tempPassword }) => {
      // resetCredentials already auto-resolved the pending row server-side.
      qc.invalidateQueries({ queryKey: ['admin-reset-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-reset-requests-count'] });
      qc.invalidateQueries({ queryKey: ['admin-clinics'] });

      const phone = item.clinic?.phone?.replace(/\D/g, '');
      const username = item.user?.username ?? item.identifier;
      const msg =
        `Hola ${item.user?.name?.split(' ')[0] ?? ''} 👋\n\n` +
        `Te generamos una contraseña temporal para que entres a SOI.\n\n` +
        `Usuario: ${username}\n` +
        `Contraseña: ${tempPassword}\n\n` +
        `La primera vez vas a poder elegir una nueva.`;
      if (phone) {
        window.open(
          `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
          '_blank',
        );
      } else {
        showToast(`Contraseña: ${tempPassword} — sin WhatsApp configurado`);
      }
    },
    onError: () => showToast('No se pudo generar la contraseña'),
  });

  if (!open) return null;

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: 90,
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <Icon name="key" size={16} style={{ color: 'var(--text-secondary)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Pedidos de reset</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
              {items.length} {items.length === 1 ? 'pendiente' : 'pendientes'}
            </div>
          </div>
          <button
            onClick={close}
            className="btn btn--ghost btn--icon"
            aria-label="Cerrar"
          >
            <Icon name="x" size={15} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading && (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 13,
              }}
            >
              Cargando…
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 13,
              }}
            >
              No hay pedidos pendientes ✨
            </div>
          )}

          {items.map(item => {
            const seen = formatLastSeen(item.requestedAt);
            return (
              <div
                key={item._id}
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {item.user?.name ?? item.identifier}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-tertiary)',
                      marginLeft: 'auto',
                    }}
                  >
                    {seen.label}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span className="mono">{item.identifier}</span>
                  {item.clinic ? ` · ${item.clinic.name}` : ''}
                </div>
                {item.note && (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-muted)',
                      padding: '8px 10px',
                      borderRadius: 6,
                      fontStyle: 'italic',
                    }}
                  >
                    "{item.note}"
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    className="btn btn--primary btn--sm"
                    disabled={resetAndNotifyMutation.isPending || !item.clinic}
                    onClick={() => resetAndNotifyMutation.mutate(item)}
                  >
                    <Icon name="refresh" size={12} />
                    <span>Resetear y avisar</span>
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate(item._id)}
                    title="Descartar sin resetear"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
