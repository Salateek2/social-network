// Dashboard — the feed (§22), a composer with video (§26.i) and canvas
// drawings (§26.ii), and the advanced post search (§20: keyword + tag +
// group + date range — 3+ user-set parameters).
import { useEffect, useState } from 'react';
import { api, apiUpload, ajaxError } from '../api';
import PostCard from './PostCard';
import CanvasBoard from './CanvasBoard';

function Dashboard({ me }) {
  const [posts, setPosts] = useState(null); // null = loading
  const [msg, setMsg] = useState('');

  // Composer
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const [drawing, setDrawing] = useState(''); // canvas PNG (data URL)
  const [showCanvas, setShowCanvas] = useState(false);
  const [uploaded, setUploaded] = useState(null); // { url, mediaType, name }
  const [uploading, setUploading] = useState(false);

  // Advanced search (§20)
  const [showSearch, setShowSearch] = useState(false);
  const [groups, setGroups] = useState([]);
  const [sq, setSq] = useState({ q: '', tag: '', group: '', from: '', to: '' });
  const [results, setResults] = useState(null); // null = showing the feed

  async function loadFeed() {
    try {
      setPosts(await api('GET', '/api/posts/feed'));
    } catch (err) {
      setMsg(ajaxError(err, 'Could not load the feed.'));
      setPosts([]);
    }
  }

  useEffect(() => {
    loadFeed();
  }, []);

  async function runSearch() {
    const params = new URLSearchParams();
    Object.entries(sq).forEach(([k, v]) => v && params.append(k, v));
    try {
      setResults(await api('GET', '/api/posts/search?' + params.toString()));
    } catch (err) {
      setMsg(ajaxError(err, 'Search failed.'));
    }
  }

  // After like/edit/delete: refresh whatever is on screen.
  function refresh() {
    loadFeed();
    if (results !== null) runSearch();
  }

  async function toggleSearch() {
    const opening = !showSearch;
    setShowSearch(opening);
    if (opening && groups.length === 0) {
      try {
        setGroups(await api('GET', '/api/groups'));
      } catch (err) {
        /* group dropdown just stays empty */
      }
    }
  }

  // Upload a video/image picked from the computer.
  async function handleFilePick(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setMsg('');
    setUploading(true);
    try {
      const r = await apiUpload(file);
      setUploaded({ url: r.url, mediaType: r.mediaType, name: file.name });
      setDrawing('');
      setVideoUrl('');
    } catch (err) {
      setMsg(ajaxError(err, 'Upload failed — images and videos up to 50MB.'));
    } finally {
      setUploading(false);
    }
  }

  async function handlePost(e) {
    e.preventDefault();
    setMsg('');
    if (!text.trim()) {
      setMsg('Write something first.');
      return;
    }
    const body = { text: text.trim(), tags };
    if (drawing) {
      body.mediaUrl = drawing;
      body.mediaType = 'image';
    } else if (uploaded) {
      body.mediaUrl = uploaded.url;
      body.mediaType = uploaded.mediaType;
    } else if (videoUrl.trim()) {
      body.mediaUrl = videoUrl.trim();
      body.mediaType = 'video';
    }
    try {
      await api('POST', '/api/posts', body);
      setText('');
      setTags('');
      setVideoUrl('');
      setDrawing('');
      setUploaded(null);
      setShowVideo(false);
      setShowCanvas(false);
      loadFeed();
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  const shown = results !== null ? results : posts;

  return (
    <main className="content">
      {/* Composer */}
      <div className="card composer">
        <form onSubmit={handlePost}>
          <textarea
            placeholder="What's on your mind?"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="row">
            <input
              placeholder="Tags (comma separated, e.g. food, campus)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          {showVideo && (
            <div className="row">
              <input
                placeholder="Video URL (link to an .mp4 file)"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
          )}
          {drawing && (
            <div className="row">
              <img src={drawing} alt="your drawing" className="drawing-preview" />
              <button type="button" className="link" onClick={() => setDrawing('')}>
                Remove drawing
              </button>
            </div>
          )}
          {uploaded && (
            <div className="row">
              {uploaded.mediaType === 'image' ? (
                <img src={uploaded.url} alt="upload" className="drawing-preview" />
              ) : (
                <span className="chip">🎬 {uploaded.name}</span>
              )}
              <button type="button" className="link" onClick={() => setUploaded(null)}>
                Remove
              </button>
            </div>
          )}
          <div className="row">
            <label className="btn ghost upload-btn">
              {uploading ? 'Uploading…' : '📎 Upload'}
              <input
                type="file"
                accept="video/*,image/*"
                onChange={handleFilePick}
                disabled={uploading}
                hidden
              />
            </label>
            <button type="button" className="btn ghost" onClick={() => setShowVideo(!showVideo)}>
              🎬 Video URL
            </button>
            <button type="button" className="btn ghost" onClick={() => setShowCanvas(!showCanvas)}>
              🎨 Draw
            </button>
            <div className="msg">{msg}</div>
            <div className="spacer" />
            <button className="btn primary">Post</button>
          </div>
        </form>
        {showCanvas && (
          <CanvasBoard
            onAttach={(dataUrl) => {
              setDrawing(dataUrl);
              setShowCanvas(false);
            }}
            onClose={() => setShowCanvas(false)}
          />
        )}
      </div>

      {/* Advanced search (§20) */}
      <div className="card">
        <button className="link" onClick={toggleSearch}>
          🔍 Advanced post search {showSearch ? '▴' : '▾'}
        </button>
        {showSearch && (
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              runSearch();
            }}
          >
            <div className="row">
              <input
                placeholder="Keyword"
                value={sq.q}
                onChange={(e) => setSq({ ...sq, q: e.target.value })}
              />
              <input
                placeholder="Tag"
                value={sq.tag}
                onChange={(e) => setSq({ ...sq, tag: e.target.value })}
              />
            </div>
            <div className="row">
              <select value={sq.group} onChange={(e) => setSq({ ...sq, group: e.target.value })}>
                <option value="">Any group</option>
                {groups.map((g) => (
                  <option key={g._id} value={g._id}>{g.name}</option>
                ))}
              </select>
              <label className="check">
                From <input type="date" value={sq.from} onChange={(e) => setSq({ ...sq, from: e.target.value })} />
              </label>
              <label className="check">
                To <input type="date" value={sq.to} onChange={(e) => setSq({ ...sq, to: e.target.value })} />
              </label>
            </div>
            <div className="row">
              <button className="btn primary">Search</button>
              {results !== null && (
                <button type="button" className="btn ghost" onClick={() => setResults(null)}>
                  Clear — back to feed
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Feed / search results */}
      {results !== null && <h3 className="muted">Search results ({results.length})</h3>}
      {shown === null && <div className="loading">Loading feed…</div>}
      {shown && shown.length === 0 && (
        <div className="card muted">
          {results !== null
            ? 'No posts match your search.'
            : 'Nothing here yet — write your first post, or join a group.'}
        </div>
      )}
      {shown &&
        shown.map((post) => (
          <PostCard key={post._id} post={post} me={me} onRefresh={refresh} />
        ))}
    </main>
  );
}

export default Dashboard;
