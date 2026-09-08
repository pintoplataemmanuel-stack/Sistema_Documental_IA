import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Alert from '../components/Alert';
import RagChat from '../components/RagChat';

function scorePct(score) {
  return Math.round((Number(score) || 0) * 100);
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [tab, setTab] = useState('chat');

  // Búsqueda semántica
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  useEffect(() => {
    api
      .get('/repos')
      .then(setRepos)
      .catch(() => {});
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const data = await api.post('/search/search', {
        query: query.trim(),
        repositoryId: selectedRepo || undefined,
        limit: 6,
      });
      setResults(data.results || []);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  function openDoc(item) {
    if (item?.repositoryId && item?.documentId) {
      navigate(`/repos/${item.repositoryId}/files/${item.documentId}`);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Búsqueda inteligente</h2>
          <p className="muted sec-sub">Semántica sobre tus documentos, con IA.</p>
        </div>
      </div>

      <div className="field repo-filter">
        <label className="field-label">Repositorio (opcional)</label>
        <select
          className="field-input"
          value={selectedRepo}
          onChange={(e) => setSelectedRepo(e.target.value)}
        >
          <option value="">Todos mis repositorios</option>
          {repos.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'chat' ? 'tab-active' : ''}`} onClick={() => setTab('chat')}>
          Chat con mis documentos
        </button>
        <button className={`tab ${tab === 'buscar' ? 'tab-active' : ''}`} onClick={() => setTab('buscar')}>
          Buscar fragmentos similares
        </button>
      </div>

      {tab === 'chat' ? (
        <RagChat key={selectedRepo} repositoryId={selectedRepo} />
      ) : (
        <>
          <form className="chat-form" onSubmit={handleSearch}>
            <input
              className="field-input"
              placeholder="Describe qué buscas (p. ej. sistema de gestión documental con IA)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={searching || !query.trim()}>
              {searching ? 'Buscando…' : 'Buscar'}
            </button>
          </form>

          <Alert>{searchError}</Alert>

          {results.length === 0 && !searching && !searchError && (
            <p className="muted">Esperando una búsqueda…</p>
          )}

          <div className="search-results">
            {results.map((r) => (
              <button key={r.chunkId} className="card result-item" onClick={() => openDoc(r)}>
                <div className="result-head">
                  <span className="result-title">{r.documentName}</span>
                  <span className="score">{scorePct(r.score)}%</span>
                </div>
                <span className="repo-meta">{r.category}</span>
                <p className="result-snippet">{r.content}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}