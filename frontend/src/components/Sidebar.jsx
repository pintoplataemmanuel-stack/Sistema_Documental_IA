import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  DashboardIcon,
  FolderIcon,
  FilesIcon,
  SearchIcon,
  ScanIcon,
  LogoutIcon,
  SparklesIcon,
  HelpIcon,
  AlertIcon,
} from './Icons';

const NAV = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/repos', label: 'Repositorios', icon: FolderIcon },
  { to: '/documents', label: 'Documentos', icon: FilesIcon },
  { to: '/vision', label: 'Facturas IA', icon: ScanIcon },
  { to: '/search', label: 'Búsqueda Inteligente', icon: SearchIcon },
  { to: '/notifications', label: 'Notificaciones', icon: AlertIcon },
  { to: '/automation', label: 'Automatizaciones', icon: SparklesIcon },
];

export default function Sidebar({ onOpenHelp }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const navRef = useRef(null);
  const linkRefs = useRef([]);
  const [pill, setPill] = useState({ top: 0, height: 0, visible: false });

  // Mide la posición del enlace activo para deslizar la pastilla (estilo Linear).
  useLayoutEffect(() => {
    function measure() {
      const index = NAV.findIndex(({ to, end }) =>
        end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
      );
      const el = linkRefs.current[index];
      if (!el) {
        setPill((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }
      setPill({ top: el.offsetTop, height: el.offsetHeight, visible: true });
    }

    measure();
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    if (navRef.current) observer.observe(navRef.current);
    return () => {
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, [pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = (user?.name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const roleLabel =
    user?.role === 'admin' ? 'Administrador' : user?.role || 'Usuario';

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="sb-brand" onClick={() => navigate('/')}>
          <span className="sb-logo">
            <SparklesIcon size={18} />
          </span>
          <span className="sb-brand-text">
            Sistema Documental
            <small>Gestión con IA</small>
          </span>
        </div>

        <div className="sb-section-label">Espacio de trabajo</div>
        <nav className="sb-nav" ref={navRef}>
          <span
            className="sb-pill"
            aria-hidden="true"
            style={{
              transform: `translateY(${pill.top}px)`,
              height: pill.height,
              opacity: pill.visible ? 1 : 0,
            }}
          />
          {NAV.map(({ to, label, icon: Icon, end }, index) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              ref={(el) => {
                linkRefs.current[index] = el;
              }}
              className={({ isActive }) =>
                `sb-link${isActive ? ' active' : ''}`
              }
            >
              <Icon />
              <span className="sb-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <nav className="sb-nav sb-nav-help">
          <button className="sb-link" onClick={onOpenHelp}>
            <HelpIcon />
            <span className="sb-label">Cómo usar</span>
          </button>
        </nav>

        <div className="sb-footer">
          <div className="sb-user">
            <span className="sb-avatar">{initials}</span>
            <span className="sb-user-text">
              <span className="sb-user-name">{user?.name || 'Usuario'}</span>
              <span className="sb-user-role">{roleLabel}</span>
            </span>
            <button
              className="sb-logout"
              onClick={handleLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogoutIcon size={18} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}