import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Alert from '../components/Alert';
import { useAuth } from '../context/AuthContext';

export default function RepositoriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const data = await api.get('/repos');
      setRepos(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div>
      <div className="page-header">
        <h2>Repositorios</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancelar' : '+ Nuevo'}
        </button>
      </div>

      <Alert>{error}</Alert>

      {showCreate && (
        <form className="card create-form" onSubmit={handleCreate}>
          <h3>Nuevo repositorio</h3>
          <input
            className="field-input"
            placeholder="Nombre del repositorio (obligatorio)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="field-input"
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button className="btn btn-primary btn-block" type="submit" disabled={creating}>
            {creating ? 'Creando…' : 'Crear repositorio'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="muted">Cargando repositorios…</p>
      ) : repos.length === 0 ? (
        <div className="empty">
          <p>No tienes repositorios todavía.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="grid">
          {repos.map((repo) => (
            <button key={repo._id} className="card repo-card" onClick={() => navigate(`/repos/${repo._id}`)}>
              <h3>{repo.name}</h3>
              {repo.description && <p className="muted">{repo.description}</p>}
              <span className="repo-meta">
                {repo.owner === user?._id ? 'Creado por ti' : 'Compartido'} · {repo.members?.length || 0} miembro(s)
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}