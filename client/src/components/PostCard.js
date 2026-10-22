// PostCard — one post, used everywhere (feed, groups, profiles).
// Handles: like, edit-own-post (§19 Update), delete (own / group-admin §21),
// video (§26.i), image/drawing display, tags, and the comments panel.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ajaxError } from '../api';
import { formatDateTime } from '../format';
import Avatar from './Avatar';
import Comments from './Comments';
import VideoPlayer from './VideoPlayer';

function PostCard({ post, me, onRefresh, adminCanDelete = false, showGroup = true }) {
  const navigate = useNavigate();
  const author = post.author || {};
  const myId = me && me._id;
  const isMine = String(author._id) === String(myId);

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(post.text);
  const [tags, setTags] = useState((post.tags || []).join(', '));
  const [likes, setLikes] = useState((post.likes || []).length);
  const [liked, setLiked] = useState(
    (post.likes || []).some((l) => String(l) === String(myId))
  );
  const [msg, setMsg] = useState('');

  async function handleLike() {
    try {
      const r = await api('POST', `/api/posts/${post._id}/like`);
      setLikes(r.likes);
      setLiked(r.liked);
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api('DELETE', `/api/posts/${post._id}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setMsg('');
    if (!text.trim()) {
      setMsg('Post text is required.');
      return;
    }
    try {
      await api('PUT', `/api/posts/${post._id}`, { text: text.trim(), tags });
      setEditing(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  return (
    <article className="card">
      <div className="post-head">
        <Avatar avatar={author.avatar} />
        <strong
          className="clickable"
          onClick={() => author._id && navigate(`/users/${author._id}`)}
        >
          {author.displayName || author.username || 'Unknown'}
        </strong>
        {showGroup && post.group && (
          <span
            className="chip clickable"
            onClick={() => navigate(`/groups/${post.group._id}`)}
          >
            {post.group.name}
          </span>
        )}
        <span className="time muted">{formatDateTime(post.createdAt)}</span>
      </div>

      {!editing && (
        <>
          <p className="post-text">{post.text}</p>
          {post.mediaType === 'video' && post.mediaUrl && <VideoPlayer src={post.mediaUrl} />}
          {post.mediaType === 'image' && post.mediaUrl && (
            <img className="post-media" src={post.mediaUrl} alt="attachment" />
          )}
          {(post.tags || []).length > 0 && (
            <div className="tags">
              {post.tags.map((t) => (
                <span
                  className="tag clickable"
                  key={t}
                  onClick={() => navigate(`/tags/${encodeURIComponent(t)}`)}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {editing && (
        <form className="auth-form" onSubmit={handleSaveEdit}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} />
          <input
            placeholder="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <div className="row">
            <button className="btn primary">Save</button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setEditing(false);
                setText(post.text);
                setTags((post.tags || []).join(', '));
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="post-actions">
        <button className="link" onClick={handleLike}>
          {liked ? '♥' : '♡'} {likes}
        </button>
        <div className="spacer" />
        {isMine && !editing && (
          <button className="link" onClick={() => setEditing(true)}>Edit</button>
        )}
        {(isMine || adminCanDelete) && (
          <button className="link" onClick={handleDelete}>Delete</button>
        )}
      </div>
      <div className="msg">{msg}</div>
      <Comments post={post} />
    </article>
  );
}

export default PostCard;
