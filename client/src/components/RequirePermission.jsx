import { useAuth } from '../context/AuthContext';

export default function RequirePermission({ module, children, fallback = null }) {
  const { hasPermission } = useAuth();
  if (hasPermission(module)) return children;
  return fallback;
}
