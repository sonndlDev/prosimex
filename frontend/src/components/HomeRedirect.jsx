import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessPage } from "../constants/permissions";

const FALLBACK_ROUTES = [
  { path: "/", permission: "dashboard:read" },
  { path: "/orders", permission: "orders:read" },
  { path: "/daily-tickets", permission: "daily_tickets:read" },
  { path: "/planning", permission: "planning:read" },
  { path: "/factories", permission: "factories:read" },
  { path: "/users", permission: "users:read" },
];

export default function HomeRedirect() {
  const { user, authReady } = useAuth();

  if (!authReady) return null;

  const target = FALLBACK_ROUTES.find((r) => canAccessPage(user, r.permission))?.path;
  if (target) return <Navigate to={target} replace />;
  return <Navigate to="/unauthorized" replace />;
}
