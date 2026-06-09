import { NavLink, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../common/Icon';
import { ConsoleLogo } from '../common/primitives';
import { useAdminAuthStore } from '../../store/admin-auth.store';

interface ConsoleSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  counts: { total: number; overdue: number };
}

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  count?: number | null;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export function ConsoleSidebar({ isOpen, onClose, counts }: ConsoleSidebarProps) {
  const navigate = useNavigate();
  const clearAuth = useAdminAuthStore(s => s.clearAuth);

  const nav: NavGroup[] = [
    {
      group: 'Operación',
      items: [
        { to: '/accounts', label: 'Consultorios', icon: 'building', count: counts.total },
        { to: '/billing',  label: 'Facturación',  icon: 'creditCard', count: counts.overdue || null },
      ],
    },
    {
      group: 'Sistema',
      items: [
        { to: '/settings', label: 'Ajustes', icon: 'settings' },
      ],
    },
  ];

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="sidebar__brand">
        <ConsoleLogo />
        <div>
          <div className="sidebar__brand-name">SOI</div>
          <div
            className="sidebar__brand-sub"
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <span className="badge badge--neutral" style={{ padding: '0 6px', fontSize: 10 }}>
              Consola
            </span>
          </div>
        </div>
      </div>

      <button
        className="btn btn--primary"
        style={{ width: '100%', marginBottom: 6 }}
        onClick={() => { navigate('/accounts/new'); onClose(); }}
      >
        <Icon name="userPlus" /> Nuevo consultorio
      </button>

      {nav.map(group => (
        <div key={group.group}>
          <div className="sidebar__group-label">{group.group}</div>
          {group.items.map(it => (
            <NavLink
              key={it.to}
              to={it.to}
              onClick={onClose}
              className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
            >
              <Icon name={it.icon} />
              <span>{it.label}</span>
              {it.count != null && <span className="nav-item__count">{it.count}</span>}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar__user">
        <div
          className="avatar avatar--md"
          style={{ background: '#1E293B', color: 'white' }}
        >
          OP
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Operador
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Super-admin</div>
        </div>
        <button className="btn btn--ghost btn--icon" onClick={handleLogout} title="Salir">
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}
