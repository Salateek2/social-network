// Notifications tab: incoming friend requests + group invitations.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ajaxError } from '../api';
import Avatar from './Avatar';

function Notifications() {
  const navigate = useNavigate();
  const [data, setData] = useState(null); // { friendRequests, groupInvites }
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const res = await api('GET', '/api/users/me/notifications');
      setData(res);
    } catch (err) {
      setMsg(ajaxError(err, 'Could not load notifications.'));
      setData({ friendRequests: [], groupInvites: [] });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(promise) {
    try {
      await promise;
      load();
    } catch (err) {
      setMsg(ajaxError(err));
      load(); // refresh anyway (e.g. invite to a deleted group gets cleaned up)
    }
  }

  if (!data) return <main className="content loading">Loading notifications…</main>;

  const empty = data.friendRequests.length === 0 && data.groupInvites.length === 0;

  return (
    <main className="content">
      <div className="msg">{msg}</div>

      {empty && (
        <div className="card muted">
          Nothing new — friend requests and group invitations will show up here.
        </div>
      )}

      {/* Friend requests */}
      {data.friendRequests.length > 0 && (
        <div className="card">
          <h3>Friend requests</h3>
          {data.friendRequests.map((u) => (
            <div className="req" key={u._id}>
              <Avatar avatar={u.avatar} size={32} />
              <span className="clickable" onClick={() => navigate(`/users/${u._id}`)}>
                <strong>{u.displayName || u.username}</strong>{' '}
                <span className="muted">@{u.username}</span>
              </span>
              <div className="spacer" />
              <button
                className="btn primary"
                onClick={() => act(api('POST', `/api/users/${u._id}/accept`))}
              >
                Accept
              </button>
              <button
                className="btn ghost"
                onClick={() => act(api('POST', `/api/users/${u._id}/decline`))}
              >
                Decline
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Group invitations */}
      {data.groupInvites.length > 0 && (
        <div className="card">
          <h3>Group invitations</h3>
          {data.groupInvites.map((inv) => (
            <div className="req" key={inv._id}>
              <span>
                <span
                  className="clickable"
                  onClick={() => inv.from && navigate(`/users/${inv.from._id}`)}
                >
                  <strong>{inv.from ? inv.from.displayName || inv.from.username : 'Someone'}</strong>
                </span>{' '}
                invited you to <strong>{inv.group.name}</strong>
                {inv.group.isPrivate && <span className="chip lock">Private</span>}
              </span>
              <div className="spacer" />
              <button
                className="btn primary"
                onClick={() => act(api('POST', `/api/groups/${inv.group._id}/accept-invite`))}
              >
                Join
              </button>
              <button
                className="btn ghost"
                onClick={() => act(api('DELETE', `/api/groups/${inv.group._id}/invite`))}
              >
                Decline
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default Notifications;
