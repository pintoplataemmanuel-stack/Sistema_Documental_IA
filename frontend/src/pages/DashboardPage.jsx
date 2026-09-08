import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import RagChat from '../components/RagChat';
import DocumentStatus from '../components/DocumentStatus';
import {
  FilesIcon,
  CheckIcon,
  AlertIcon,
  ClockIcon,
  DocIcon,
  ChevronRightIcon,
} from '../components/Icons';

const TYPE_TINT = {
  pdf: 'tint-red',
  docx: 'tint-blue',
  txt: 'tint-gray',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [repoNames, setRepoNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([api.get('/files'), api.get('/repos')])
      .then(([docs, repos]) => {
        if (!alive) return;
        setFiles(docs);
        setRepoNames(Object.fromEntries(repos.map((r) => [r._id, r.name])));
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const counts = {
    total: files.length,
    completed: files.filter((f) => f.status === 'completed').length,
    error: files.filter((f) => f.status === 'error').length,
    processing: files.filter((f) => f.status === 'processing' || f.status === 'pending').length,
  };

  const statCards = [
    { label: 'Documentos totales', value: counts.total, icon: FilesIcon, tint: 'blue', to: '/repos' },
    { label: 'Procesados con IA', value: counts.completed, icon: CheckIcon, tint: 'green', to: '/documents?status=completed' },
    { label: 'Con error', value: counts.error, icon: AlertIcon, tint: 'red', to: '/documents?status=error' },
    { label: 'En proceso / pendientes', value: counts.processing, icon: ClockIcon, tint: 'amber', to: '/documents' },
  ];

  const recent = files.slice(0, 7);
  const firstName = (user?.name || '').split(/\s+/)[0] || '';

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="muted sec-sub">Hola {firstName}, aquí está tu panorama documental.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <>
          <RagChat variant="hero" autoFocus />

          <div className="stat-grid">
            {statCards.map(({ label, value, icon: Icon, tint, to }) => (
              <button key={label} className="stat-card" onClick={() => navigate(to)}>
                <span className={`stat-icon ${tint}`}>
                  <Icon size={20} />
                </span>
                <span className="stat-info">
                  <span className="stat-value">{value}</span>
                  <span className="stat-label">{label}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="sec-head">
            <div>
              <h3 className="sec-title">Documentos recientes</h3>
              <p className="sec-sub">Los últimos archivos subidos a tus repositorios</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/documents')}>
              Ver todos <ChevronRightIcon size={15} />
            </button>
          </div>

          {recent.length === 0 ? (
            <div className="empty card">
              <p>Todavía no hay documentos. Sube el primero desde un repositorio.</p>
              <button className="btn btn-primary" onClick={() => navigate('/repos')}>
                Ir a repositorios
              </button>
            </div>
          ) : (
            <div className="card sw-list">
              {recent.map((doc) => (
                <div key={doc._id} className="sw-row">
                  <span className={`sw-file ${TYPE_TINT[doc.fileType] || 'tint-gray'}`}>
                    <DocIcon size={18} />
                  </span>
                  <div className="sw-main">
                    <button
                      className="sw-name"
                      onClick={() => navigate(`/repos/${doc.repository}/files/${doc._id}`)}
                    >
                      {doc.originalName}
                    </button>
                    <div className="sw-sub">
                      {repoNames[doc.repository] || '—'}
                      {' · '}
                      {doc.fileType?.toUpperCase()} · {(doc.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <DocumentStatus status={doc.status} />
                  <span className="sw-date">
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}