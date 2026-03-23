import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface Reservation {
  id: string;
  user_id: string;
  item_id: string;
  start_date: string;
  end_date: string;
  status: "pending" | "approved" | "rejected" | "completed";
  quantity: number;
  created_at: string;
  user_profiles?: { name: string; email: string; ci_id: string | null };
  inventory_items?: { name: string; location: string };
}

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchReservations();

    const channel = supabase
      .channel("reservation_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => {
        fetchReservations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchReservations = async () => {
    try {
      let query = supabase
        .from("reservations")
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
      setReservations(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createReservation = async (itemId: string, startDate: string, endDate: string, quantity: number) => {
    if (!user) throw new Error("Must be logged in");

    const { data, error } = await supabase
      .from("reservations")
      .insert({
        user_id: user.id,
        item_id: itemId,
        start_date: startDate,
        end_date: endDate,
        quantity,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "Created Reservation",
      details: `Item ID: ${itemId}, Dates: ${startDate} to ${endDate}`,
      category: "transaction",
    });

    // Immediately refetch to update UI
    await fetchReservations();

    return data;
  };

  const approveReservation = async (reservationId: string) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can approve reservations");

    const { data, error } = await supabase
      .from("reservations")
      .update({ status: "approved" })
      .eq("id", reservationId)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "Approved Reservation",
      details: `Reservation ID: ${reservationId}`,
      category: "transaction",
    });

    // Immediately refetch to update UI
    await fetchReservations();

    return data;
  };

  const rejectReservation = async (reservationId: string) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can reject reservations");

    const { data, error } = await supabase
      .from("reservations")
      .update({ status: "rejected" })
      .eq("id", reservationId)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "Rejected Reservation",
      details: `Reservation ID: ${reservationId}`,
      category: "transaction",
    });

    // Immediately refetch to update UI
    await fetchReservations();

    return data;
  };

  return {
    reservations,
    loading,
    error,
    createReservation,
    approveReservation,
    rejectReservation,
    refetch: fetchReservations,
  };
}
