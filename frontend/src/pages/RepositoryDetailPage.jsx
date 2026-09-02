import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Alert from '../components/Alert';
import DocumentStatus from '../components/DocumentStatus';

export default function RepositoryDetailPage() {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  async function load() {
    try {
      const [repoData, docsData] = await Promise.all([
        api.get(`/repos/${repoId}`),
        api.get(`/files?repositoryId=${repoId}`),
      ]);
      setRepo(repoData);
      setDocs(docsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('repositoryId', repoId);
      fd.append('file', file);
      await api.postForm('/files/upload', fd);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleProcess(docId) {
    try {
      setError(null);
      await api.post(`/files/${docId}/process`, {});
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(doc) {
    if (!window.confirm(`¿Eliminar el documento "${doc.originalName}"?`)) return;
    try {
      await api.delete(`/files/${doc._id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
            ← Volver
          </button>
          <h2>{repo?.name || 'Cargando…'}</h2>
          {repo?.description && <p className="muted">{repo.description}</p>}
        </div>
      </div>

      <Alert>{error}</Alert>

      <div className="card upload-box">
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={handleUpload} />
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Subiendo…' : '⬆ Subir documento'}
        </button>
        <span className="muted">PDF, DOCX o TXT · máx. 10 MB</span>
      </div>

      {loading ? (
        <p className="muted">Cargando documentos…</p>
      ) : docs.length === 0 ? (
        <div className="empty">
          <p>Este repositorio no tiene documentos. Sube el primero.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Tipo</th>
                <th>Tamaño</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc._id}>
                  <td>
                    <button className="link" onClick={() => navigate(`/repos/${repoId}/files/${doc._id}`)}>
                      {doc.originalName}
                    </button>
                  </td>
                  <td>{doc.fileType?.toUpperCase()}</td>
                  <td>{(doc.size / 1024).toFixed(1)} KB</td>
                  <td><DocumentStatus status={doc.status} /></td>
                  <td>
                    <button className="btn btn-sm" onClick={() => handleProcess(doc._id)} disabled={doc.status === 'processing'}>
                      Procesar
                    </button>{' '}
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(doc)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}