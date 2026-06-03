import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { adminClient } from '../api/admin-client';
import { useAdminAuthStore } from '../store/admin-auth.store';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const setAuth = useAdminAuthStore(s => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: (dto: { email: string; password: string }) =>
      adminClient.post<{ data: { accessToken: string; admin: { email: string; role: string } } }>('/admin/auth/login', dto).then(r => r.data.data),
    onSuccess: data => {
      setAuth(data);
      navigate('/');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Credenciales inválidas');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate({ email, password });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ margin: 0 }}>SOI Admin</h1>
        <h2 style={{ margin: 0, fontWeight: 400 }}>Panel de administración</h2>
        {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
