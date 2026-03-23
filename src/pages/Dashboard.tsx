import { Package, ArrowRightLeft, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/ui/status-badge";
import { useInventory } from "@/hooks/useInventory";
import { useTransactions } from "@/hooks/useTransactions";

export default function Dashboard() {
  const { items, loading: itemsLoading } = useInventory();
  const { transactions, loading: txLoading } = useTransactions();

  if (itemsLoading || txLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalItems = items.length;
  const lowStock = items.filter((i) => i.stock_available / i.stock_total < 0.3).length;
  const pendingTx = transactions.filter((t) => t.status === "pending").length;
  const overdueTx = transactions.filter((t) => t.status === "overdue").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">College of Health and Sciences — Laboratory Inventory</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Items" value={totalItems} subtitle="Across all locations" icon={Package} variant="primary" delay={0} />
        <StatCard title="Active Borrows" value={transactions.filter((t) => t.status === "approved").length} icon={ArrowRightLeft} delay={60} />
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
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">Transaction</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tx.type}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {new Date(tx.borrow_date).toLocaleDateString()}
                  </span>
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
            {items
              .filter((i) => i.stock_available / i.stock_total < 0.5)
              .slice(0, 6)
              .map((item) => {
                const pct = Math.round((item.stock_available / item.stock_total) * 100);
                return (
                  <div key={item.id} className="px-5 py-3.5">
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <span className="text-xs tabular-nums text-muted-foreground">{item.stock_available}/{item.stock_total}</span>
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
