import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Create account</h1>
        <p>Choose Admin to manage the full team or Member to work on assigned tasks.</p>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={handleSubmit} className="form">
          <label>Name<input value={form.name} onChange={(e) => update('name', e.target.value)} required /></label>
          <label>Email<input value={form.email} onChange={(e) => update('email', e.target.value)} type="email" required /></label>
          <label>Password<input value={form.password} onChange={(e) => update('password', e.target.value)} type="password" required minLength="6" /></label>
          <label>Role<select value={form.role} onChange={(e) => update('role', e.target.value)}><option value="member">Member</option><option value="admin">Admin</option></select></label>
          <button className="primary" disabled={loading}>{loading ? 'Creating...' : 'Signup'}</button>
        </form>
        <p className="muted">Already registered? <Link to="/login">Login</Link></p>
      </section>
    </main>
  );
}
