import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminClinicsApi } from '../api/admin-clinics';
import { Icon } from '../components/common/Icon';
import { money } from '../components/common/primitives';
import { useUIStore } from '../store/ui.store';

export default function SettingsPage() {
  const qc = useQueryClient();
  const showToast = useUIStore(s => s.showToast);

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminClinicsApi.getSettings(),
  });

  const [grace, setGrace] = useState('');
  const [price, setPrice] = useState('');
  const [trial, setTrial] = useState('');

  useEffect(() => {
    if (settings) {
      setGrace(String(settings.gracePeriodDays));
      setPrice(String(settings.planPriceMonthly));
      setTrial(String(settings.trialDays));
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () =>
      adminClinicsApi.updateSettings({
        gracePeriodDays: Number(grace),
        planPriceMonthly: Number(price),
        trialDays: Number(trial),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['admin-metrics'] });
      qc.invalidateQueries({ queryKey: ['admin-clinics'] });
      showToast('Ajustes guardados');
    },
  });

  const dirty =
    settings && (
      Number(grace) !== settings.gracePeriodDays
      || Number(price) !== settings.planPriceMonthly
      || Number(trial) !== settings.trialDays
    );

  return (
    <div className="content fade-in">
      <div className="card" style={{ maxWidth: 620 }}>
        <div className="card__header">
          <div>
            <div className="card__title">Suspensión por falta de pago</div>
            <div className="card__sub">Ajustes globales del SaaS</div>
          </div>
        </div>
        <div className="card__body col" style={{ gap: 16 }}>
          <div className="row row--between" style={{ paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Días de tolerancia</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Antes de marcar como suspensión inminente
              </div>
            </div>
            <input
              className="input mono"
              type="number"
              min={0}
              max={30}
              value={grace}
              onChange={e => setGrace(e.target.value)}
              style={{ width: 100, textAlign: 'right' }}
            />
          </div>

          <div className="row row--between" style={{ paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Suspensión automática</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Podés extender prórroga manualmente desde el detalle
              </div>
            </div>
            <span className="badge badge--success">
              <span className="dot" style={{ background: 'var(--success)' }} /> Activada
            </span>
          </div>

          <div className="row row--between" style={{ paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Precio del plan</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Mensual, por consultorio · actual {money(settings?.planPriceMonthly ?? 0)}
              </div>
            </div>
            <input
              className="input mono"
              type="number"
              min={0}
              value={price}
              onChange={e => setPrice(e.target.value)}
              style={{ width: 140, textAlign: 'right' }}
            />
          </div>

          <div className="row row--between">
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Días de prueba gratis</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Se aplican a cuentas nuevas. Después caen en el flujo de cobranza.
              </div>
            </div>
            <input
              className="input mono"
              type="number"
              min={1}
              max={365}
              value={trial}
              onChange={e => setTrial(e.target.value)}
              style={{ width: 100, textAlign: 'right' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              className="btn btn--primary"
              disabled={!dirty || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              <Icon name="check" size={14} />{' '}
              {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
