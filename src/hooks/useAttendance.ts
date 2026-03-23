import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  time_in: string;
  time_out: string | null;
  created_at: string;
  user_profiles?: { name: string };
}

export function useAttendance() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchAttendance();

    const channel = supabase
      .channel("attendance_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => {
        fetchAttendance();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("*, user_profiles(name)")
        .order("date", { ascending: false })
        .order("time_in", { ascending: false });

      if (error) throw error;
      setAttendance(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clockIn = async () => {
    if (!user) throw new Error("Must be logged in");
    if (user.role !== "sa") throw new Error("Only Student Assistants can log attendance");

    const today = new Date().toISOString().split("T")[0];
    const timeNow = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

    const { data, error } = await supabase
      .from("attendance")
      .insert({
        user_id: user.id,
        date: today,
        time_in: timeNow,
      })
      .select()
      .single();

    if (error) throw error;

    // Immediately refetch to update UI
    await fetchAttendance();

    return data;
  };

  const clockOut = async (attendanceId: string) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can log attendance");

    const timeNow = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

    const { data, error } = await supabase
      .from("attendance")
      .update({ time_out: timeNow })
      .eq("id", attendanceId)
      .select()
      .single();

    if (error) throw error;

    // Immediately refetch to update UI
    await fetchAttendance();

    return data;
  };

  return { attendance, loading, error, clockIn, clockOut, refetch: fetchAttendance };
}
