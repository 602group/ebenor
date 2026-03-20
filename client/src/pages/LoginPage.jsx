import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: 'admin', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch {
      setError('Invalid username or password');
    } finally { setLoading(false); }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>IV</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>InvestOS</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Investment Platform</div>
          </div>
        </div>

        <div className="login-title">Welcome back</div>
        <div className="login-subtitle">Sign in to your investment command center</div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} />Signing in...</> : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '14px', background: 'var(--bg-3)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Default credentials:</strong><br />
          Username: <code style={{ color: 'var(--accent)' }}>admin</code> &nbsp;|&nbsp; Password: <code style={{ color: 'var(--accent)' }}>admin123</code>
        </div>
      </div>
    </div>
  );
}
