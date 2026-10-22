// Top navigation bar, shown on every page once logged in.
// Polls the notification count so the badge stays fresh.
import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { firebaseLogout } from '../firebase';
import { api } from '../api';
import Avatar from './Avatar';

function Navbar({ me }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifCount, setNotifCount] = useState(0);

  // Refresh the badge on page change + every 30 seconds.
  useEffect(() => {
    if (!me) return;
    let alive = true;
    async function tick() {
      try {
        const n = await api('GET', '/api/users/me/notifications');
        if (alive) setNotifCount(n.friendRequests.length + n.groupInvites.length);
      } catch (err) {
        /* badge is best-effort */
      }
    }
    tick();
    const timer = setInterval(tick, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [me, location.pathname]);

  async function handleLogout() {
    await firebaseLogout();
    navigate('/'); // back to the front page
  }

  // NavLink adds the "active" class automatically on the current page.
  const cls = ({ isActive }) => 'nav-btn' + (isActive ? ' active' : '');

  return (
    <header className="topbar">
      <h1 className="brand small">🐾 Pawst</h1>
      <nav className="nav">
        <NavLink to="/dashboard" className={cls}>Feed</NavLink>
        <NavLink to="/people" className={cls}>People</NavLink>
        <NavLink to="/groups" className={cls}>Groups</NavLink>
        <NavLink to="/chat" className={cls}>Chat</NavLink>
        <NavLink to="/notifications" className={cls}>
          Notifications{notifCount > 0 && <span className="badge">{notifCount}</span>}
        </NavLink>
        <NavLink to="/stats" className={cls}>Stats</NavLink>
        <NavLink to="/profile" className={cls}>Profile</NavLink>
      </nav>
      <div className="spacer" />
      {me && <Avatar avatar={me.avatar} size={28} />}
      <span className="me-name">{me ? me.displayName || me.username : ''}</span>
      <button className="btn ghost" onClick={handleLogout}>Log out</button>
    </header>
  );
}

export default Navbar;
