// Public landing page ("front"). From here you go to Login or Register.
import { useNavigate } from 'react-router-dom';

function Front() {
  const navigate = useNavigate(); // navigate('/login') switches page (like router.push)

  return (
    <div className="auth-view">
      <div className="auth-card">
        <h1 className="brand">🐾 Pawst</h1>
        <p className="muted center">
          Share posts, join groups and chat with friends in real time.
        </p>
        <div className="row center">
          <button className="btn primary" onClick={() => navigate('/login')}>
            Log in
          </button>
          <button className="btn ghost" onClick={() => navigate('/register')}>
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}

export default Front;
