import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { addCalendarDays, getApplicationDate } from "@/lib/date-utils";

export interface Reservation {
  id: string;
  user_id: string;
  created_by: string;
  item_id: string;
  start_date: string;
  end_date: string;
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled" | "expired" | "failed";
  quantity: number;
  stock_held_quantity: number;
  issued_transaction_id: string | null;
  issued_at: string | null;
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
      setError(null);
      // SA sessions can process reservations immediately; the Vercel cron is
      // the background fallback when nobody is viewing the app.
      if (user?.role === "sa") {
        await supabase.rpc("process_due_reservations");
      }

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  };

  const createReservation = async (
    itemId: string,
    startDate: string,
    endDate: string,
    quantity: number,
    borrowerId: string,
  ) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can create reservations");

    const minimumDate = addCalendarDays(getApplicationDate(), 2);
    if (startDate < minimumDate) {
      throw new Error(`Reservations must start on or after ${minimumDate} (at least 2 calendar days from today)`);
    }
    if (endDate < startDate) {
      throw new Error("Reservation end date cannot be before the start date");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Reservation quantity must be greater than zero");
    }

    const { data, error } = await supabase.rpc("create_reservation", {
      p_item_id: itemId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_quantity: quantity,
      p_borrower_id: borrowerId,
    });

    if (error) throw error;
    await fetchReservations();
    return data as Reservation;
  };

  const approveReservation = async (reservationId: string) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can approve reservations");

    const { data, error } = await supabase.rpc("approve_reservation", {
      p_reservation_id: reservationId,
    });
    if (error) throw error;

    await fetchReservations();
    return data as Reservation;
  };

  const rejectReservation = async (reservationId: string) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can reject reservations");

    const { data, error } = await supabase.rpc("reject_reservation", {
      p_reservation_id: reservationId,
    });
    if (error) throw error;

    await fetchReservations();
    return data as Reservation;
  };

  const cancelReservation = async (reservationId: string) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can cancel reservations");

    const { data, error } = await supabase.rpc("cancel_reservation", {
      p_reservation_id: reservationId,
    });
    if (error) throw error;

    await fetchReservations();
    return data as Reservation;
  };

  return {
    reservations,
    loading,
    error,
    createReservation,
    approveReservation,
    rejectReservation,
    cancelReservation,
    refetch: fetchReservations,
  };
}
