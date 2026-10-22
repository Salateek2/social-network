// Login page — Firebase email/password (§21).
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { firebaseLogin } from '../firebase';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('');
    if (!email || !password) {
      setMsg('Email and password are required.');
      return;
    }
    setBusy(true);
    try {
      await firebaseLogin(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      // Firebase gives codes like auth/invalid-credential — show a friendly message.
      setMsg('Invalid email or password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-view">
      <div className="auth-card">
        <h1 className="brand">🐾 Pawst</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="msg">{msg}</div>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="muted center">
          No account yet? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
