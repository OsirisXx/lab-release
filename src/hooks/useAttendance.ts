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

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") fetchAttendance();
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    const channel = supabase
      .channel("attendance_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => {
        fetchAttendance();
      })
      .subscribe();

    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchAttendance = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from("attendance")
        .select("*, user_profiles(name)")
        .order("date", { ascending: false })
        .order("time_in", { ascending: false });

      if (error) throw error;
      setAttendance(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err && typeof err.message === "string"
          ? err.message
          : "Failed to load attendance records";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const clockIn = async () => {
    if (!user) throw new Error("Must be logged in");
    if (user.role !== "sa") throw new Error("Only Student Assistants can log attendance");

    const { data, error } = await supabase.rpc("clock_in_attendance");
    if (error) throw error;

    await fetchAttendance();
    return data as AttendanceRecord;
  };

  const clockOut = async (attendanceId: string) => {
    if (!user) throw new Error("Must be logged in");
    if (user.role !== "sa") throw new Error("Only Student Assistants can log attendance");

    const { data, error } = await supabase.rpc("clock_out_attendance", {
      p_attendance_id: attendanceId,
    });
    if (error) throw error;

    await fetchAttendance();
    return data as AttendanceRecord;
  };

  return { attendance, loading, error, clockIn, clockOut, refetch: fetchAttendance };
}
