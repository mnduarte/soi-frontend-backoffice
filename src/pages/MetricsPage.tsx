import { useQuery } from '@tanstack/react-query';
import { adminClinicsApi } from '../api/admin-clinics';

interface Metrics {
  totalClinics: number;
  activeClinics: number;
  trialClinics: number;
  suspendedClinics: number;
  totalUsers: number;
}

export default function MetricsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => adminClinicsApi.getMetrics() as Promise<Metrics>,
  });

  if (isLoading) return <div>Cargando métricas...</div>;

  return (
    <div>
      <h1>Métricas</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginTop: 24 }}>
        {[
          { label: 'Clínicas totales', value: data?.totalClinics },
          { label: 'Activas', value: data?.activeClinics },
          { label: 'En prueba', value: data?.trialClinics },
          { label: 'Suspendidas', value: data?.suspendedClinics },
          { label: 'Usuarios', value: data?.totalUsers },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{value ?? '—'}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
