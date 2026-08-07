import { useState } from "react";
import { Check, X, Loader2, RotateCcw, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTransactions, getEffectiveStatus, isActiveBorrow } from "@/hooks/useTransactions";
import type { StudentTagInput, Transaction } from "@/hooks/useTransactions";
import { useReservations } from "@/hooks/useReservations";
import { formatDueDate } from "@/lib/date-utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { StudentTagsField } from "@/components/StudentTagsField";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Transactions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const {
    transactions,
    extensionRequests,
    loading,
    error: transactionError,
    approveTransaction,
    rejectTransaction,
    returnItem,
    requestExtension,
    reviewExtension,
  } = useTransactions();
  const { reservations, loading: reservationsLoading } = useReservations();
  const { user } = useAuth();
  const [approvalTransaction, setApprovalTransaction] = useState<Transaction | null>(null);
  const [approvalTags, setApprovalTags] = useState<StudentTagInput[]>([{ name: "", student_number: "" }]);
  const [returnTransaction, setReturnTransaction] = useState<Transaction | null>(null);
  const [returningStudentTagId, setReturningStudentTagId] = useState("");

  const handleApprove = (transaction: Transaction) => {
    setApprovalTransaction(transaction);
    setApprovalTags([{ name: "", student_number: "" }]);
  };

  const confirmApprove = async () => {
    if (!approvalTransaction) return;
    try {
      await approveTransaction(approvalTransaction.id, approvalTags);
      toast.success("Transaction approved and students tagged");
      setApprovalTransaction(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to approve transaction");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectTransaction(id);
      toast.success("Transaction rejected");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to reject transaction");
    }
  };

  const handleReturn = (transaction: Transaction) => {
    setReturnTransaction(transaction);
    setReturningStudentTagId(transaction.transaction_student_tags?.[0]?.id || "");
  };

  const confirmReturn = async () => {
    if (!returnTransaction) return;
    try {
      await returnItem(returnTransaction.id, returningStudentTagId);
      toast.success("Item returned successfully");
      setReturnTransaction(null);
      setReturningStudentTagId("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to return item");
    }
  };

  const handleRequestExtension = async (id: string) => {
    const reason = window.prompt("Optional reason for requesting one extra day:") ?? undefined;
    try {
      await requestExtension(id, reason);
      toast.success("One-day extension request submitted");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to request extension");
    }
  };

  const handleReviewExtension = async (id: string, approve: boolean) => {
    try {
      await reviewExtension(id, approve);
      toast.success(approve ? "Extension approved for one day" : "Extension request rejected");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to review extension");
    }
  };

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.inventory_items?.name.toLowerCase().includes(search.toLowerCase()) ||
      tx.user_profiles?.name.toLowerCase().includes(search.toLowerCase());
    const effectiveStatus = getEffectiveStatus(tx);
    const matchesStatus = statusFilter === "all" || effectiveStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredReservations = reservations.filter((reservation) => {
    const query = search.toLowerCase();
    return (
      reservation.inventory_items?.name.toLowerCase().includes(query) ||
      reservation.user_profiles?.name.toLowerCase().includes(query) ||
      reservation.user_profiles?.ci_id?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-muted-foreground mt-1">Manage borrow, return, overdue, and extension requests</p>
        {transactionError && (
          <p className="mt-2 text-sm text-destructive">
            Unable to load transactions: {transactionError}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        <div className="relative flex-1 max-w-sm">
          <Input placeholder="Search by item or user..." value={search} onChange={(e) => setSearch(e.target.value)} />
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

      <div className="bg-card rounded-lg border overflow-hidden animate-slide-up" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
        <div className="p-5 border-b">
          <h2 className="font-semibold">Reservation Schedule</h2>
          <p className="text-sm text-muted-foreground mt-1">Reserved equipment and the period it is needed</p>
        </div>
        {reservationsLoading ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">Loading reservations...</div>
        ) : filteredReservations.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">No reservations match the current search.</div>
        ) : (
          <div className="divide-y">
            {filteredReservations.map((reservation) => (
              <div key={reservation.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{reservation.inventory_items?.name || "Reserved item"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Borrower: {reservation.user_profiles?.name || "Registered CI"}
                    {reservation.user_profiles?.ci_id ? ` (${reservation.user_profiles.ci_id})` : ""}
                    {` · Qty: ${reservation.quantity}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Students: {reservation.reservation_student_tags?.map((tag) => tag.student_name).join(", ") || "Not tagged"}
                  </p>
                </div>
                <div className="text-sm text-right">
                  <p className="font-medium tabular-nums">{reservation.start_date} → {reservation.end_date}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {reservation.issued_transaction_id ? "Issued to Transactions" : `${reservation.status} · ${reservation.stock_held_quantity} held`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
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
              {filtered.map((tx) => {
                const transactionExtensions = extensionRequests.filter(
                  (request) => request.transaction_id === tx.id,
                );
                const pendingExtension = transactionExtensions.find(
                  (request) => request.status === "pending",
                );
                const canRequestExtension = user?.role === "ci" && isActiveBorrow(tx) && !pendingExtension;

                return (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{tx.inventory_items?.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Students: {tx.transaction_student_tags?.map((tag) => tag.student_name).join(", ") || "Not tagged"}
                      </p>
                      <p className="text-xs text-muted-foreground">{tx.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{tx.user_profiles?.name}</td>
                    <td className="px-5 py-3.5">
                      <span className="capitalize text-xs font-medium px-2 py-1 rounded-md bg-secondary">{tx.type}</span>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-muted-foreground">{tx.borrow_date}</td>
                    <td className="px-5 py-3.5 tabular-nums text-muted-foreground">
                      {formatDueDate(tx.due_date, tx.due_at)}
                    </td>
                    <td className="px-5 py-3.5 text-center tabular-nums">{tx.quantity}</td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={getEffectiveStatus(tx)} />
                      {transactionExtensions.map((request) => (
                        <p
                          key={request.id}
                          className={`text-[11px] mt-1 ${request.status === "pending" ? "text-warning" : "text-muted-foreground"}`}
                        >
                          Extension {request.status}
                          {request.approved_due_date
                            ? ` → ${formatDueDate(request.approved_due_date, request.approved_due_at)}`
                            : ""}
                        </p>
                      ))}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {tx.status === "pending" && user?.role === "sa" && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success" onClick={() => handleApprove(tx)} title="Approve">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleReject(tx.id)} title="Reject">
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {canRequestExtension && (
                          <Button size="sm" variant="outline" onClick={() => handleRequestExtension(tx.id)}>
                            <Clock3 className="h-4 w-4 mr-1" />
                            +1 day
                          </Button>
                        )}
                        {pendingExtension && user?.role === "sa" && (
                          <>
                            <Button size="sm" variant="outline" className="text-success" onClick={() => handleReviewExtension(pendingExtension.id, true)}>
                              Approve +1d
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleReviewExtension(pendingExtension.id, false)}>
                              Reject
                            </Button>
                          </>
                        )}
                        {isActiveBorrow(tx) && user?.role === "sa" && (
                          <Button size="sm" variant="outline" onClick={() => handleReturn(tx)}>
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Return
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={Boolean(approvalTransaction)} onOpenChange={(open) => !open && setApprovalTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tag Students Before Approval</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Tag the students accompanying {approvalTransaction?.user_profiles?.name || "the Clinical Instructor"}. At least one student is required.
            </p>
            <StudentTagsField tags={approvalTags} onChange={setApprovalTags} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalTransaction(null)}>Cancel</Button>
            <Button onClick={confirmApprove}>Approve Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(returnTransaction)} onOpenChange={(open) => !open && setReturnTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Return</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">Select the tagged student who returned the borrowed item.</p>
            <Label htmlFor="returning-student">Returning student</Label>
            <select
              id="returning-student"
              value={returningStudentTagId}
              onChange={(event) => setReturningStudentTagId(event.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background"
            >
              <option value="">{returnTransaction?.transaction_student_tags?.length ? "Select a tagged student..." : "No student tags recorded (legacy)"}</option>
              {returnTransaction?.transaction_student_tags?.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.student_name}{tag.student_number ? ` (${tag.student_number})` : ""}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTransaction(null)}>Cancel</Button>
            <Button onClick={confirmReturn}>Approve Return & Release Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
