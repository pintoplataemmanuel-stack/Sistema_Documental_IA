import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Footer from './Footer';
import HelpModal from './HelpModal';

export default function Layout() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="layout">
      <Sidebar onOpenHelp={() => setShowHelp(true)} />
      <main className="content">
        <div className="page-container">
          <Outlet />
          <Footer onOpenHelp={() => setShowHelp(true)} />
        </div>
      </main>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}