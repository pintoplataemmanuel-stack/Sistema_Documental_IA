import { useEffect } from 'react';
import {
  HelpIcon,
  UserIcon,
  FolderIcon,
  UploadIcon,
  SparklesIcon,
  SearchIcon,
} from './Icons';

const STEPS = [
  { icon: UserIcon, title: 'Regístrate e inicia sesión', text: 'Crea tu cuenta o entra con la tuya para acceder a tu panel de documentos.' },
  { icon: FolderIcon, title: 'Crea un repositorio', text: 'Organiza tus archivos por proyectos, clientes o áreas desde el menú Repositorios.' },
  { icon: UploadIcon, title: 'Sube tus documentos', text: 'Añade archivos PDF, DOCX o TXT (hasta 10 MB) a tu repositorio.' },
  { icon: SparklesIcon, title: 'Procesa con IA', text: 'El sistema extrae el texto, clasifica la categoría, genera un resumen, detecta campos clave y crea embeddings automáticamente.' },
  { icon: SearchIcon, title: 'Pregunta y busca', text: 'Usa el chat o la búsqueda inteligente para hacer preguntas sobre tus documentos citando sus fuentes.' },
];

export default function HelpModal({ onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <span className="sb-logo">
            <HelpIcon size={18} />
          </span>
          <div>
            <div className="modal-title">Cómo usar</div>
            <div className="modal-sub">Guía rápida en 5 pasos</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            &times;
          </button>
        </div>

        <ol className="help-steps">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="help-step">
              <span className="help-step-num">{i + 1}</span>
              <span className="help-step-ico">
                <Icon size={18} />
              </span>
              <div className="help-step-body">
                <div className="help-step-title">{title}</div>
                <p className="help-step-text">{text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="modal-foot">
          <button className="btn btn-primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}