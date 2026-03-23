import { useState } from "react";
import { Search, Filter, Check, X, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Transactions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { transactions, loading, approveTransaction, rejectTransaction, returnItem } = useTransactions();
  const { user } = useAuth();

  const handleApprove = async (id: string) => {
    try {
      await approveTransaction(id);
      toast.success("Transaction approved");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectTransaction(id);
      toast.success("Transaction rejected");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReturn = async (id: string) => {
    try {
      await returnItem(id);
      toast.success("Item returned successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to return item");
    }
  };

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.inventory_items?.name.toLowerCase().includes(search.toLowerCase()) ||
      tx.user_profiles?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-muted-foreground mt-1">Manage borrow and return requests</p>
      </div>

      <div className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by item or user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {["all", "pending", "approved", "returned", "overdue"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden animate-slide-up" style={{ animationDelay: "120ms", animationFillMode: "both" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Transaction</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">User</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Borrow Date</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Due Date</th>
              <th className="text-center px-5 py-3 font-medium text-muted-foreground">Qty</th>
              <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((tx) => (
              <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-medium">{tx.inventory_items?.name}</p>
                  <p className="text-xs text-muted-foreground">{tx.id.slice(0, 8)}</p>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">{tx.user_profiles?.name}</td>
                <td className="px-5 py-3.5">
                  <span className="capitalize text-xs font-medium px-2 py-1 rounded-md bg-secondary">{tx.type}</span>
                </td>
                <td className="px-5 py-3.5 tabular-nums text-muted-foreground">{tx.borrow_date}</td>
                <td className="px-5 py-3.5 tabular-nums text-muted-foreground">{tx.due_date}</td>
                <td className="px-5 py-3.5 text-center tabular-nums">{tx.quantity}</td>
                <td className="px-5 py-3.5 text-center">
                  <StatusBadge status={tx.status} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  {tx.status === "pending" && user?.role === "sa" && (
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success hover:text-success hover:bg-success/10" onClick={() => handleApprove(tx.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleReject(tx.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {tx.status === "approved" && user?.role === "sa" && (
                    <Button size="sm" variant="outline" onClick={() => handleReturn(tx.id)}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Return
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
