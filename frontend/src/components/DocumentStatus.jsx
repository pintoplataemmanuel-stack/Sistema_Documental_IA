const META = {
  pending: { label: 'Pendiente', className: 'status-pending' },
  processing: { label: 'Procesando…', className: 'status-processing' },
  completed: { label: 'Completado', className: 'status-completed' },
  error: { label: 'Error', className: 'status-error' },
};

export default function DocumentStatus({ status }) {
  const meta = META[status] || { label: status, className: 'status-pending' };
  return <span className={`status ${meta.className}`}>{meta.label}</span>;
}