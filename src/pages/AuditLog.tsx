import { useState } from "react";
import { Search, Filter, ClipboardList, Package, ArrowRightLeft, Users, Settings, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuditLogs } from "@/hooks/useAuditLogs";

export default function AuditLog() {
  const { logs, loading } = useAuditLogs();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = logs.filter((log) => {
    const matchesSearch = 
      log.details?.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "inventory":
        return Package;
      case "transaction":
        return ArrowRightLeft;
      case "user":
        return Users;
      case "system":
        return Settings;
      default:
        return ClipboardList;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "inventory":
        return "text-primary bg-primary/10";
      case "transaction":
        return "text-success bg-success/10";
      case "user":
        return "text-warning bg-warning/10";
      case "system":
        return "text-secondary-foreground bg-secondary";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground mt-1">Complete activity history and system events</p>
      </div>

      <div className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search actions, users, or details..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {["all", "inventory", "transaction", "user", "system"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                categoryFilter === cat ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden animate-slide-up" style={{ animationDelay: "120ms", animationFillMode: "both" }}>
        <div className="p-5 border-b bg-muted/50">
          <h2 className="font-semibold">Activity Timeline</h2>
          <p className="text-xs text-muted-foreground mt-1">{filtered.length} events</p>
        </div>
        <div className="divide-y max-h-[700px] overflow-y-auto">
          {filtered.map((log) => {
            const Icon = getCategoryIcon(log.category);
            return (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{log.action}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                      {log.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.details || "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">System</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardList className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">No audit logs found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
