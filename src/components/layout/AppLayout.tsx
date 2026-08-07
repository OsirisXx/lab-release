import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if ((location.pathname === "/reservations" || location.pathname === "/attendance") && user.role !== "sa") {
    return <Navigate to="/transactions" replace />;
  }

  const isDataListPage = location.pathname === "/inventory" || location.pathname === "/transactions";

  return (
    <div className={isDataListPage ? "h-screen overflow-hidden bg-background" : "min-h-screen bg-background"}>
      <AppSidebar />
      <main className={isDataListPage ? "ml-60 h-screen overflow-hidden" : "ml-60 min-h-screen"}>
        <div className={isDataListPage ? "h-full min-h-0 overflow-hidden p-8" : "p-8"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
