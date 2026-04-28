import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface Transaction {
  id: string;
  user_id: string;
  item_id: string;
  type: "borrow" | "return" | "reserve";
  status: "pending" | "approved" | "returned" | "overdue" | "rejected";
  quantity: number;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  created_at: string;
  updated_at: string;
  user_profiles?: { name: string; email: string; ci_id: string | null };
  inventory_items?: { name: string; location: string };
}

export function isOverdue(transaction: { status: string; due_date: string }): boolean {
  if (transaction.status !== "approved") return false;
  const today = new Date().toISOString().split("T")[0];
  return transaction.due_date < today;
}

export function getEffectiveStatus(transaction: Transaction): string {
  return isOverdue(transaction) ? "overdue" : transaction.status;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchTransactions();

    const channel = supabase
      .channel("transaction_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchTransactions = async () => {
    try {
      let query = supabase
        .from("transactions")
        .select(`
          *,
          user_profiles (name, email, ci_id),
          inventory_items (name, location)
        `)
        .order("created_at", { ascending: false });

      if (user?.role === "ci") {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (err: any) {
      setError(err.message);
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

    const borrowDate = new Date().toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        item_id: itemId,
        type: "borrow",
        status: "pending",
        quantity,
        borrow_date: borrowDate,
        due_date: dueDate,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "Submitted Borrow Request",
      details: `Item ID: ${itemId}, Quantity: ${quantity}`,
      category: "transaction",
    });

    // Immediately refetch to update UI
    await fetchTransactions();

    return data;
  };

  const approveTransaction = async (transactionId: string) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can approve transactions");

    const { data, error } = await supabase
      .from("transactions")
      .update({ status: "approved" })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "Approved Borrow Request",
      details: `Transaction ID: ${transactionId}`,
      category: "transaction",
    });

    // Immediately refetch to update UI
    await fetchTransactions();

    return data;
  };

  const rejectTransaction = async (transactionId: string) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can reject transactions");

    const { data, error } = await supabase
      .from("transactions")
      .update({ status: "rejected" })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "Rejected Borrow Request",
      details: `Transaction ID: ${transactionId}`,
      category: "transaction",
    });

    // Immediately refetch to update UI
    await fetchTransactions();

    return data;
  };

  const returnItem = async (transactionId: string) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can process returns");

    const returnDate = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("transactions")
      .update({ status: "returned", return_date: returnDate })
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "Processed Item Return",
      details: `Transaction ID: ${transactionId}`,
      category: "transaction",
    });

    // Immediately refetch to update UI
    await fetchTransactions();

    return data;
  };

  return {
    transactions,
    loading,
    error,
    createBorrowRequest,
    approveTransaction,
    rejectTransaction,
    returnItem,
    refetch: fetchTransactions,
  };
}
