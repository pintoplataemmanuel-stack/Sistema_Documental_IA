import { CheckIcon, SparklesIcon } from './Icons';

const POINTS = [
  'Clasificación, resumen y extracción de campos con IA',
  'Búsqueda semántica sobre todos tus documentos',
  'Automatizaciones internas y notificaciones',
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <div className="auth-brand">
          <span className="auth-brand-mark">
            <SparklesIcon size={18} />
          </span>
          <span>Sistema Documental</span>
        </div>

        <div className="auth-aside-body">
          <p className="auth-aside-eyebrow">Gestión documental con IA</p>
          <h2 className="auth-aside-title">
            Documentos que se organizan, se entienden y responden.
          </h2>
          <p className="auth-aside-text">
            Centraliza tus archivos, procésalos con inteligencia artificial y
            consulta la información en segundos, con fuentes verificables.
          </p>

          <ul className="auth-points">
            {POINTS.map((point) => (
              <li key={point} className="auth-point">
                <CheckIcon size={14} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="auth-aside-foot">Desarrollado por Emmanuel Pinto Plata</p>
      </aside>

      <div className="auth-main">
        <div className="auth-card">
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
