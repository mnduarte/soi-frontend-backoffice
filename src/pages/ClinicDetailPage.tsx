import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminClinicsApi } from '../api/admin-clinics';
import { useState } from 'react';

export default function ClinicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const { data: clinic, isLoading } = useQuery({
    queryKey: ['admin-clinic', id],
    queryFn: () => adminClinicsApi.findById(id!) as Promise<{ name: string; status: string; subscriptionEndsAt?: string }>,
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (dto: { status?: string; subscriptionEndsAt?: string }) =>
      adminClinicsApi.updateSubscription(id!, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-clinic', id] }),
  });

  if (isLoading) return <div>Cargando clínica...</div>;
  if (!clinic) return <div>Clínica no encontrada.</div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dto: Record<string, string> = {};
    if (status) dto.status = status;
    if (endsAt) dto.subscriptionEndsAt = endsAt;
    updateMutation.mutate(dto);
  };

  return (
    <div>
      <h1>{clinic.name}</h1>
      <p>Estado actual: <strong>{clinic.status}</strong></p>
      <p>Vence: {clinic.subscriptionEndsAt ? new Date(clinic.subscriptionEndsAt).toLocaleDateString('es-AR') : '—'}</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360, marginTop: 24 }}>
        <h2>Actualizar suscripción</h2>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Sin cambio de estado</option>
          <option value="TRIAL">TRIAL</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
        <input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)} placeholder="Nueva fecha de vencimiento" />
        <button type="submit" disabled={updateMutation.isPending}>Guardar</button>
      </form>
    </div>
  );
}
