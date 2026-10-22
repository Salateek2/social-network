// User profile page (/users/:id) — someone else's public profile:
// their info, their posts (filtered by what I'm allowed to see, §21),
// and friend actions (request / accept / remove).
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ajaxError } from '../api';
import { formatDate } from '../format';
import Avatar from './Avatar';
import PostCard from './PostCard';

function UserPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [meFresh, setMeFresh] = useState(null); // fresh copy of me (friends/requests)
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [u, p, meRes] = await Promise.all([
        api('GET', `/api/users/${id}`),
        api('GET', `/api/posts/user/${id}`),
        api('GET', '/api/auth/me'),
      ]);
      setUser(u);
      setPosts(p);
      setMeFresh(meRes.user);
    } catch (err) {
      setMsg(ajaxError(err, 'Could not load this profile.'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <main className="content">
        <div className="loading">Loading profile…</div>
        <div className="msg">{msg}</div>
      </main>
    );
  }

  const myId = meFresh && meFresh._id;
  const isMe = String(myId) === String(id);
  const isFriend = ((meFresh && meFresh.friends) || []).some(
    (f) => String(f._id || f) === String(id)
  );
  const requestedMe = ((meFresh && meFresh.friendRequests) || []).some(
    (f) => String(f._id || f) === String(id)
  );

  async function handleFriendRequest() {
    try {
      await api('POST', `/api/users/${id}/friend-request`);
      setMsg('Friend request sent!');
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  async function handleAccept() {
    try {
      await api('POST', `/api/users/${id}/accept`);
      load();
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  async function handleRemoveFriend() {
    if (!window.confirm(`Remove ${user.displayName || user.username} from your friends?`)) return;
    try {
      await api('DELETE', `/api/users/${id}/friend`);
      load();
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  return (
    <main className="content">
      {/* Profile header */}
      <div className="card">
        <div className="post-head">
          <Avatar avatar={user.avatar} size={64} />
          <h2 style={{ margin: 0 }}>{user.displayName || user.username}</h2>
          <span className="muted">@{user.username}</span>
          <div className="spacer" />
          {isMe && (
            <button className="btn ghost" onClick={() => navigate('/profile')}>
              Edit my profile
            </button>
          )}
          {!isMe && (
            <button className="btn primary" onClick={() => navigate(`/chat?with=${id}`)}>
              Message
            </button>
          )}
          {!isMe && isFriend && (
            <>
              <span className="chip">Friends ✓</span>
              <button className="btn ghost" onClick={handleRemoveFriend}>Remove</button>
            </>
          )}
          {!isMe && !isFriend && requestedMe && (
            <button className="btn primary" onClick={handleAccept}>
              Accept friend request
            </button>
          )}
          {!isMe && !isFriend && !requestedMe && (
            <button className="btn ghost" onClick={handleFriendRequest}>
              Add friend
            </button>
          )}
        </div>
        {user.bio && <p className="post-text">{user.bio}</p>}
        <p className="muted">
          {(user.friends || []).length} friends · joined {formatDate(user.createdAt)}
        </p>
        {(user.friends || []).length > 0 && (
          <div className="row">
            {user.friends.map((f) => (
              <span
                key={f._id}
                className="chip clickable member-chip"
                onClick={() => navigate(`/users/${f._id}`)}
              >
                <Avatar avatar={f.avatar} size={20} />
                {f.displayName || f.username}
              </span>
            ))}
          </div>
        )}
        <div className="msg">{msg}</div>
      </div>

      {/* Their posts */}
      <h3 className="muted">Posts</h3>
      {posts.length === 0 && <div className="card muted">No posts to show.</div>}
      {posts.map((post) => (
        <PostCard key={post._id} post={post} me={meFresh} onRefresh={load} />
      ))}
    </main>
  );
}

export default UserPage;
