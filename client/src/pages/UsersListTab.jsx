import { useState, useEffect } from 'react';
import api from '../api/client';
import UserEditorModal from '../components/UserEditorModal';

export default function UsersListTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      setError('Failed to load users: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(user) {
    setEditingUser(user);
    setShowModal(true);
  }

  function handleCreate() {
    setEditingUser(null);
    setShowModal(true);
  }

  if (error) return <div style={{ color: 'var(--down)', padding: 20 }}>{error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Team Members</h2>
        <button className="primary-btn" onClick={handleCreate}>+ Add User</button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading users...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}></th>
                <th>Name / Email</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Permissions Count</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const displayName = u.name || u.username;
                const initials = displayName.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
                
                return (
                  <tr key={u.id}>
                    <td>
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ 
                          width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--light-gray)', 
                          color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontWeight: 600, fontSize: 13 
                        }}>
                          {initials}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{u.name || '-'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email || '-'}</div>
                    </td>
                    <td>{u.username}</td>
                    <td>
                      <span className="status-badge" style={{ background: u.role === 'owner' ? 'rgba(37,99,235,0.1)' : 'var(--light-gray)', color: u.role === 'owner' ? '#2563eb' : 'var(--text-muted)' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${u.status === 'active' ? 'active' : 'draft'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {u.role === 'owner' ? 'Full Access' : (u.permissions?.length || 0)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="action-btn" onClick={() => handleEdit(u)}>Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <UserEditorModal 
          user={editingUser} 
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
