import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details: string;
  category: "inventory" | "transaction" | "user" | "system";
  created_at: string;
  user_profiles?: { name: string };
}

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel("audit_log_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_logs" }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*, user_profiles(name)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { logs, loading, error, refetch: fetchLogs };
}
