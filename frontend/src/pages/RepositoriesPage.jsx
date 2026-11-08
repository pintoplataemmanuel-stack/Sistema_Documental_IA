import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Alert from '../components/Alert';
import { FolderIcon, FilesIcon, PlusIcon, ChevronRightIcon } from '../components/Icons';

const TONES = [
  '#3a4652',
  '#3f5148',
  '#55483f',
  '#4a4658',
  '#45505a',
  '#52444a',
];

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function RepositoriesPage() {
  const navigate = useNavigate();
  const [repos, setRepos] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      const [reposData, filesData] = await Promise.all([api.get('/repos'), api.get('/files')]);
      setRepos(reposData);
      setFiles(filesData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const repo = await api.post('/repos', { name, description });
      setRepos((r) => [repo, ...r]);
      setShowCreate(false);
      setName('');
      setDescription('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function repoStats(repoId) {
    const own = files.filter((f) => f.repository === repoId);
    const completed = own.filter((f) => f.status === 'completed').length;
    const latest = own[0]; // /files viene ordenado por createdAt desc
    return {
      count: own.length,
      completed,
      latest: latest?.originalName || null,
      latestError: latest?.status === 'error' ? latest.processingError : null,
    };
  }

  const initials = (name) =>
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('');

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Biblioteca</span>
          <h2 className="page-title">Repositorios</h2>
          <p className="muted sec-sub">Organiza tus documentos en carpetas y procesos.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
          <PlusIcon size={16} /> {showCreate ? 'Cancelar' : 'Nuevo repositorio'}
        </button>
      </div>

      <Alert>{error}</Alert>

      {showCreate && (
        <form className="form-panel" onSubmit={handleCreate}>
          <h3 className="sec-title">Nuevo repositorio</h3>
          <input
            className="field-input"
            placeholder="Nombre del repositorio (obligatorio)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <input
            className="field-input"
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? 'Creando…' : 'Crear repositorio'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowCreate(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Cargando repositorios…</p>
      ) : repos.length === 0 ? (
        <div className="empty card">
          <span className="empty-ico"><FolderIcon size={30} /></span>
          <p>No tienes repositorios todavía.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <PlusIcon size={16} /> Crear el primero
          </button>
        </div>
      ) : (
        <div className="repo-grid">
          {repos.map((repo) => {
            const stats = repoStats(repo._id);
            const tone = TONES[hashString(repo.name) % TONES.length];
            return (
              <button key={repo._id} className="repo-card" onClick={() => navigate(`/repos/${repo._id}`)}>
                <div className="repo-top">
                  <span className="repo-avatar" style={{ background: tone }}>
                    {initials(repo.name)}
                  </span>
                  <ChevronRightIcon size={18} className="repo-go" />
                </div>
                <div>
                  <h3 className="repo-name">{repo.name}</h3>
                  <p className="repo-desc">{repo.description || 'Sin descripción.'}</p>
                </div>
                <div className="repo-badge">
                  <span className="repo-badge-count">{stats.count}</span>
                  <span className="repo-badge-label">archivos</span>
                </div>
                <div className="repo-foot">
                  <FilesIcon size={14} />
                  {stats.count === 0
                    ? 'Sin documentos todavía'
                    : `Último: ${stats.latest}`}
                  {stats.completed > 0 && (
                    <span className="repo-processed">{stats.completed} procesados</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}