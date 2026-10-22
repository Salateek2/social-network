// Real-time chat (§28) over Socket.io, history persisted in MongoDB.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api, ajaxError } from '../api';
import { getToken } from '../firebase';
import { formatTime } from '../format';
import Avatar from './Avatar';

function Chat({ me }) {
  const [searchParams] = useSearchParams(); // supports /chat?with=<userId>
  const autoOpenedRef = useRef(false);
  const [people, setPeople] = useState([]); // everyone I can chat with
  const [active, setActive] = useState(null); // the user I'm chatting with
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const socketRef = useRef(null);
  const activeRef = useRef(null);
  const bottomRef = useRef(null);

  // Connect the socket once, authenticated with our Firebase token.
  useEffect(() => {
    let socket;
    (async () => {
      const token = await getToken();
      socket = io({ auth: { token } });
      socketRef.current = socket;

      socket.on('chat:message', (m) => {
        const other = activeRef.current;
        if (
          other &&
          (String(m.from) === String(other._id) || String(m.to) === String(other._id))
        ) {
          setMessages((prev) => [...prev, m]);
        }
      });
      socket.on('chat:error', (e) => setMsg(e));
    })();
    return () => socket && socket.disconnect();
  }, []);

  // Load the user list.
  useEffect(() => {
    (async () => {
      try {
        const users = await api('GET', '/api/users');
        setPeople(users.filter((u) => String(u._id) !== String(me && me._id)));
      } catch (err) {
        setMsg(ajaxError(err, 'Could not load users.'));
      }
    })();
  }, [me]);

  // Arrived via a "Message" button (/chat?with=<id>)? Open that chat directly.
  useEffect(() => {
    const withId = searchParams.get('with');
    if (withId && !autoOpenedRef.current && people.length > 0) {
      const target = people.find((p) => String(p._id) === String(withId));
      if (target) {
        autoOpenedRef.current = true;
        openChat(target);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, searchParams]);

  // Open a conversation: load its history.
  async function openChat(user) {
    setActive(user);
    activeRef.current = user;
    setMessages([]);
    try {
      const history = await api('GET', `/api/messages/${user._id}`);
      setMessages(history);
    } catch (err) {
      setMsg(ajaxError(err, 'Could not load messages.'));
    }
  }

  // Auto-scroll to the newest message.
  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || !active || !socketRef.current) return;
    socketRef.current.emit('chat:send', { to: active._id, text: text.trim() });
    setText('');
  }

  const myId = me && me._id;

  return (
    <main className="content wide">
      <div className="chat-wrap">
        {/* People list */}
        <div className="card chat-list">
          <h3>People</h3>
          {people.map((u) => (
            <div className="chat-person" key={u._id} onClick={() => openChat(u)}>
              <Avatar avatar={u.avatar} size={26} /> {u.displayName || u.username}
            </div>
          ))}
          {people.length === 0 && <p className="muted">No one else here yet.</p>}
        </div>

        {/* Conversation */}
        <div className="card chat-main">
          {!active && <p className="muted">Pick someone to chat with.</p>}
          {active && (
            <>
              <div className="chat-header">
                <Avatar avatar={active.avatar} size={28} /> {active.displayName || active.username}
              </div>
              <div className="chat-messages">
                {messages.map((m) => (
                  <div
                    key={m._id}
                    className={'bubble ' + (String(m.from) === String(myId) ? 'mine' : 'theirs')}
                  >
                    {m.text}
                    <span className="bubble-time">{formatTime(m.createdAt)}</span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form className="row chat-input" onSubmit={handleSend}>
                <input
                  placeholder="Type a message…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button className="btn primary">Send</button>
              </form>
            </>
          )}
          <div className="msg">{msg}</div>
        </div>
      </div>
    </main>
  );
}

export default Chat;
