import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminClinicsApi } from '../api/admin-clinics';

interface ClinicListResponse {
  clinics: { _id: string; name: string; status: string; subscriptionEndsAt?: string }[];
  total: number;
}

export default function ClinicListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-clinics'],
    queryFn: () => adminClinicsApi.findAll() as Promise<ClinicListResponse>,
  });

  if (isLoading) return <div>Cargando clínicas...</div>;

  const statusColor: Record<string, string> = {
    ACTIVE: '#16a34a',
    TRIAL: '#d97706',
    SUSPENDED: '#dc2626',
  };

  return (
    <div>
      <h1>Clínicas ({data?.total ?? 0})</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            <th style={{ padding: 8, textAlign: 'left' }}>Nombre</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Estado</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Vence</th>
          </tr>
        </thead>
        <tbody>
          {data?.clinics.map(c => (
            <tr key={c._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: 8 }}>
                <Link to={`/clinics/${c._id}`}>{c.name}</Link>
              </td>
              <td style={{ padding: 8 }}>
                <span style={{ color: statusColor[c.status] ?? '#374151', fontWeight: 600 }}>{c.status}</span>
              </td>
              <td style={{ padding: 8 }}>
                {c.subscriptionEndsAt
                  ? new Date(c.subscriptionEndsAt).toLocaleDateString('es-AR')
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
