import { useAuth } from '../context/AuthContext';

export default function TopNavUserBadge() {
  const { user } = useAuth();
  if (!user) return null;

  const displayName = user.name || user.username || 'U';
  
  // Deterministic fallback initials
  const initials = displayName
    .split(' ')
    .map(p => p.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Pick a stable fallback bg color based on the username
  const colors = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#db2777'];
  const charSum = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bgColor = colors[charSum % colors.length];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      position: 'absolute',
      top: '16px',
      right: '24px',
      zIndex: 100
    }}>
      <div className="d-desktop-only" style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-dark)' }}>
          {displayName}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
          {user.role}
        </div>
      </div>
      
      {user.avatar_url ? (
        <img 
          src={user.avatar_url} 
          alt={displayName}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid var(--border)'
          }}
        />
      ) : (
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: bgColor,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '600',
          fontSize: '15px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {initials}
        </div>
      )}
    </div>
  );
}
