import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import Alert from '../components/Alert';
import DocumentStatus from '../components/DocumentStatus';
import { DocIcon } from '../components/Icons';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'processing', label: 'Procesando' },
  { value: 'completed', label: 'Completados' },
  { value: 'error', label: 'Con error' },
];

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [docs, setDocs] = useState([]);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [text, setText] = useState('');
  const [repoId, setRepoId] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');

  useEffect(() => {
    Promise.all([api.get('/files'), api.get('/repos')])
      .then(([files, reposList]) => {
        setDocs(files);
        setRepos(reposList);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function changeStatus(value) {
    setStatus(value);
    const next = new URLSearchParams(searchParams);
    if (value) next.set('status', value);
    else next.delete('status');
    setSearchParams(next, { replace: true });
  }

  const repoName = useMemo(
    () => Object.fromEntries(repos.map((r) => [r._id, r.name])),
    [repos]
  );

  const filtered = docs.filter((d) => {
    if (repoId && d.repository !== repoId) return false;
    if (status && d.status !== status) return false;
    if (text && !d.originalName.toLowerCase().includes(text.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Documentos</h2>
          <p className="muted sec-sub">
            Todos tus archivos ({docs.length}) organizados y procesados con IA.
          </p>
        </div>
      </div>

      <Alert>{error}</Alert>

      <div className="filter-bar">
        <input
          className="field-input"
          placeholder="Buscar por nombre…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <select className="field-input" value={repoId} onChange={(e) => setRepoId(e.target.value)}>
          <option value="">Todos los repositorios</option>
          {repos.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name}
            </option>
          ))}
        </select>
        <select className="field-input" value={status} onChange={(e) => changeStatus(e.target.value)}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="empty card">
          <p>Sin documentos que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Repositorio</th>
                  <th>Tipo</th>
                  <th>Tamaño</th>
                  <th>Estado</th>
                  <th>Procesado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d._id}>
                    <td>
                      <div className="doc-cell">
                        <span className={`sw-file ${d.fileType === 'pdf' ? 'tint-red' : d.fileType === 'docx' ? 'tint-blue' : 'tint-gray'}`}>
                          <DocIcon size={16} />
                        </span>
                        <button
                          className="link"
                          onClick={() => navigate(`/repos/${d.repository}/files/${d._id}`)}
                        >
                          {d.originalName}
                        </button>
                      </div>
                    </td>
                    <td>{repoName[d.repository] || '—'}</td>
                    <td>{d.fileType?.toUpperCase()}</td>
                    <td>{(d.size / 1024).toFixed(1)} KB</td>
                    <td><DocumentStatus status={d.status} /></td>
                    <td className="muted">{d.processedAt ? new Date(d.processedAt).toLocaleDateString() : '—'}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => navigate(`/repos/${d.repository}/files/${d._id}`)}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}