import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Footer from './Footer';
import HelpModal from './HelpModal';

const SECTIONS = [
  { pattern: /^\/repos\/[^/]+\/files\/[^/]+$/, label: 'Documento' },
  { pattern: /^\/repos\/[^/]+$/, label: 'Repositorio' },
  { pattern: /^\/repos$/, label: 'Repositorios' },
  { pattern: /^\/documents$/, label: 'Documentos' },
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
  const { pathname } = useLocation();

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

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
          <span className="topbar-meta">{today}</span>
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
