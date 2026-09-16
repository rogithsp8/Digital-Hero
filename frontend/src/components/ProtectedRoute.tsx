import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  role?: string;
  requireSub?: boolean;
}

export default function ProtectedRoute({ children, role, requireSub }: Props) {
  const { user, subscription, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  if (requireSub && subscription?.status !== 'active') return <Navigate to="/subscribe" replace />;

  return <>{children}</>;
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
  );
}
