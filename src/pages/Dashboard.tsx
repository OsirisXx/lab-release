import { Package, ArrowRightLeft, AlertTriangle, Users, Clock, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/ui/status-badge";
import { mockItems, mockTransactions } from "@/lib/mock-data";

export default function Dashboard() {
  const totalItems = mockItems.length;
  const lowStock = mockItems.filter((i) => i.stockAvailable / i.stockTotal < 0.3).length;
  const pendingTx = mockTransactions.filter((t) => t.status === "pending").length;
  const overdueTx = mockTransactions.filter((t) => t.status === "overdue").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">College of Health and Sciences — Laboratory Inventory</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Items" value={totalItems} subtitle="Across all locations" icon={Package} variant="primary" delay={0} />
        <StatCard title="Active Borrows" value={mockTransactions.filter((t) => t.status === "approved").length} icon={ArrowRightLeft} delay={60} />
        <StatCard title="Pending Requests" value={pendingTx} icon={Clock} variant="warning" delay={120} />
        <StatCard title="Overdue Items" value={overdueTx} icon={AlertTriangle} variant="destructive" delay={180} />
      </div>

      {/* Recent Transactions + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-card rounded-lg border animate-slide-up" style={{ animationDelay: "250ms", animationFillMode: "both" }}>
          <div className="p-5 border-b">
            <h2 className="font-semibold">Recent Transactions</h2>
          </div>
          <div className="divide-y">
            {mockTransactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{tx.itemName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tx.userName} · {tx.type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground tabular-nums">{tx.borrowDate}</span>
                  <StatusBadge status={tx.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-card rounded-lg border animate-slide-up" style={{ animationDelay: "320ms", animationFillMode: "both" }}>
          <div className="p-5 border-b">
            <h2 className="font-semibold">Low Stock Items</h2>
          </div>
          <div className="divide-y">
            {mockItems
              .filter((i) => i.stockAvailable / i.stockTotal < 0.5)
              .slice(0, 6)
              .map((item) => {
                const pct = Math.round((item.stockAvailable / item.stockTotal) * 100);
                return (
                  <div key={item.id} className="px-5 py-3.5">
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <span className="text-xs tabular-nums text-muted-foreground">{item.stockAvailable}/{item.stockTotal}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct < 30 ? "bg-destructive" : pct < 50 ? "bg-warning" : "bg-success"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
