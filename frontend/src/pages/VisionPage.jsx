import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import Alert from '../components/Alert';
import AnimatedNumber from '../components/AnimatedNumber';
import {
  CheckIcon,
  DocIcon,
  ReceiptIcon,
  ScanIcon,
  UploadIcon,
} from '../components/Icons';

const EMPTY_FORM = {
  proveedor: '',
  nit: '',
  fecha: '',
  numero_factura: '',
  items: [],
  subtotal: '',
  impuestos: '',
  total: '',
  moneda: 'COP',
};

const FIELD_LABELS = {
  proveedor: 'Proveedor',
  nit: 'NIT',
  fecha: 'Fecha',
  numero_factura: 'Número de factura',
  items: 'Ítems',
  subtotal: 'Subtotal',
  impuestos: 'Impuestos',
  total: 'Total',
  moneda: 'Moneda',
};

const STATUS_META = {
  processing: { label: 'Leyendo…', className: 'status-processing' },
  review: { label: 'Por revisar', className: 'status-processing' },
  saved: { label: 'Guardada', className: 'status-completed' },
  error: { label: 'Error', className: 'status-error' },
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024;

function formFromScan(scan) {
  const data = scan?.data || {};
  return {
    proveedor: data.proveedor || '',
    nit: data.nit || '',
    fecha: data.fecha || '',
    numero_factura: data.numero_factura || '',
    items: Array.isArray(data.items) ? data.items : [],
    subtotal: data.subtotal ?? '',
    impuestos: data.impuestos ?? '',
    total: data.total ?? '',
    moneda: data.moneda || 'COP',
  };
}

function money(value, currency = 'COP') {
  const number = Number(value) || 0;
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      maximumFractionDigits: 2,
    }).format(number);
  } catch {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 2,
    }).format(number);
  }
}

