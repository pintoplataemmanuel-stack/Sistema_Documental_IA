import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Alert from './Alert';
import { SparklesIcon } from './Icons';

export default function RagChat({ repositoryId, placeholder, variant = 'card', autoFocus }) {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setHistory([]);
    setError(null);
  }, [repositoryId]);

  async function handleAsk(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api.post('/search/chat', {
        question: q,
        repositoryId: repositoryId || undefined,
      });
      setHistory((h) => [
        ...h,
        { role: 'user', text: q },
        { role: 'assistant', text: data.answer, sources: data.sources || [] },
      ]);
      setQuestion('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openDoc(s) {
    if (s?.repositoryId && s?.documentId) {
      navigate(`/repos/${s.repositoryId}/files/${s.documentId}`);
    }
  }

  return (
    <div className={variant === 'hero' ? 'rag-hero' : 'chat-panel'}>
      {variant === 'hero' && (
        <div className="rag-head">
          <span className="rag-ico">
            <SparklesIcon size={18} />
          </span>
          <div>
            <div className="rag-title">Chat con tus documentos</div>
            <div className="rag-sub">Pregunta por tus documentos y la IA responde citando sus fuentes.</div>
          </div>
        </div>
      )}

      <form className="chat-form" onSubmit={handleAsk}>
        <input
          className="field-input rag-input"
          placeholder={placeholder || 'Pregunta por tus documentos (p. ej. ¿qué plazo de entrega incluye el contrato?)'}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          autoFocus={autoFocus}
        />
        <button className="btn btn-primary rag-send" type="submit" disabled={busy || !question.trim()}>
          {busy ? 'Pensando…' : 'Preguntar'}
        </button>
      </form>

      <Alert>{error}</Alert>

      {history.length > 0 && (
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
                        key={s.chunkId || `${s.documentId}-${i}`}
                        className="src-chip"
                        onClick={() => openDoc(s)}
                        title="Abrir documento"
                      >
                        <DocDot /> {s.documentName}{' '}
                        <span className="src-score">({Math.round((Number(s.score) || 0) * 100)}%)</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function DocDot() {
  return <span className="src-dot" />;
}