import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const PERMISSION_GROUPS = [
  {
    title: 'Sectors',
    keys: [
      { id: 'real-estate', label: 'Real Estate' },
      { id: 'forex', label: 'Forex' },
      { id: 'stocks', label: 'Stocks' }
    ]
  },
  {
    title: 'Shared Systems',
    keys: [
      { id: 'news', label: 'Global News' },
      { id: 'knowledge', label: 'Research Library' },
      { id: 'strategies', label: 'Strategies' },
      { id: 'documents', label: 'Documents' },
      { id: 'contacts', label: 'Contacts' },
      { id: 'alerts', label: 'Alerts' },
      { id: 'events', label: 'Macro Calendar' }
    ]
  },
  {
    title: 'Operations',
    keys: [
      { id: 'portfolio', label: 'Portfolio' },
      { id: 'reports', label: 'Reports' },
      { id: 'activity', label: 'Activity Log' }
    ]
  },
  {
    title: 'Admin',
    keys: [
      { id: 'marketing', label: 'Marketing' },
      { id: 'users', label: 'Users' },
      { id: 'settings', label: 'Settings' }
    ]
  }
];

export default function UserEditorModal({ user, onClose, onSaved }) {
  const { user: currentUser } = useAuth();
  const isEditing = !!user;

  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    avatar_url: user?.avatar_url || '',
    role: user?.role || 'viewer',
    status: user?.status || 'active',
  });

  const [permissions, setPermissions] = useState(user?.permissions || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) return;
    const roleDefaults = {
      owner:      PERMISSION_GROUPS.flatMap(g => g.keys.map(k => k.id)),
      admin:      PERMISSION_GROUPS.flatMap(g => g.keys.map(k => k.id)),
      marketing:  ['news', 'marketing', 'documents'],
      analyst:    ['forex', 'stocks', 'portfolio', 'news', 'knowledge', 'strategies', 'events', 'activity', 'reports'],
      operations: ['portfolio', 'documents', 'contacts', 'alerts', 'events', 'reports', 'activity'],
      viewer:     ['news', 'knowledge'],
      custom:     [],
    };
    setPermissions(roleDefaults[formData.role] ?? []);
  }, [formData.role, isEditing]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = { ...formData, permissions };
      if (isEditing) {
        if (!payload.password) delete payload.password;
        await api.patch(`/users/${user.id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete "${user.username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  const togglePerm = (id) =>
    setPermissions(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const isOwner = formData.role === 'owner';

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">{isEditing ? 'Edit User' : 'Add New User'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {isEditing ? `Editing @${user?.username}` : 'Create a new backend team member with custom permissions'}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body — two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 0 }}>

          {/* Left: Profile fields */}
          <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 600 }}>Profile Details</div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#ef4444' }}>
                {error}
              </div>
            )}

            <label className="form-label">
              Full Name
              <input className="form-input" type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Jane Smith" />
            </label>

            <label className="form-label">
              Email Address
              <input className="form-input" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jane@company.com" />
            </label>

            <label className="form-label">
              Username <span style={{ color: '#ef4444' }}>*</span>
              <input className="form-input" type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            </label>

            <label className="form-label">
              Password{isEditing && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>(leave blank to keep)</span>}{!isEditing && <span style={{ color: '#ef4444' }}> *</span>}
              <input className="form-input" type="password" required={!isEditing} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </label>

            <label className="form-label">
              Avatar URL <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
              <input className="form-input" type="url" value={formData.avatar_url} onChange={e => setFormData({...formData, avatar_url: e.target.value})} placeholder="https://..." />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="form-label">
                Role
                <select className="form-select" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="marketing">Marketing</option>
                  <option value="analyst">Analyst</option>
                  <option value="operations">Operations</option>
                  <option value="viewer">Viewer</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <label className="form-label">
                Status
                <select className="form-select" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
          </div>

          {/* Right: Permissions */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', maxHeight: '60vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 600 }}>Access Permissions</div>
              {isOwner && <span style={{ fontSize: 11, background: 'rgba(99,102,241,0.12)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>Full access</span>}
            </div>

            <div style={{ opacity: isOwner ? 0.5 : 1, pointerEvents: isOwner ? 'none' : 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {PERMISSION_GROUPS.map(group => (
                <div key={group.title}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
                    {group.title}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                    {group.keys.map(perm => {
                      const checked = isOwner || permissions.includes(perm.id);
                      return (
                        <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }}
                            checked={checked}
                            onChange={() => togglePerm(perm.id)}
                          />
                          {perm.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div>
            {isEditing && currentUser?.id !== user?.id && (
              <button
                type="button"
                className="action-btn"
                style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                onClick={handleDelete}
              >
                Delete User
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="action-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="primary-btn" disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
