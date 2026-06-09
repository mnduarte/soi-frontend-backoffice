import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { adminClient } from '../api/admin-client';
import { useAdminAuthStore } from '../store/admin-auth.store';
import { Icon } from '../components/common/Icon';
import { ConsoleLogo } from '../components/common/primitives';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const setAuth = useAdminAuthStore(s => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: (dto: { email: string; password: string }) =>
      adminClient
        .post<{ data: { accessToken: string; admin: { email: string; role: string } } }>(
          '/admin/auth/login',
          dto,
        )
        .then(r => r.data.data),
    onSuccess: data => {
      setAuth(data);
      navigate('/accounts');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Credenciales inválidas');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="login-wrap">
      {/* Left visual side */}
      <div className="login-side">
        <div className="row" style={{ gap: 12 }}>
          <ConsoleLogo size={36} />
          <div style={{ fontSize: 17, fontWeight: 600 }}>SOI · Consola</div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontSize: 13,
              opacity: 0.7,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            Panel de administración
          </div>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: 0,
              maxWidth: 420,
              color: 'white',
            }}
          >
            Gestioná los consultorios suscriptos.
          </h1>
          <p
            style={{
              fontSize: 15,
              opacity: 0.75,
              marginTop: 16,
              maxWidth: 380,
              lineHeight: 1.55,
            }}
          >
            Alta + invitación por WhatsApp, semáforo de morosidad, e impersonación
            para soporte en caliente.
          </p>
        </div>

        <div style={{ fontSize: 11.5, opacity: 0.5 }}>© 2026 SOI · Consola</div>
      </div>

      {/* Right form */}
      <div className="login-form-side">
        <form onSubmit={handleSubmit} className="login-card">
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-tertiary)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            Consola
          </div>
          <h2
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              margin: '0 0 8px',
              color: 'var(--text-primary)',
            }}
          >
            Ingresar
          </h2>
          <div className="page-sub" style={{ marginBottom: 28 }}>
            Cuenta de super-admin.
          </div>

          {error && (
            <div
              style={{
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 12.5,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          <label className="field-label">Usuario</label>
          <input
            className="input"
            type="text"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            style={{ marginBottom: 12 }}
          />

          <label className="field-label">Contraseña</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ marginBottom: 20 }}
          />

          <button
            type="submit"
            className="btn btn--primary btn--lg"
            style={{ width: '100%' }}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Ingresando…' : 'Ingresar a la consola'}
            {!loginMutation.isPending && <Icon name="arrowRight" size={14} />}
          </button>
        </form>
      </div>
    </div>
  );
}
