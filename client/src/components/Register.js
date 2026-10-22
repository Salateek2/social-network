// Register page (§21, §24).
// 1. Creates the account in Firebase (email + password).
// 2. Creates the matching MongoDB profile via POST /api/auth/sync.
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, firebaseRegister } from '../firebase';
import { api, ajaxError } from '../api';

function Register({ onProfile }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('');

    // Client-side validation (§24) — the server re-checks everything.
    if (username.trim().length < 3) {
      setMsg('Username must be at least 3 characters.');
      return;
    }
    if (!auth.currentUser) {
      if (!email.trim()) {
        setMsg('Email is required.');
        return;
      }
      if (password.length < 6) {
        setMsg('Password must be at least 6 characters.');
        return;
      }
    }

    setBusy(true);
    try {
      // Step 1: Firebase account.
      // (If you're already logged in to Firebase but your profile was never
      // created — e.g. registration was interrupted — skip straight to step 2.)
      if (!auth.currentUser) {
        await firebaseRegister(email.trim(), password);
      }
      // Step 2: MongoDB profile
      const profile = await api('POST', '/api/auth/sync', {
        username: username.trim(),
        displayName: displayName.trim() || username.trim(),
      });
      onProfile(profile);
      navigate('/dashboard');
    } catch (err) {
      if (err && err.code === 'auth/email-already-in-use') {
        setMsg('That email is already registered. Try logging in.');
      } else if (err && err.code === 'auth/weak-password') {
        setMsg('Password is too weak.');
      } else {
        setMsg(ajaxError(err, 'Registration failed. Please try again.'));
      }
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
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            placeholder="Display name (optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="msg">{msg}</div>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="muted center">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
