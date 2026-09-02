import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="layout">
      <header className="topbar">
        <div className="topbar-brand" onClick={() => navigate('/')}>
          📄 Sistema Documental <span className="topbar-brand-ia">IA</span>
        </div>
        <div className="topbar-right">
          <span className="topbar-user">{user?.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}