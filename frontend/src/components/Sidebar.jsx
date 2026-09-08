import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  DashboardIcon,
  FolderIcon,
  FilesIcon,
  SearchIcon,
  LogoutIcon,
  SparklesIcon,
} from './Icons';

const NAV = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/repos', label: 'Repositorios', icon: FolderIcon },
  { to: '/documents', label: 'Documentos', icon: FilesIcon },
  { to: '/search', label: 'Búsqueda Inteligente', icon: SearchIcon },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = (user?.name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="sb-brand" onClick={() => navigate('/')}>
          <span className="sb-logo">
            <SparklesIcon size={18} />
          </span>
          <span className="sb-brand-text">
            Sistema Documental
            <small>IA Suite</small>
          </span>
        </div>

        <div className="sb-section-label">Menú</div>
        <nav className="sb-nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `sb-link${isActive ? ' active' : ''}`
              }
            >
              <Icon />
              <span className="sb-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sb-footer">
          <div className="sb-user">
            <span className="sb-avatar">{initials}</span>
            <span className="sb-user-text">
              <span className="sb-user-name">{user?.name || 'Usuario'}</span>
              <span className="sb-user-role">{user?.role || user?.email || ''}</span>
            </span>
            <button className="sb-logout" onClick={handleLogout} title="Cerrar sesión">
              <LogoutIcon size={18} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}