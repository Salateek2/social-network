// Group page (/groups/:id) — §19 CRUD + §21 admin powers, all from the UI:
// group info, its posts, posting into the group, members, and (for admins)
// editing the group, approving join requests, and deleting the group.
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ajaxError } from '../api';
import Avatar from './Avatar';
import PostCard from './PostCard';

function GroupPage({ me }) {
  const { id } = useParams(); // group id from the URL
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [forbidden, setForbidden] = useState('');

  // Admin edit form
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: '', isPrivate: false });

  // Invite-friends panel
  const [inviting, setInviting] = useState(false);
  const [friends, setFriends] = useState([]);
  const [invitedIds, setInvitedIds] = useState({}); // uid -> true after inviting

  const load = useCallback(async () => {
    try {
      const g = await api('GET', `/api/groups/${id}`);
      setGroup(g);
      setForm({
        name: g.name,
        description: g.description || '',
        category: g.category || '',
        isPrivate: !!g.isPrivate,
      });
      const p = await api('GET', `/api/posts/search?group=${id}`);
      setPosts(p);
    } catch (err) {
      setForbidden(ajaxError(err, 'Could not load this group.'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (forbidden) {
    return (
      <main className="content">
        <div className="card">
          <p className="muted">{forbidden}</p>
          <button className="btn ghost" onClick={() => navigate('/groups')}>← Back to groups</button>
        </div>
      </main>
    );
  }
  if (!group) return <main className="content loading">Loading group…</main>;

  const myId = me && me._id;
  const isMember = (group.members || []).some((m) => String(m._id) === String(myId));
  const isAdmin = (group.admins || []).some((a) => String(a._id) === String(myId));

  async function handlePost(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api('POST', '/api/posts', { text: text.trim(), group: id });
      setText('');
      load();
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  async function handleJoin() {
    try {
      await api('POST', `/api/groups/${id}/join`);
      setMsg(group.isPrivate ? 'Join request sent — an admin must approve it.' : 'Join request sent.');
      load();
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  async function handleLeave() {
    try {
      await api('POST', `/api/groups/${id}/leave`);
      navigate('/groups');
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  async function toggleInvite() {
    const opening = !inviting;
    setInviting(opening);
    if (opening && me) {
      try {
        // My profile with the friends list populated.
        const profile = await api('GET', `/api/users/${me._id}`);
        setFriends(profile.friends || []);
      } catch (err) {
        setMsg(ajaxError(err));
      }
    }
  }

  async function handleInvite(userId) {
    try {
      await api('POST', `/api/groups/${id}/invite/${userId}`);
      setInvitedIds((prev) => ({ ...prev, [userId]: true }));
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  async function handleApprove(userId) {
    try {
      await api('POST', `/api/groups/${id}/approve/${userId}`);
      load();
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      await api('PUT', `/api/groups/${id}`, form);
      setEditing(false);
      load();
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  async function handleDeleteGroup() {
    if (!window.confirm(`Delete the group "${group.name}"? This cannot be undone.`)) return;
    try {
      await api('DELETE', `/api/groups/${id}`);
      navigate('/groups');
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  async function handleRemoveMember(userId, name) {
    if (!window.confirm(`Remove ${name} from the group?`)) return;
    try {
      await api('POST', `/api/groups/${id}/remove/${userId}`);
      load();
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  return (
    <main className="content">
      {/* Header */}
      <div className="card">
        <div className="post-head">
          <h2 style={{ margin: 0 }}>{group.name}</h2>
          {group.isPrivate && <span className="chip lock">Private</span>}
          {group.category && <span className="chip">{group.category}</span>}
          <div className="spacer" />
          {isMember && (
            <button className="btn ghost" onClick={toggleInvite}>
              {inviting ? 'Close invites' : 'Invite friends'}
            </button>
          )}
          {isAdmin && (
            <button className="btn ghost" onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel' : 'Edit group'}
            </button>
          )}
          {!isMember && (
            <button className="btn primary" onClick={handleJoin}>
              {group.isPrivate ? 'Request to join' : 'Join'}
            </button>
          )}
          {isMember && !isAdmin && (
            <button className="btn ghost" onClick={handleLeave}>Leave</button>
          )}
        </div>
        <p className="muted">{group.description}</p>

        {/* Admin: edit form (§19 Update, §21) */}
        {editing && (
          <form className="auth-form" onSubmit={handleSaveEdit}>
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={form.isPrivate}
                onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })}
              />
              Private group
            </label>
            <div className="row">
              <button className="btn primary">Save</button>
              <div className="spacer" />
              <button type="button" className="btn ghost danger" onClick={handleDeleteGroup}>
                Delete group
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Invite friends (members only) */}
      {inviting && (
        <div className="card">
          <h3>Invite friends</h3>
          {(() => {
            const memberIds = new Set((group.members || []).map((m) => String(m._id)));
            const candidates = friends.filter((f) => !memberIds.has(String(f._id)));
            if (candidates.length === 0) {
              return <p className="muted">All of your friends are already members.</p>;
            }
            return candidates.map((f) => (
              <div className="req" key={f._id}>
                <span className="clickable" onClick={() => navigate(`/users/${f._id}`)}>
                  {f.displayName || f.username}
                </span>
                <div className="spacer" />
                {invitedIds[f._id] ? (
                  <span className="chip">Invited ✓</span>
                ) : (
                  <button className="btn primary" onClick={() => handleInvite(f._id)}>
                    Invite
                  </button>
                )}
              </div>
            ));
          })()}
        </div>
      )}

      {/* Admin: pending join requests (§21) */}
      {isAdmin && (group.pendingRequests || []).length > 0 && (
        <div className="card">
          <h3>Join requests</h3>
          {group.pendingRequests.map((u) => (
            <div className="req" key={u._id}>
              <Avatar avatar={u.avatar} size={28} />
              <span
                className="clickable"
                onClick={() => navigate(`/users/${u._id}`)}
              >
                {u.displayName || u.username}
              </span>
              <div className="spacer" />
              <button className="btn primary" onClick={() => handleApprove(u._id)}>
                Approve
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Members */}
      <div className="card">
        <h3>Members ({(group.members || []).length})</h3>
        <div className="row">
          {(group.members || []).map((m) => {
            const admin = (group.admins || []).some((a) => String(a._id) === String(m._id));
            return (
              <span
                key={m._id}
                className="chip clickable member-chip"
                onClick={() => navigate(`/users/${m._id}`)}
              >
                <Avatar avatar={m.avatar} size={20} />
                {m.displayName || m.username}{admin ? ' ★' : ''}
                {isAdmin && !admin && (
                  <button
                    className="chip-x"
                    title="Remove from group"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMember(m._id, m.displayName || m.username);
                    }}
                  >
                    ✕
                  </button>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Composer (members only — the server enforces this too) */}
      {isMember && (
        <div className="card composer">
          <form onSubmit={handlePost}>
            <textarea
              placeholder={`Post something in ${group.name}…`}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="row">
              <div className="msg">{msg}</div>
              <div className="spacer" />
              <button className="btn primary">Post</button>
            </div>
          </form>
        </div>
      )}
      {!isMember && <div className="msg">{msg}</div>}

      {/* Group posts */}
      {posts.length === 0 && <div className="card muted">No posts in this group yet.</div>}
      {posts.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          me={me}
          onRefresh={load}
          adminCanDelete={isAdmin}
          showGroup={false}
        />
      ))}
    </main>
  );
}

export default GroupPage;
