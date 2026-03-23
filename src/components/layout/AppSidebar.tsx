import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  CalendarClock,
  Users,
  ClipboardList,
  BarChart3,
  BookOpen,
  Clock,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  LogOut,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", roles: ["sa", "ci"] },
  { label: "Inventory", icon: Package, path: "/inventory", roles: ["sa", "ci"] },
  { label: "Transactions", icon: ArrowRightLeft, path: "/transactions", roles: ["sa", "ci"] },
  { label: "Reservations", icon: CalendarClock, path: "/reservations", roles: ["sa", "ci"] },
  { label: "Users", icon: Users, path: "/users", roles: ["sa"] },
  { label: "Attendance", icon: Clock, path: "/attendance", roles: ["sa"] },
  { label: "Reports", icon: BarChart3, path: "/reports", roles: ["sa"] },
  { label: "Audit Log", icon: ClipboardList, path: "/audit-log", roles: ["sa"] },
  { label: "RLE Guide", icon: BookOpen, path: "/rle-guide", roles: ["sa", "ci"] },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  
  if (!user) return null;
  
  const filteredNav = navItems.filter((n) => n.roles.includes(user.role));

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border">
        {!collapsed && (
          <>
            <img src="/logo/schoollogo.png" alt="School Logo" className="h-9 w-9 object-contain" />
            <div className="flex-1 animate-fade-in">
              <h1 className="font-bold text-sidebar-foreground text-sm">LabTrack</h1>
              <p className="text-xs text-sidebar-foreground/50">CHS Inventory</p>
            </div>
            <img src="/logo/departmentlogo.png" alt="Department Logo" className="h-9 w-9 object-contain" />
          </>
        )}
        {collapsed && (
          <img src="/logo/schoollogo.png" alt="School Logo" className="h-9 w-9 object-contain mx-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && <span className="animate-fade-in">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User / Collapse */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="px-2 mb-3 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                {user.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/50 truncate">
                  {user.role === "sa" ? "Student Assistant" : user.ciId || "Clinical Instructor"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start h-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full h-8 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
