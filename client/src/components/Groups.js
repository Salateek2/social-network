// Groups page (§19): list, search, create, join / leave.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ajaxError } from '../api';

function Groups({ me }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState(null);
  const [msg, setMsg] = useState('');
  // Group search (§20): name + category + privacy — 3 user-set parameters
  const [sName, setSName] = useState('');
  const [sCategory, setSCategory] = useState('');
  const [sPrivacy, setSPrivacy] = useState('');
  const [searched, setSearched] = useState(false);
  // Create-group form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  async function loadGroups() {
    try {
      const data = await api('GET', '/api/groups');
      setGroups(data);
    } catch (err) {
      setMsg(ajaxError(err, 'Could not load groups.'));
      setGroups([]);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setMsg('');
    if (!name.trim()) {
      setMsg('Group name is required.');
      return;
    }
    try {
      await api('POST', '/api/groups', {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        isPrivate,
      });
      setName('');
      setDescription('');
      setCategory('');
      setIsPrivate(false);
      loadGroups();
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  async function handleGroupSearch(e) {
    e.preventDefault();
    setMsg('');
    const params = new URLSearchParams();
    if (sName.trim()) params.append('name', sName.trim());
    if (sCategory.trim()) params.append('category', sCategory.trim());
    if (sPrivacy) params.append('privacy', sPrivacy);
    try {
      setGroups(await api('GET', '/api/groups/search?' + params.toString()));
      setSearched(true);
    } catch (err) {
      setMsg(ajaxError(err, 'Search failed.'));
    }
  }

  function handleResetSearch() {
    setSName('');
    setSCategory('');
    setSPrivacy('');
    setSearched(false);
    loadGroups();
  }

  async function handleJoin(groupId) {
    try {
      await api('POST', `/api/groups/${groupId}/join`);
      loadGroups();
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  async function handleLeave(groupId) {
    try {
      await api('POST', `/api/groups/${groupId}/leave`);
      loadGroups();
    } catch (err) {
      setMsg(ajaxError(err));
    }
  }

  const myId = me && me._id;
  const shown = groups || [];

  return (
    <main className="content">
      {/* Create */}
      <div className="card">
        <h3>Create a group</h3>
        <form onSubmit={handleCreate}>
          <div className="row">
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="row">
            <input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              Private
            </label>
            <button className="btn primary">Create</button>
          </div>
        </form>
        <div className="msg">{msg}</div>
      </div>

      {/* Group search (§20): 3 parameters, server-side */}
      <div className="card">
        <form className="row" onSubmit={handleGroupSearch}>
          <input
            placeholder="Name"
            value={sName}
            onChange={(e) => setSName(e.target.value)}
          />
          <input
            placeholder="Category"
            value={sCategory}
            onChange={(e) => setSCategory(e.target.value)}
          />
          <select value={sPrivacy} onChange={(e) => setSPrivacy(e.target.value)}>
            <option value="">Public + private</option>
            <option value="public">Public only</option>
            <option value="private">Private only</option>
          </select>
          <button className="btn primary">Search</button>
          {searched && (
            <button type="button" className="btn ghost" onClick={handleResetSearch}>
              Reset
            </button>
          )}
        </form>
      </div>

      {groups === null && <div className="loading">Loading groups…</div>}
      <div className="masonry">
        {shown.map((g) => {
          const member = (g.members || []).some((m) => String(m._id || m) === String(myId));
          const admin = (g.admins || []).some((a) => String(a._id || a) === String(myId));
          return (
            <div className="card" key={g._id}>
              <div className="post-head">
                <strong
                  className="clickable"
                  onClick={() => navigate(`/groups/${g._id}`)}
                >
                  {g.name}
                </strong>
                {g.isPrivate && <span className="chip lock">Private</span>}
                {g.category && <span className="chip">{g.category}</span>}
              </div>
              <p className="muted">{g.description}</p>
              <div className="row">
                <span className="muted">{(g.members || []).length} members</span>
                <div className="spacer" />
                {admin && <span className="chip">Admin</span>}
                {!member && (
                  <button className="btn primary" onClick={() => handleJoin(g._id)}>
                    {g.isPrivate ? 'Request to join' : 'Join'}
                  </button>
                )}
                {member && !admin && (
                  <button className="btn ghost" onClick={() => handleLeave(g._id)}>
                    Leave
                  </button>
                )}
                <button className="btn ghost" onClick={() => navigate(`/groups/${g._id}`)}>
                  Open →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default Groups;
