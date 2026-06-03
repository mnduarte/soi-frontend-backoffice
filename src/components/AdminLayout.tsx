import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuthStore } from '../store/admin-auth.store';

export default function AdminLayout() {
  const { admin, clearAuth } = useAdminAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 220, background: '#111827', color: '#fff', display: 'flex', flexDirection: 'column', padding: 16, gap: 8 }}>
        <div style={{ padding: '8px 0 16px', fontWeight: 700, fontSize: 18 }}>SOI Admin</div>
        <NavLink to="/" end style={({ isActive }) => ({ color: isActive ? '#7c3aed' : '#9ca3af', textDecoration: 'none', padding: '6px 8px', borderRadius: 6 })}>
          Métricas
        </NavLink>
        <NavLink to="/clinics" style={({ isActive }) => ({ color: isActive ? '#7c3aed' : '#9ca3af', textDecoration: 'none', padding: '6px 8px', borderRadius: 6 })}>
          Clínicas
        </NavLink>
        <NavLink to="/banners" style={({ isActive }) => ({ color: isActive ? '#7c3aed' : '#9ca3af', textDecoration: 'none', padding: '6px 8px', borderRadius: 6 })}>
          Banners
        </NavLink>
        <div style={{ marginTop: 'auto', fontSize: 13, color: '#6b7280' }}>
          <div>{admin?.email}</div>
          <button onClick={handleLogout} style={{ marginTop: 8, background: 'none', border: '1px solid #374151', color: '#9ca3af', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>
            Salir
          </button>
        </div>
      </nav>
      <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
