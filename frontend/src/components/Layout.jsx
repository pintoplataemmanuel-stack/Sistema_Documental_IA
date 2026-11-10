import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import api from '../api/client';
import Sidebar from './Sidebar';
import Footer from './Footer';
import HelpModal from './HelpModal';

const SECTIONS = [
  { pattern: /^\/repos\/[^/]+\/files\/[^/]+$/, label: 'Documento' },
  { pattern: /^\/repos\/[^/]+$/, label: 'Repositorio' },
  { pattern: /^\/repos$/, label: 'Repositorios' },
  { pattern: /^\/documents$/, label: 'Documentos' },
  { pattern: /^\/vision$/, label: 'Facturas con IA' },
  { pattern: /^\/search$/, label: 'Búsqueda inteligente' },
  { pattern: /^\/notifications$/, label: 'Notificaciones' },
  { pattern: /^\/automation$/, label: 'Automatizaciones' },
  { pattern: /^\/$/, label: 'Dashboard' },
];

function currentSection(pathname) {
  const match = SECTIONS.find((section) => section.pattern.test(pathname));
  return match?.label || 'Dashboard';
}

export default function Layout() {
  const [showHelp, setShowHelp] = useState(false);
  const [online, setOnline] = useState(null);
  const { pathname } = useLocation();

  // Estado real del backend: consulta /health y refresca cada 30 s.
  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        await api.get('/health');
        if (alive) setOnline(true);
      } catch {
        if (alive) setOnline(false);
      }
    }
    check();
    const id = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const statusClass =
    online === null ? 'is-checking' : online ? 'is-online' : 'is-offline';
  const statusLabel =
    online === null ? 'Verificando…' : online ? 'En línea' : 'Sin conexión';

  return (
    <div className="layout">
      <Sidebar onOpenHelp={() => setShowHelp(true)} />
      <main className="content">
        <header className="topbar">
          <div className="topbar-crumbs">
            <span>Sistema Documental</span>
            <span className="topbar-sep">/</span>
            <strong>{currentSection(pathname)}</strong>
          </div>
          <div className="topbar-right">
            <span className={`sys-status ${statusClass}`}>
              <span className="sys-dot" aria-hidden="true" />
              <span className="sys-label">Estado del sistema:</span>
              <b>{statusLabel}</b>
            </span>
            <span className="topbar-meta">{today}</span>
          </div>
        </header>

        <div className="page-container">
          <Outlet />
          <Footer onOpenHelp={() => setShowHelp(true)} />
        </div>
      </main>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
