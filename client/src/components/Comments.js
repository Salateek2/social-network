// Comments — click "💬 N comments" under any post to open the comments panel,
// read them, and add your own. Used by the feed, group pages and profiles.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ajaxError } from '../api';
import { formatDateTime } from '../format';
import Avatar from './Avatar';

function Comments({ post }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null); // null = not loaded yet
  const [count, setCount] = useState((post.comments || []).length);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');

  async function toggle() {
    const opening = !open;
    setOpen(opening);
    if (opening && comments === null) {
      try {
        // Single-post endpoint returns comments with their authors populated.
        const full = await api('GET', `/api/posts/${post._id}`);
        setComments(full.comments || []);
        setCount((full.comments || []).length);
      } catch (err) {
        setMsg(ajaxError(err, 'Could not load comments.'));
        setComments([]);
      }
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setMsg('');
    if (!text.trim()) return;
    try {
      const created = await api('POST', `/api/posts/${post._id}/comment`, {
        text: text.trim(),
      });
      setComments((prev) => [...(prev || []), created]);
      setCount((n) => n + 1);
      setText('');
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  return (
    <div className="comments-block">
      <button className="link" onClick={toggle}>
        💬 {count} {count === 1 ? 'comment' : 'comments'} {open ? '▴' : '▾'}
      </button>

      {open && (
        <div className="comments">
          {comments === null && <p className="muted">Loading comments…</p>}
          {comments && comments.length === 0 && (
            <p className="muted">No comments yet — be the first!</p>
          )}
          {(comments || []).map((c) => {
            const a = c.author || {};
            return (
              <div className="comment" key={c._id}>
                <Avatar avatar={a.avatar} size={26} />
                <div className="comment-body">
                  <span>
                    <strong
                      className="clickable"
                      onClick={() => a._id && navigate(`/users/${a._id}`)}
                    >
                      {a.displayName || a.username || 'Unknown'}
                    </strong>{' '}
                    <span className="muted comment-time">{formatDateTime(c.createdAt)}</span>
                  </span>
                  <span className="comment-text">{c.text}</span>
                </div>
              </div>
            );
          })}
          <form className="row" onSubmit={handleAdd}>
            <input
              placeholder="Write a comment…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn primary">Comment</button>
          </form>
          <div className="msg">{msg}</div>
        </div>
      )}
    </div>
  );
}

export default Comments;
