import { HelpIcon, GithubIcon } from './Icons';

export default function Footer({ onOpenHelp }) {
  return (
    <footer className="app-footer">
      <div className="footer-main">
        <span className="footer-brand">Sistema Inteligente de Gestión y Análisis Documental con IA</span>
        <span className="footer-team">Desarrollado por Emmanuel Pinto Plata</span>
      </div>
      <div className="footer-links">
        <button className="footer-link" onClick={onOpenHelp}>
          <HelpIcon size={15} /> Cómo usar
        </button>
        <a
          className="footer-link"
          href="https://github.com/pintoplataemmanuel-stack/Sistema_Documental_IA"
          target="_blank"
          rel="noreferrer"
        >
          <GithubIcon size={15} /> GitHub
        </a>
      </div>
    </footer>
  );
}