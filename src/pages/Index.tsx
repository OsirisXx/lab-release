import { Navigate } from "react-router-dom";

export default function Index() {
  // For now, redirect to dashboard. Auth will gate this later.
  return <Navigate to="/dashboard" replace />;
}
