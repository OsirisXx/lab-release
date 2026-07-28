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

const getLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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
  }, []);

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

    const today = getLocalDate();
    const timeNow = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

    const { data: existingRecord, error: existingRecordError } = await supabase
      .from("attendance")
      .select("id, time_out")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (existingRecordError) throw existingRecordError;
    if (existingRecord) {
      throw new Error(existingRecord.time_out ? "Attendance is already complete for today" : "You are already clocked in today");
    }

    const { data, error } = await supabase
      .from("attendance")
      .insert({
        user_id: user.id,
        date: today,
        time_in: timeNow,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Attendance is already recorded for today");
      }
      throw error;
    }

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

    await fetchAttendance();
    return data;
  };

  return { attendance, loading, error, clockIn, clockOut, refetch: fetchAttendance };
}
