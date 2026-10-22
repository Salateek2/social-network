// People page (§19): my friends list + user search + start-a-chat buttons.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ajaxError } from '../api';
import Avatar from './Avatar';

function People({ me }) {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null = no search yet
  const [sent, setSent] = useState({}); // uid -> true after friend request
  const [msg, setMsg] = useState('');

  // My friends, populated (name + avatar).
  useEffect(() => {
    if (!me) return;
    (async () => {
      try {
        const profile = await api('GET', `/api/users/${me._id}`);
        setFriends(profile.friends || []);
      } catch (err) {
        setMsg(ajaxError(err, 'Could not load your friends.'));
      }
    })();
  }, [me]);

  async function handleSearch(e) {
    e.preventDefault();
    setMsg('');
    try {
      const r = await api(
        'GET',
        `/api/users/search?q=${encodeURIComponent(query.trim())}`
      );
      setResults(r.filter((u) => String(u._id) !== String(me && me._id)));
    } catch (err) {
      setMsg(ajaxError(err, 'Search failed.'));
    }
  }

  async function handleAddFriend(userId) {
    try {
      await api('POST', `/api/users/${userId}/friend-request`);
      setSent((prev) => ({ ...prev, [userId]: true }));
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  const friendIds = new Set(friends.map((f) => String(f._id)));

  function personRow(u, isFriend) {
    return (
      <div className="req" key={u._id}>
        <Avatar avatar={u.avatar} size={36} />
        <span className="clickable" onClick={() => navigate(`/users/${u._id}`)}>
          <strong>{u.displayName || u.username}</strong>{' '}
          <span className="muted">@{u.username}</span>
        </span>
        <div className="spacer" />
        {isFriend && (
          <button className="btn primary" onClick={() => navigate(`/chat?with=${u._id}`)}>
            Message
          </button>
        )}
        {!isFriend && sent[u._id] && <span className="chip">Request sent ✓</span>}
        {!isFriend && !sent[u._id] && (
          <button className="btn primary" onClick={() => handleAddFriend(u._id)}>
            Add friend
          </button>
        )}
        <button className="btn ghost" onClick={() => navigate(`/users/${u._id}`)}>
          Profile
        </button>
      </div>
    );
  }

  return (
    <main className="content">
      {/* Search (§19: user search from the UI) */}
      <div className="card">
        <h3>Find people</h3>
        <form className="row" onSubmit={handleSearch}>
          <input
            placeholder="Search by name or username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn primary">Search</button>
        </form>
        <div className="msg">{msg}</div>
        {results && results.length === 0 && (
          <p className="muted">No one found for that search.</p>
        )}
        {results && results.map((u) => personRow(u, friendIds.has(String(u._id))))}
      </div>

      {/* My friends */}
      <div className="card">
        <h3>My friends ({friends.length})</h3>
        {friends.length === 0 && (
          <p className="muted">
            No friends yet — search for people above and send a request.
          </p>
        )}
        {friends.map((f) => personRow(f, true))}
      </div>
    </main>
  );
}

export default People;
