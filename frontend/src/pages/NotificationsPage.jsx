import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Alert from '../components/Alert';
import { AlertIcon, CheckIcon } from '../components/Icons';

const TYPE_CLASS = {
  success: 'tint-green',
  error: 'tint-red',
  warning: 'tint-amber',
  info: 'tint-blue',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const data = await api.get('/notifications?limit=100');
        if (!alive) return;
        setItems(data.items || []);
        setUnread(data.unread || 0);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  async function markOne(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, read: true } : item
        )
      );
      setUnread((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(err.message);
    }
  }

  async function markAll() {
    try {
      await api.patch('/notifications/read-all');
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnread(0);
    } catch (err) {
      setError(err.message);
    }
  }

  function openResource(item) {
    const id = item.resource?.id || item.metadata?.documentId;
    const repositoryId = item.metadata?.repositoryId;
    const kind = item.resource?.kind || 'Document';
    if (kind === 'Document' && id && repositoryId) {
      navigate(`/repos/${repositoryId}/files/${id}`);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Notificaciones</h2>
          <p className="muted sec-sub">
            Resultados del motor de automatización. {unread} sin leer.
          </p>
        </div>
        {unread > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAll}>
            <CheckIcon size={15} /> Marcar todas como leídas
          </button>
        )}
      </div>

      <Alert>{error}</Alert>

      {loading ? (
        <p className="muted">Cargando...</p>
      ) : items.length === 0 ? (
        <div className="empty card">
          <p>No tienes notificaciones todavía.</p>
          <p className="muted">
            Se crean automáticamente cuando un documento termina de procesarse o
            falla.
          </p>
        </div>
      ) : (
        <div className="card sw-list">
          {items.map((item) => (
            <div
              key={item._id}
              className="sw-row"
              style={{ opacity: item.read ? 0.65 : 1, cursor: 'pointer' }}
              onClick={() => {
                if (!item.read) markOne(item._id);
                openResource(item);
              }}
            >
              <span className={`sw-file ${TYPE_CLASS[item.type] || 'tint-blue'}`}>
                <AlertIcon size={18} />
              </span>
              <div className="sw-main">
                <div className="sw-name">{item.title}</div>
                <div className="sw-sub">{item.message}</div>
              </div>
              <span className="sw-date">
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString()
                  : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
