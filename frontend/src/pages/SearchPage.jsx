import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Alert from '../components/Alert';

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

  // Chat RAG
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState(null);

  useEffect(() => {
    api
      .get('/repos')
      .then(setRepos)
      .catch(() => {});
  }, []);

  function repoParam() {
    return selectedRepo || undefined;
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const data = await api.post('/search/search', {
        query: query.trim(),
        repositoryId: repoParam(),
        limit: 6,
      });
      setResults(data.results || []);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleAsk(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || chatBusy) return;
    setChatBusy(true);
    setChatError(null);
    try {
      const data = await api.post('/search/chat', {
        question: q,
        repositoryId: repoParam(),
      });
      setHistory((h) => [
        ...h,
        { role: 'user', text: q },
        { role: 'assistant', text: data.answer, sources: data.sources || [] },
      ]);
      setQuestion('');
    } catch (err) {
      setChatError(err.message);
    } finally {
      setChatBusy(false);
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
        <h2>Búsqueda inteligente</h2>
      </div>

      <div className="card">
        <div className="field">
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
          <button
            className={`tab ${tab === 'chat' ? 'tab-active' : ''}`}
            onClick={() => setTab('chat')}
          >
            Chat con mis documentos
          </button>
          <button
            className={`tab ${tab === 'buscar' ? 'tab-active' : ''}`}
            onClick={() => setTab('buscar')}
          >
            Buscar fragmentos similares
          </button>
        </div>

        {tab === 'chat' ? (
          <>
            <form className="chat-form" onSubmit={handleAsk}>
              <input
                className="field-input"
                placeholder="Pregunta sobre tus documentos (p. ej. ¿qué plazo de entrega tiene el contrato?)"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button
                className="btn btn-primary"
                type="submit"
                disabled={chatBusy || !question.trim()}
              >
                {chatBusy ? 'Pensando…' : 'Preguntar'}
              </button>
            </form>

            <Alert>{chatError}</Alert>

            {history.length === 0 ? (
              <p className="muted">La respuesta se basa solo en tus documentos y cita las fuentes usadas.</p>
            ) : (
              <div className="chat-history">
                {history.map((msg, i) =>
                  msg.role === 'user' ? (
                    <div key={i} className="chat-msg chat-msg-user">
                      {msg.text}
                    </div>
                  ) : (
                    <div key={i} className="chat-msg chat-msg-bot">
                      {msg.text}
                      {msg.sources.length > 0 && (
                        <div className="chat-sources">
                          {msg.sources.map((s) => (
                            <button
                              key={s.chunkId}
                              className="src-chip"
                              onClick={() => openDoc(s)}
                              title="Abrir documento"
                            >
                              📄 {s.documentName}{' '}
                              <span className="src-score">({scorePct(s.score)}%)</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <form className="chat-form" onSubmit={handleSearch}>
              <input
                className="field-input"
                placeholder="Describe qué buscas (p. ej. sistema de gestión documental con IA)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                className="btn btn-primary"
                type="submit"
                disabled={searching || !query.trim()}
              >
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
    </div>
  );
}