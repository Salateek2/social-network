// Profile page (§19): view my profile + my posts; editing (name, bio, avatar)
// and account deletion are hidden behind an "Edit profile" toggle.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ajaxError } from '../api';
import { firebaseLogout } from '../firebase';
import Avatar, { AVATAR_KEYS } from './Avatar';
import PostCard from './PostCard';

function Profile({ me, onChange }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState((me && me.displayName) || '');
  const [bio, setBio] = useState((me && me.bio) || '');
  const [avatar, setAvatar] = useState((me && me.avatar) || '');
  const [posts, setPosts] = useState(null);
  const [msg, setMsg] = useState('');
  const [saved, setSaved] = useState(false);

  // My posts (personal + group posts I wrote).
  async function loadPosts() {
    try {
      setPosts(await api('GET', '/api/posts/mine'));
    } catch (err) {
      setPosts([]);
    }
  }

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the form in sync if `me` arrives after first render.
  useEffect(() => {
    if (me) {
      setDisplayName(me.displayName || '');
      setBio(me.bio || '');
      setAvatar(me.avatar || '');
    }
  }, [me]);

  if (!me) {
    // Logged in to Firebase but no MongoDB profile yet (interrupted sign-up).
    return (
      <main className="content">
        <div className="card">
          <h3>Almost there</h3>
          <p className="muted">
            Your login works, but your profile was never created. Go to the{' '}
            <a href="/register">registration page</a>, pick a username and press
            Create account — it will finish setting you up (you won't get a
            duplicate account).
          </p>
        </div>
      </main>
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    setMsg('');
    setSaved(false);
    try {
      const updated = await api('PUT', '/api/users/me', {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar,
      });
      onChange(updated);
      setSaved(true);
      setEditing(false);
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  async function handleDelete() {
    if (!window.confirm('Really delete your account? This cannot be undone.')) return;
    try {
      await api('DELETE', '/api/users/me');
      await firebaseLogout();
      navigate('/');
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  return (
    <main className="content">
      {/* Profile header (view mode) */}
      <div className="card">
        <div className="post-head">
          <Avatar avatar={me.avatar} size={64} />
          <div>
            <h2 style={{ margin: 0 }}>{me.displayName || me.username}</h2>
            <p className="muted" style={{ margin: 0 }}>
              @{me.username} · {me.email}
            </p>
          </div>
          <div className="spacer" />
          <button className="btn ghost" onClick={() => setEditing(!editing)}>
            {editing ? 'Close' : 'Edit profile'}
          </button>
        </div>
        {me.bio && <p className="post-text">{me.bio}</p>}
        {saved && <div className="muted">Saved ✓</div>}
        <div className="msg">{msg}</div>
      </div>

      {/* Edit window (hidden until "Edit profile") */}
      {editing && (
        <div className="card">
          <h3>Edit profile</h3>
          <p className="muted">Pick your animal:</p>
          <div className="row">
            {AVATAR_KEYS.map((key) => (
              <span
                key={key}
                className={'avatar-option' + (avatar === key ? ' selected' : '')}
                onClick={() => setAvatar(key)}
              >
                <Avatar avatar={key} size={40} />
              </span>
            ))}
          </div>
          <form className="auth-form" onSubmit={handleSave}>
            <input
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <textarea
              placeholder="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <button className="btn primary">Save changes</button>
          </form>

          <h3 style={{ marginTop: 24 }}>Danger zone</h3>
          <p className="muted">Deleting your account removes your profile permanently.</p>
          <button className="btn ghost danger" onClick={handleDelete}>
            Delete my account
          </button>
        </div>
      )}

      {/* My posts */}
      <h3 className="muted">My posts</h3>
      {posts === null && <div className="loading">Loading posts…</div>}
      {posts && posts.length === 0 && (
        <div className="card muted">You haven't posted anything yet.</div>
      )}
      {posts &&
        posts.map((post) => (
          <PostCard key={post._id} post={post} me={me} onRefresh={loadPosts} />
        ))}
    </main>
  );
}

export default Profile;
