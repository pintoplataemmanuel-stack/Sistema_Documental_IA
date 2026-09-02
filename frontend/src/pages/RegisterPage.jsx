import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import Alert from '../components/Alert';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register, error } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '' });
  const [submitting, setSubmitting] = useState(false);
  const [passError, setPassError] = useState(null);

  function setField(key) {
    return (value) => setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password.length < 8) {
      setPassError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setPassError(null);
    setSubmitting(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        company: form.company,
      });
      navigate('/');
    } catch {
      // error en contexto
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Crear cuenta" subtitle="Regístrate para comenzar">
      <form onSubmit={handleSubmit} className="auth-form">
        <Alert>{error || passError}</Alert>
        <Field label="Nombre" value={form.name} onChange={setField('name')} placeholder="Tu nombre" required />
        <Field label="Correo" type="email" value={form.email} onChange={setField('email')} placeholder="tu@correo.com" required />
        <Field label="Contraseña" type="password" value={form.password} onChange={setField('password')} placeholder="Mínimo 8 caracteres" required />
        <Field label="Empresa (opcional)" value={form.company} onChange={setField('company')} placeholder="Nombre de tu empresa" />
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? 'Creando…' : 'Registrarse'}
        </button>
      </form>
      <p className="auth-switch">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </AuthLayout>
  );
}