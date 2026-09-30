import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-sm text-[var(--text-secondary)]">
        Checking your session...
      </div>
    );
  if (!isAuthenticated)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
