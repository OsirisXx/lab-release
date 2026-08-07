import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getApplicationDate, getDueAtForDate } from "@/lib/date-utils";

export type ExtensionStatus = "pending" | "approved" | "rejected";

export interface StudentTagInput {
  name: string;
  student_number?: string;
}

export interface StudentTag {
  id: string;
  transaction_id: string;
  student_name: string;
  student_number: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  item_id: string;
  type: "borrow" | "return" | "reserve";
  status: "pending" | "approved" | "returned" | "overdue" | "rejected";
  quantity: number;
  borrow_date: string;
  due_date: string;
  due_at?: string | null;
  reservation_id?: string | null;
  stock_deducted?: boolean;
  return_date: string | null;
  created_at: string;
  updated_at: string;
  returned_by_student_tag_id?: string | null;
  transaction_student_tags?: StudentTag[];
  user_profiles?: { name: string; email: string; ci_id: string | null };
  inventory_items?: { name: string; location: string };
}

export interface ExtensionRequest {
  id: string;
  transaction_id: string;
  requested_by: string;
  reviewed_by: string | null;
  requested_days: 1;
  reason: string | null;
  status: ExtensionStatus;
  requested_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  previous_due_date: string | null;
  previous_due_at: string | null;
  approved_due_date: string | null;
  approved_due_at: string | null;
}

export function isOverdue(transaction: { status: string; due_date: string; due_at?: string | null }): boolean {
  if (transaction.status === "overdue") return true;
  if (transaction.status !== "approved") return false;

  const dueAt = transaction.due_at
    ? new Date(transaction.due_at)
    : getDueAtForDate(transaction.due_date);

  return dueAt.getTime() <= Date.now();
}

export function getEffectiveStatus(transaction: Transaction): string {
  return isOverdue(transaction) ? "overdue" : transaction.status;
}

export function isActiveBorrow(transaction: Transaction): boolean {
  const status = getEffectiveStatus(transaction);
  return status === "approved" || status === "overdue";
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [extensionRequests, setExtensionRequests] = useState<ExtensionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchTransactions();

    const refresh = () => fetchTransactions();
    const channel = supabase
      .channel("transaction_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "extension_requests" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "transaction_student_tags" }, refresh)
      .subscribe();
    const interval = window.setInterval(refresh, 60_000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchTransactions = async () => {
    try {
      setError(null);
      // Only SAs (or the server cron) may mutate overdue statuses. CI users
      // derive the effective overdue status client-side below and must not call
      // this SA-only RPC, otherwise Supabase returns HTTP 400 for the CI session.
      if (user?.role === "sa") {
        await supabase.rpc("mark_overdue_transactions");
      }

      let query = supabase
        .from("transactions")
        .select(`
          *,
          user_profiles (name, email, ci_id),
          inventory_items (name, location),
          transaction_student_tags!transaction_student_tags_transaction_id_fkey (*)
        `)
        .order("created_at", { ascending: false });

      if (user?.role === "ci") {
        query = query.eq("user_id", user.id);
      }

      let extensionQuery = supabase
        .from("extension_requests")
        .select("*")
        .order("requested_at", { ascending: false });
      if (user?.role === "ci") {
        extensionQuery = extensionQuery.eq("requested_by", user.id);
      }

      const [{ data, error: transactionError }, { data: extensionData, error: extensionError }] = await Promise.all([
        query,
        extensionQuery,
      ]);

      if (transactionError) throw transactionError;
      if (extensionError) throw extensionError;
      setTransactions(data || []);
      setExtensionRequests(extensionData || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load transactions";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const createBorrowRequest = async (itemId: string, quantity: number) => {
    if (!user) throw new Error("Must be logged in");

    const { data: hasUnreturned } = await supabase.rpc("has_unreturned_items", {
      p_user_id: user.id,
    });

    if (hasUnreturned) {
      throw new Error("Cannot borrow new items while you have unreturned items");
    }

    const borrowDate = getApplicationDate();

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        item_id: itemId,
        type: "borrow",
        status: "pending",
        quantity,
        borrow_date: borrowDate,
        // Feature 1 changes normal borrowing to same-day return by default.
        due_date: borrowDate,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "Submitted Borrow Request",
      details: `Item ID: ${itemId}, Quantity: ${quantity}, Due: ${borrowDate} 9:00 PM`,
      category: "transaction",
    });

    await fetchTransactions();
    return data;
  };

  const approveTransaction = async (transactionId: string, studentTags: StudentTagInput[]) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can approve transactions");
    const normalizedTags = studentTags.map((tag) => ({
      name: tag.name.trim(),
      student_number: tag.student_number?.trim() || null,
    }));
    if (normalizedTags.length < 1 || normalizedTags.length > 3 || normalizedTags.some((tag) => !tag.name)) {
      throw new Error("Tag between 1 and 3 accompanying students before approving");
    }

    const { data, error } = await supabase.rpc("approve_transaction", {
      p_transaction_id: transactionId,
      p_student_tags: normalizedTags,
    });
    if (error) throw error;

    await fetchTransactions();
    return data as Transaction;
  };

  const rejectTransaction = async (transactionId: string) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can reject transactions");

    const { data, error } = await supabase.rpc("reject_transaction", {
      p_transaction_id: transactionId,
    });
    if (error) throw error;

    await fetchTransactions();
    return data as Transaction;
  };

  const returnItem = async (transactionId: string, returningStudentTagId?: string) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can process returns");

    const { data, error } = await supabase.rpc("return_transaction", {
      p_transaction_id: transactionId,
      p_returning_student_tag_id: returningStudentTagId || null,
    });
    if (error) throw error;

    await fetchTransactions();
    return data as Transaction;
  };

  const requestExtension = async (transactionId: string, reason?: string) => {
    if (user?.role !== "ci") throw new Error("Only Clinical Instructors can request extensions");

    const { data, error } = await supabase.rpc("request_transaction_extension", {
      p_transaction_id: transactionId,
      p_reason: reason || null,
    });
    if (error) throw error;

    await fetchTransactions();
    return data as ExtensionRequest;
  };

  const reviewExtension = async (requestId: string, approve: boolean, reviewNote?: string) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can review extensions");

    const { data, error } = await supabase.rpc("review_transaction_extension", {
      p_request_id: requestId,
      p_approve: approve,
      p_review_note: reviewNote || null,
    });
    if (error) throw error;

    await fetchTransactions();
    return data as ExtensionRequest;
  };

  return {
    transactions,
    extensionRequests,
    loading,
    error,
    createBorrowRequest,
    approveTransaction,
    rejectTransaction,
    returnItem,
    requestExtension,
    reviewExtension,
    refetch: fetchTransactions,
  };
}
