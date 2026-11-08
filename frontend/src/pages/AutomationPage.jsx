import { useEffect, useState } from 'react';
import api from '../api/client';
import Alert from '../components/Alert';
import { useAuth } from '../context/AuthContext';
import { SparklesIcon, ClockIcon, ChevronRightIcon } from '../components/Icons';

const STATUS_META = {
  running: { label: 'En ejecución', className: 'status-processing' },
  retrying: { label: 'Reintentando', className: 'status-processing' },
  completed: { label: 'Completado', className: 'status-completed' },
  failed: { label: 'Fallido', className: 'status-error' },
  skipped: { label: 'Omitido', className: 'status-pending' },
};

function RunStatus({ status }) {
  const meta =
    STATUS_META[status] || { label: status || '—', className: 'status-pending' };
  return <span className={`status ${meta.className}`}>{meta.label}</span>;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

// Fuera del componente: genera una clave única por demostración manual para
// que la ejecución no se omita por idempotencia.
function manualIdempotencyKey(flowKey) {
  return `${flowKey}:manual:${Date.now()}`;
}

export default function AutomationPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [flows, setFlows] = useState([]);
  const [runs, setRuns] = useState([]);
  const [files, setFiles] = useState([]);
  const [documentId, setDocumentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [runningKey, setRunningKey] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [flowsData, runsData, filesData] = await Promise.all([
          api.get('/automation/flows'),
          api.get('/automation/runs?limit=50'),
          api.get('/files'),
        ]);
        if (!alive) return;
        setFlows(flowsData.flows || []);
        setRuns(runsData.items || []);
        setFiles(Array.isArray(filesData) ? filesData : []);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function refresh() {
    const [flowsData, runsData] = await Promise.all([
      api.get('/automation/flows'),
      api.get('/automation/runs?limit=50'),
    ]);
    setFlows(flowsData.flows || []);
    setRuns(runsData.items || []);
  }

  async function trigger(flow) {
    setError(null);
    setNotice(null);

    if (!documentId) {
      setError('Selecciona un documento para la ejecución manual.');
      return;
    }

    setRunningKey(flow.key);
    try {
      const result = await api.post(`/automation/flows/${flow.key}/run`, {
        documentId,
        processedAt: new Date().toISOString(),
        // Clave única para que la demostración no se omita por idempotencia.
        idempotencyKey: manualIdempotencyKey(flow.key),
      });

      if (result.status === 'completed') {
        setNotice(
          `Flujo "${flow.name}" ejecutado correctamente en ${
            result.attempts || 1
          } intento(s).`
        );
      } else {
        setError(
          `El flujo "${flow.name}" terminó en estado ${result.status}: ${
            result.error || 'sin detalle'
          }`
        );
      }
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunningKey(null);
    }
  }

  async function toggleRun(id) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }

    setExpandedId(id);
    setDetail(null);
    setDetailError(null);

    try {
      const data = await api.get(`/automation/runs/${id}`);
      setDetail(data);
    } catch (err) {
      setDetailError(err.message);
    }
  }

  const totalRuns = runs.length;
  const failedRuns = runs.filter((run) => run.status === 'failed').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Motor de flujos</span>
          <h2 className="page-title">Automatizaciones</h2>
          <p className="muted sec-sub">
            Motor propio que reemplaza los flujos de n8n. {flows.length} flujo(s)
            registrados y {totalRuns} ejecución(es) recientes.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refresh}>
          Actualizar
        </button>
      </div>

      <Alert>{error}</Alert>
      <Alert kind="success">{notice}</Alert>

      {isAdmin && (
        <div className="card">
          <div className="sec-head" style={{ margin: 0 }}>
            <div>
              <h3 className="sec-title">Demostración manual</h3>
              <p className="sec-sub">
                Selecciona un documento y ejecuta un flujo sin esperar a que el
                pipeline lo dispare.
              </p>
            </div>
          </div>
          <select
            className="field-input"
            style={{ marginTop: '0.8rem', maxWidth: 420 }}
            value={documentId}
            onChange={(event) => setDocumentId(event.target.value)}
          >
            <option value="">Selecciona un documento…</option>
            {files.map((file) => (
              <option key={file._id} value={file._id}>
                {file.originalName} ({file.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <>
          <div className="sec-head">
            <div>
              <h3 className="sec-title">Flujos registrados</h3>
              <p className="sec-sub">
                Inventario sincronizado desde el código del backend.
              </p>
            </div>
          </div>

          <div className="grid">
            {flows.map((flow) => {
              const stats = flow.stats || {};
              return (
                <div key={flow.key} className="card" style={{ marginBottom: 0 }}>
                  <div className="doc-cell">
                    <span
                      className={`sw-file ${
                        flow.enabled === false ? 'tint-gray' : 'tint-indigo'
                      }`}
                    >
                      <SparklesIcon size={18} />
                    </span>
                    <div className="sw-main">
                      <div className="sw-name">{flow.name}</div>
                      <div className="sw-sub">
                        {flow.key} · {flow.event}
                      </div>
                    </div>
                    <span
                      className={`status ${
                        flow.enabled === false
                          ? 'status-pending'
                          : 'status-completed'
                      }`}
                    >
                      {flow.enabled === false ? 'Deshabilitado' : 'Activo'}
                    </span>
                  </div>

                  <p className="muted sec-sub" style={{ marginTop: '0.7rem' }}>
                    {flow.description}
                  </p>

                  <div className="sw-sub" style={{ margin: '0.5rem 0' }}>
                    <ClockIcon size={13} /> Timeout {flow.timeoutMs} ms ·{' '}
                    {flow.maxRetries} reintento(s) · espera {flow.retryDelayMs} ms
                  </div>

                  <div className="sw-sub" style={{ marginBottom: '0.7rem' }}>
                    Pasos: {flow.steps?.join(' → ') || '—'}
                  </div>

                  <div className="filter-bar" style={{ margin: 0 }}>
                    <span className="status status-completed">
                      {stats.completed || 0} OK
                    </span>
                    <span className="status status-error">
                      {stats.failed || 0} fallidas
                    </span>
                    <span className="status status-pending">
                      {stats.total || 0} total
                    </span>
                  </div>

                  {isAdmin && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: '0.9rem' }}
                      disabled={runningKey === flow.key || !documentId}
                      onClick={() => trigger(flow)}
                    >
                      {runningKey === flow.key
                        ? 'Ejecutando…'
                        : 'Ejecutar flujo'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="sec-head">
            <div>
              <h3 className="sec-title">Ejecuciones recientes</h3>
              <p className="sec-sub">
                {failedRuns} fallida(s) de {totalRuns}. Haz clic para ver los
                logs de cada intento.
              </p>
            </div>
          </div>

          {runs.length === 0 ? (
            <div className="empty card">
              <p>No hay ejecuciones todavía.</p>
              <p className="muted">
                Procesa un documento para que el motor dispare los flujos.
              </p>
            </div>
          ) : (
            <div className="card table-card">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Flujo</th>
                      <th>Estado</th>
                      <th>Intentos</th>
                      <th>Duración</th>
                      <th>Ejecutado por</th>
                      <th>Fecha</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <RunRow
                        key={run._id}
                        run={run}
                        expanded={expandedId === run._id}
                        detail={
                          expandedId === run._id && detail
                            ? detail
                            : null
                        }
                        detailError={
                          expandedId === run._id ? detailError : null
                        }
                        onToggle={() => toggleRun(run._id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RunRow({ run, expanded, detail, detailError, onToggle }) {
  return (
    <>
      <tr className="run-row" onClick={onToggle}>
        <td>
          <div className="sw-name">{run.flowName || run.flowKey}</div>
          <div className="sw-sub">{run.event}</div>
        </td>
        <td>
          <RunStatus status={run.status} />
        </td>
        <td>
          {run.attempts}/{run.maxAttempts}
        </td>
        <td>{run.durationMs != null ? `${run.durationMs} ms` : '—'}</td>
        <td>{run.triggeredBy?.name || run.triggeredBy?.email || 'Sistema'}</td>
        <td className="sw-date">{formatDate(run.createdAt)}</td>
        <td>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
          >
            {expanded ? 'Ocultar' : 'Ver logs'}{' '}
            <ChevronRightIcon size={14} />
          </button>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={7} className="run-detail-cell">
            {detailError ? (
              <Alert>{detailError}</Alert>
            ) : !detail ? (
              <p className="muted">Cargando detalle…</p>
            ) : (
              <div>
                <p className="sw-sub">
                  <strong>Entrada:</strong>{' '}
                  {JSON.stringify(detail.input || {})}
                </p>
                {detail.error && (
                  <p className="sw-sub" style={{ color: 'var(--danger)' }}>
                    <strong>Error:</strong> {detail.error}
                  </p>
                )}
                {detail.output && Object.keys(detail.output).length > 0 && (
                  <p className="sw-sub">
                    <strong>Salida:</strong> {JSON.stringify(detail.output)}
                  </p>
                )}
                <p className="sw-sub" style={{ marginTop: '0.5rem' }}>
                  <strong>Logs:</strong>
                </p>
                {detail.logs?.length ? (
                  <ul className="sw-sub" style={{ margin: 0, paddingLeft: 18 }}>
                    {detail.logs.map((log, index) => (
                      <li key={`${log.at}-${index}`}>
                        [{formatDate(log.at)}] intento {log.attempt} ·{' '}
                        {log.level}: {log.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Sin logs registrados.</p>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
