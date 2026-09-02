import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import Alert from '../components/Alert';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch {
      // el error queda en el contexto
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Iniciar sesión" subtitle="Sistema Documental con IA">
      <form onSubmit={handleSubmit} className="auth-form">
        <Alert>{error}</Alert>
        <Field label="Correo" type="email" value={email} onChange={setEmail} placeholder="tu@correo.com" required />
        <Field label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
      <p className="auth-switch">
        ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
      </p>
    </AuthLayout>
  );
}