function fileSize(bytes) {
  if (!bytes) return '0 KB';
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function VisionPage() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [result, setResult] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [threshold, setThreshold] = useState(0.85);
  const [form, setForm] = useState(EMPTY_FORM);
  const [scans, setScans] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .get('/vision/scans')
      .then((data) => {
        if (!alive) return;
        setScans(data.items || []);
        if (typeof data.threshold === 'number') setThreshold(data.threshold);
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoadingHistory(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const lowFields = result?.camposBajaConfianza || [];
  const confidence = Math.round(numberValue(result?.confianza) * 100);
  const highConfidence = confidence >= Math.round(threshold * 100);
  const canReview = Boolean(result) && result.status !== 'error' && !invoice;

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function acceptFile(next) {
    setError(null);
    setNotice(null);
    if (!next) return;
    if (!ALLOWED_TYPES.includes(next.type)) {
      setError('Formato no permitido. Usa JPG, PNG, WEBP o PDF.');
      return;
    }
    if (next.size > MAX_SIZE) {
      setError('La factura supera el límite de 10 MB.');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(next.type.startsWith('image/') ? URL.createObjectURL(next) : null);
    setFile(next);
  }

  async function handleScan() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setResult(null);
    setInvoice(null);
    try {
      const data = new FormData();
      data.append('file', file);
      const response = await api.postForm('/vision/scan', data);
      setResult(response.scan);
      setInvoice(response.invoice || null);
      setForm(formFromScan(response.scan));
      if (typeof response.threshold === 'number') setThreshold(response.threshold);
      setScans((prev) => [response.scan, ...prev]);
      if (response.invoice) {
        setNotice('Lectura con confianza suficiente: la factura se guardó automáticamente.');
      }
    } catch (err) {
      setError(err.message);
      if (err.data?.scan) {
        setResult(err.data.scan);
        setForm(formFromScan(err.data.scan));
        setScans((prev) => [err.data.scan, ...prev]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!result || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        ...form,
        subtotal: numberValue(form.subtotal),
        impuestos: numberValue(form.impuestos),
        total: numberValue(form.total),
        items: form.items.map((item) => ({
          descripcion: item.descripcion || '',
          cantidad: numberValue(item.cantidad),
          valor_unitario: numberValue(item.valor_unitario),
        })),
      };
      const data = await api.post(`/vision/scans/${result._id}/confirm`, {
        data: payload,
      });
      setResult(data.scan);
      setInvoice(data.invoice);
      setForm(formFromScan(data.scan));
      setScans((prev) =>
        prev.map((item) => (item._id === data.scan._id ? data.scan : item))
      );
      setNotice('Factura confirmada y registrada como gasto.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(scan) {
    if (!scan || busy) return;
    if (!window.confirm('¿Eliminar esta lectura y su archivo?')) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/vision/scans/${scan._id}`);
      setScans((prev) => prev.filter((item) => item._id !== scan._id));
      if (result?._id === scan._id) {
        setResult(null);
        setInvoice(null);
        setForm(EMPTY_FORM);
        clearFile();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function selectScan(scan) {
    setError(null);
    setNotice(null);
    clearFile();
    setResult(scan);
    setInvoice(scan.invoice ? { _id: scan.invoice } : null);
    setForm(formFromScan(scan));
  }

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function updateItem(index, name, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [name]: value } : item
      ),
    }));
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { descripcion: '', cantidad: 1, valor_unitario: 0 }],
    }));
  }

  function removeItem(index) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function fieldClass(name) {
    return lowFields.includes(name) ? 'vision-field is-low' : 'vision-field';
  }

  const statusMeta = result
    ? STATUS_META[result.status] || STATUS_META.review
    : STATUS_META.review;

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Visión por computador</span>
          <h2 className="page-title">Facturas con IA</h2>
          <p className="muted sec-sub">
            Sube una foto o PDF de una factura y la IA extrae los datos para tu
            registro de gastos.
          </p>
        </div>
        <span className="page-meta">
          {scans.length} lectura{scans.length === 1 ? '' : 's'} registrada
          {scans.length === 1 ? '' : 's'}
        </span>
      </div>

      <Alert>{error}</Alert>
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="vision-layout">
        <section className="card vision-upload-card">
          <div className="vision-card-head">
            <span className="vision-card-ico">
              <ScanIcon size={19} />
            </span>
            <div>
              <div className="vision-card-title">Nueva lectura</div>
              <div className="vision-card-sub">
                JPG, PNG, WEBP o PDF · máximo 10 MB
              </div>
            </div>
          </div>

          <div
            className={`vision-drop${dragOver ? ' is-over' : ''}${file ? ' has-file' : ''}`}
            role="button"
            tabIndex={0}
            onClick={(event) => {
              if (event.target === inputRef.current) return;
              inputRef.current?.click();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              acceptFile(event.dataTransfer.files?.[0]);
            }}
          >
            {preview ? (
              <img className="vision-preview" src={preview} alt="Vista previa de la factura" />
            ) : (
              <>
                <span className="vision-drop-ico">
                  <UploadIcon size={22} />
                </span>
                <strong>Arrastra la factura aquí</strong>
                <span>o haz clic para seleccionarla</span>
              </>
            )}
            <input
              ref={inputRef}
              className="vision-file-input"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => acceptFile(event.target.files?.[0])}
            />
          </div>

          {file && (
            <div className="vision-file-meta">
              <DocIcon size={16} />
              <span className="vision-file-name">{file.name}</span>
              <span>{fileSize(file.size)}</span>
              <button
                type="button"
                className="vision-clear"
                onClick={clearFile}
                aria-label="Quitar archivo"
              >
                ×
              </button>
            </div>
          )}

          <div className="vision-actions">
            <button
              className="btn btn-primary"
              onClick={handleScan}
              disabled={!file || busy}
            >
              {busy && !result ? 'Leyendo factura…' : 'Leer factura con IA'}
            </button>
            <span className="vision-hint">
              Proveedor, NIT, fecha, ítems y total.
            </span>
          </div>
        </section>

        <section className="card vision-result-card">
          <div className="vision-card-head">
            <span className="vision-card-ico accent">
              <ReceiptIcon size={19} />
            </span>
            <div>
              <div className="vision-card-title">Datos extraídos</div>
              <div className="vision-card-sub">
                Revisa y corrige antes de guardar.
              </div>
            </div>
            {result && (
              <span className={`status ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
            )}
          </div>

          {!result ? (
            <div className="vision-empty">
              <span className="vision-empty-ico">
                <ReceiptIcon size={26} />
              </span>
              <p>Aún no hay una factura leída.</p>
              <span>Sube un archivo para ver aquí los datos estructurados.</span>
            </div>
          ) : result.status === 'error' ? (
            <div className="vision-error">
              <p>No se pudo leer esta factura.</p>
              <span className="muted">{result.error}</span>
            </div>
          ) : (
            <>
              <div className="vision-confidence">
                <div className="vision-conf-head">
                  <span>Confianza de la lectura</span>
                  <strong className={highConfidence ? 'is-high' : 'is-low'}>
                    <AnimatedNumber value={confidence} />%
                  </strong>
                </div>
                <div className="vision-conf-track">
                  <span
                    className={highConfidence ? 'is-high' : 'is-low'}
                    style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
                  />
                </div>
                <div className="vision-techline">
                  {result.provider || 'proveedor'} · {result.model || 'modelo'} ·{' '}
                  {result.mode === 'text' ? 'texto del PDF' : 'imagen'}
                </div>
                {lowFields.length > 0 && result.status !== 'saved' && (
                  <p className="vision-review-hint">
                    Revisa: {lowFields.map((field) => FIELD_LABELS[field] || field).join(', ')}
                  </p>
                )}
              </div>

              {invoice && (
                <div className="vision-saved-banner">
                  <CheckIcon size={16} />
                  Guardada como gasto{invoice.total ? ` por ${money(invoice.total, invoice.moneda)}` : ''}.
                </div>
              )}

              <div className="vision-form-grid">
                <label className={fieldClass('proveedor')}>
                  <span>Proveedor</span>
                  <input
                    className="field-input"
                    value={form.proveedor}
                    onChange={(event) => updateField('proveedor', event.target.value)}
                  />
                </label>
                <label className={fieldClass('nit')}>
                  <span>NIT</span>
                  <input
                    className="field-input"
                    value={form.nit}
                    onChange={(event) => updateField('nit', event.target.value)}
                  />
                </label>
                <label className={fieldClass('numero_factura')}>
                  <span>Número de factura</span>
                  <input
                    className="field-input"
                    value={form.numero_factura}
                    onChange={(event) =>
                      updateField('numero_factura', event.target.value)
                    }
                  />
                </label>
                <label className={fieldClass('fecha')}>
                  <span>Fecha</span>
                  <input
                    className="field-input"
                    type="date"
                    value={form.fecha || ''}
                    onChange={(event) => updateField('fecha', event.target.value)}
                  />
                </label>
                <label className={fieldClass('subtotal')}>
                  <span>Subtotal</span>
                  <input
                    className="field-input"
                    type="number"
                    step="0.01"
                    value={form.subtotal}
                    onChange={(event) => updateField('subtotal', event.target.value)}
                  />
                </label>
                <label className={fieldClass('impuestos')}>
                  <span>Impuestos</span>
                  <input
                    className="field-input"
                    type="number"
                    step="0.01"
                    value={form.impuestos}
                    onChange={(event) => updateField('impuestos', event.target.value)}
                  />
                </label>
                <label className={`${fieldClass('total')} is-total`}>
                  <span>Total</span>
                  <input
                    className="field-input"
                    type="number"
                    step="0.01"
                    value={form.total}
                    onChange={(event) => updateField('total', event.target.value)}
                  />
                </label>
                <label className="vision-field">
                  <span>Moneda</span>
                  <input
                    className="field-input"
                    value={form.moneda}
                    onChange={(event) => updateField('moneda', event.target.value)}
                  />
                </label>
              </div>

              <div className="vision-items">
                <div className="vision-items-head">
                  <span>Descripción</span>
                  <span>Cant.</span>
                  <span>Valor unit.</span>
                  <span>Total</span>
                  <span />
                </div>
                {form.items.length === 0 ? (
                  <p className="vision-items-empty">Sin ítems detectados.</p>
                ) : (
                  form.items.map((item, index) => (
                    <div className="vision-item-row" key={index}>
                      <input
                        className="field-input"
                        value={item.descripcion || ''}
                        onChange={(event) =>
                          updateItem(index, 'descripcion', event.target.value)
                        }
                        placeholder="Descripción"
                      />
                      <input
                        className="field-input"
                        type="number"
                        step="0.01"
                        value={item.cantidad ?? ''}
                        onChange={(event) =>
                          updateItem(index, 'cantidad', event.target.value)
                        }
                      />
                      <input
                        className="field-input"
                        type="number"
                        step="0.01"
                        value={item.valor_unitario ?? ''}
                        onChange={(event) =>
                          updateItem(index, 'valor_unitario', event.target.value)
                        }
                      />
                      <span className="vision-item-total">
                        {money(
                          numberValue(item.cantidad) * numberValue(item.valor_unitario),
                          form.moneda
                        )}
                      </span>
                      <button
                        type="button"
                        className="vision-clear"
                        onClick={() => removeItem(index)}
                        aria-label="Quitar ítem"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
                <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>
                  + Añadir ítem
                </button>
              </div>

              {canReview && (
                <div className="vision-actions vision-result-actions">
                  <button
                    className="btn btn-primary"
                    onClick={handleConfirm}
                    disabled={busy}
                  >
                    {busy ? 'Guardando…' : 'Confirmar y guardar'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => handleDelete(result)}
                    disabled={busy}
                  >
                    Descartar lectura
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className="sec-head">
        <div>
          <h3 className="sec-title">Lecturas recientes</h3>
          <p className="sec-sub">Historial de facturas procesadas con visión.</p>
        </div>
      </div>

      {loadingHistory ? (
        <p className="muted">Cargando lecturas…</p>
      ) : scans.length === 0 ? (
        <div className="empty card">
          <span className="empty-ico">
            <ReceiptIcon size={28} />
          </span>
          <p>Todavía no has leído ninguna factura.</p>
        </div>
      ) : (
        <div className="card sw-list vision-scans">
          {scans.map((scan) => {
            const meta = STATUS_META[scan.status] || STATUS_META.review;
            const conf = Math.round(numberValue(scan.confianza) * 100);
            return (
              <button
                key={scan._id}
                type="button"
                className="sw-row vision-scan-row"
                onClick={() => selectScan(scan)}
              >
                <span className="sw-file tint-file">
                  <ReceiptIcon size={17} />
                </span>
                <span className="sw-main">
                  <span className="sw-name">
                    {scan.data?.proveedor || scan.originalName}
                  </span>
                  <span className="sw-sub">
                    {scan.originalName}
                    {scan.data?.fecha ? ` · ${scan.data.fecha}` : ''}
                    {scan.data?.total ? ` · ${money(scan.data.total, scan.data.moneda)}` : ''}
                  </span>
                </span>
                <span className={`vision-scan-conf ${conf >= Math.round(threshold * 100) ? 'is-high' : 'is-low'}`}>
                  {conf}%
                </span>
                <span className={`status ${meta.className}`}>{meta.label}</span>
                <span className="sw-date">
                  {scan.createdAt
                    ? new Date(scan.createdAt).toLocaleDateString()
                    : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
