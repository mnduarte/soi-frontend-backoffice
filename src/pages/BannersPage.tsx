import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminBannersApi } from '../api/admin-clinics';
import { useState, type FormEvent } from 'react';

interface Banner {
  _id: string;
  title: string;
  body?: string;
  isActive: boolean;
  createdAt: string;
}

export default function BannersPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => adminBannersApi.findAll() as Promise<Banner[]>,
  });

  const createMutation = useMutation({
    mutationFn: adminBannersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      setTitle('');
      setBody('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminBannersApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-banners'] }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ title, body });
  };

  return (
    <div>
      <h1>Banners</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400, marginBottom: 32 }}>
        <h2 style={{ margin: 0 }}>Nuevo banner</h2>
        <input type="text" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} required />
        <textarea placeholder="Cuerpo (opcional)" value={body} onChange={e => setBody(e.target.value)} rows={3} />
        <button type="submit" disabled={createMutation.isPending}>Crear</button>
      </form>

      {isLoading ? <div>Cargando...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Título</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Activo</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Fecha</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {banners.map(b => (
              <tr key={b._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: 8 }}>{b.title}</td>
                <td style={{ padding: 8 }}>{b.isActive ? 'Sí' : 'No'}</td>
                <td style={{ padding: 8 }}>{new Date(b.createdAt).toLocaleDateString('es-AR')}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => deleteMutation.mutate(b._id)} disabled={deleteMutation.isPending} style={{ color: 'red', background: 'none', border: '1px solid #fca5a5', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
