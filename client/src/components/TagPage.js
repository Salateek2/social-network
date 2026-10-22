// Tag page (/tags/:tag) — all posts carrying a tag (visibility rules apply,
// so private-group posts only show to members). Uses the §20 search endpoint.
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ajaxError } from '../api';
import PostCard from './PostCard';

function TagPage({ me }) {
  const { tag } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      setPosts(await api('GET', `/api/posts/search?tag=${encodeURIComponent(tag)}`));
    } catch (err) {
      setMsg(ajaxError(err, 'Could not load posts for this tag.'));
      setPosts([]);
    }
  }, [tag]);

  useEffect(() => {
    setPosts(null);
    load();
  }, [load]);

  return (
    <main className="content">
      <div className="card">
        <div className="post-head">
          <h2 style={{ margin: 0 }}>#{tag}</h2>
          {posts && (
            <span className="muted">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </span>
          )}
          <div className="spacer" />
          <button className="btn ghost" onClick={() => navigate('/dashboard')}>
            ← Back to feed
          </button>
        </div>
        <div className="msg">{msg}</div>
      </div>

      {posts === null && <div className="loading">Loading posts…</div>}
      {posts && posts.length === 0 && (
        <div className="card muted">No posts with this tag (that you can see).</div>
      )}
      {posts &&
        posts.map((post) => (
          <PostCard key={post._id} post={post} me={me} onRefresh={load} />
        ))}
    </main>
  );
}

export default TagPage;
