import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiUrl } from '../api/client';
import Alert from '../components/Alert';
import DocumentStatus from '../components/DocumentStatus';

export default function FileDetailPage() {
  const { repoId, docId } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  async function load() {
    try {
      const data = await api.get(`/files/${docId}`);
      setDoc(data);
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
  }, [docId]);

  // Auto-refresco mientras esté procesando
  useEffect(() => {
    if (!doc || doc.status !== 'processing') return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.status]);

  async function handleProcess() {
    setProcessing(true);
    setError(null);
    try {
      await api.post(`/files/${docId}/process`, {});
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  if (loading) return <p className="muted">Cargando…</p>;

  if (!doc) {
    return (
      <div>
        <Alert>{error || 'Documento no encontrado'}</Alert>
        <button className="btn btn-ghost" onClick={() => navigate(`/repos/${repoId}`)}>← Volver</button>
      </div>
    );
  }

  const info = doc.extractedInfo && typeof doc.extractedInfo === 'object' ? doc.extractedInfo : {};

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/repos/${repoId}`)}>
            ← Volver
          </button>
          <h2>{doc.originalName}</h2>
          <p className="muted">
            {doc.fileType?.toUpperCase()} · {(doc.size / 1024).toFixed(1)} KB
          </p>
        </div>
        <DocumentStatus status={doc.status} />
      </div>

      <Alert>{error}</Alert>

      <div className="card">
        <div className="file-actions">
          <button className="btn btn-primary" onClick={handleProcess} disabled={doc.status === 'processing' || processing}>
            {doc.status === 'processing' || processing ? 'Procesando…' : 'Procesar con IA'}
          </button>
          <a className="btn btn-ghost" href={apiUrl(`/api/files/${docId}/download`)}>
            Descargar
          </a>
        </div>
      </div>

      {doc.status === 'error' && doc.processingError && (
        <div className="card card-error">
          <strong>Error de procesamiento:</strong>
          <p className="muted">{doc.processingError}</p>
        </div>
      )}

      <div className="info-grid">
        <div className="card">
          <h3>Categoría</h3>
          <p className="big">{doc.category || '—'}</p>
        </div>
        <div className="card">
          <h3>Procesado</h3>
          <p className="big">{doc.processedAt ? new Date(doc.processedAt).toLocaleString() : '—'}</p>
        </div>
      </div>

      <div className="card">
        <h3>Resumen</h3>
        <p>{doc.summary || '—'}</p>
      </div>

      <div className="card">
        <h3>Campos extraídos</h3>
        {Object.keys(info).length === 0 ? (
          <p className="muted">—</p>
        ) : (
          <dl className="kv">
            {Object.entries(info).map(([k, v]) => (
              <div key={k} className="kv-row">
                <dt>{k}</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <details className="card">
        <summary>Ver texto extraído ({doc.textContent?.length || 0} caracteres)</summary>
        <pre className="pre-text">{doc.textContent}</pre>
      </details>
    </div>
  );
}