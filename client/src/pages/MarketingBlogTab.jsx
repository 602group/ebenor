import { useState, useEffect } from 'react';
import api from '../api/client';

export default function MarketingBlogTab() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = grid view, {} = new post, {id,...} = edit post

  async function load() {
    setLoading(true);
    const r = await api.get('/marketing/blog');
    setPosts(r.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deletePost(id) {
    if (!confirm('Permanently delete this blog post?')) return;
    await api.delete(`/marketing/blog/${id}`);
    setPosts(p => p.filter(x => x.id !== id));
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;

  if (editing) {
    return <BlogEditor post={editing} onClose={() => { setEditing(null); load(); }} />;
  }

  return (
    <div>
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
          {posts.length} Total Posts
        </div>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setEditing({})}>
          + New Blog Post
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          {posts.length ? (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>/{p.slug}</div>
                    </td>
                    <td>
                      <span className={`badge ${p.status === 'Published' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {new Date(p.updated_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" style={{ marginRight: 8, padding: '4px 8px' }} onClick={() => setEditing(p)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', padding: '4px 8px' }} onClick={() => deletePost(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <div className="empty-title">No blog posts yet</div>
              <div className="empty-desc">Create your first piece of thought leadership for the Ebenor Global website.</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setEditing({})}>Write Post</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EDITOR COMPONENT ────────────────────────────────────────────────────────

function BlogEditor({ post, onClose }) {
  const isNew = !post.id;
  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    status: 'Draft',
    ...post
  });
  
  const [saving, setSaving] = useState(false);

  // Auto-generate slug on title change if new
  const handleTitle = (e) => {
    const title = e.target.value;
    if (isNew && !form.id) {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setForm(f => ({ ...f, title, slug }));
    } else {
      setForm(f => ({ ...f, title }));
    }
  };

  async function save() {
    if (!form.title || !form.slug) return alert('Title and Slug are required');
    setSaving(true);
    try {
      if (isNew) {
        await api.post('/marketing/blog', form);
      } else {
        await api.patch(`/marketing/blog/${post.id}`, form);
      }
      onClose();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to save');
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ animation: 'var(--animate-fade)' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ pointerEvents: saving ? 'none' : 'auto' }}>←</button>
          {isNew ? 'Create Blog Post' : 'Edit Blog Post'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select 
            value={form.status} 
            onChange={e => setForm(f => ({...f, status: e.target.value}))}
            className="form-input"
            style={{ width: 120, height: 32, padding: '0 8px' }}
            disabled={saving}
          >
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Post'}
          </button>
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Post Title</label>
            <input 
              className="form-input" 
              placeholder="e.g. Market Microstructure in 2026"
              value={form.title}
              onChange={handleTitle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">URL Slug</label>
            <input 
              className="form-input" 
              placeholder="e.g. market-microstructure-2026"
              value={form.slug}
              onChange={e => setForm(f => ({...f, slug: e.target.value}))}
            />
          </div>
        </div>

        <div>
          <label className="form-label">Short Excerpt (used on grid cards)</label>
          <textarea 
            className="form-input" 
            style={{ height: 80, resize: 'vertical' }}
            placeholder="A brief 1-2 sentence summary of the article..."
            value={form.excerpt}
            onChange={e => setForm(f => ({...f, excerpt: e.target.value}))}
          />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label className="form-label">Article HTML Content</label>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            Supports raw HTML (p, h2, h3, ul, li). Classes will be styled automatically by the Ebenor Global frontend.
          </div>
          
          <div style={{ display: 'flex', gap: 20 }}>
            {/* Editor half */}
            <textarea 
              className="form-input" 
              style={{ flex: 1, height: 500, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5 }}
              placeholder="<p>Write your article here...</p>"
              value={form.content}
              onChange={e => setForm(f => ({...f, content: e.target.value}))}
            />
            
            {/* Live Preview Half (Basic mapping) */}
            <div style={{ 
              flex: 1, 
              height: 500, 
              overflowY: 'auto', 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: 24,
              color: 'var(--text-primary)'
            }}>
              <div className="form-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 16 }}>Live Preview</div>
              <h1 style={{ fontSize: 28, marginBottom: 16 }}>{form.title || 'Post Title'}</h1>
              <div dangerouslySetInnerHTML={{ __html: form.content || '<p style="color:var(--text-muted)">Preview will appear here...</p>' }} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
