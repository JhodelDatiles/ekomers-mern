import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoutes = ({ allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1. Wait for Auth to initialize (Prevents flickering)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // 2. Not logged in? Send to Storefront (Landing Page)
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 3. Logged in but wrong role? Send to Storefront
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  // 4. Authorized
  return <Outlet />;
};

export default ProtectedRoutes;