import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "ci" | "sa";
  ci_id: string | null;
  created_at: string;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [clinicalInstructors, setClinicalInstructors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role !== "sa") {
      setLoading(false);
      return;
    }

    fetchUsers();
    fetchClinicalInstructors();

    const channel = supabase
      .channel("user_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_profiles" }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClinicalInstructors = async () => {
    const { data, error } = await supabase.rpc("list_registered_ci_profiles");
    if (error) {
      setClinicalInstructors([]);
      return;
    }
    setClinicalInstructors((data || []) as User[]);
  };

  const deleteUser = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    if (userId === user.id) throw new Error("You cannot delete your own account");

    const { error: deleteError } = await supabase.rpc('delete_user', {
      user_id_to_delete: userId,
      requesting_user_id: user.id
    });

    if (deleteError) throw deleteError;
    
    await fetchUsers();
  };

  return { users, clinicalInstructors, loading, error, refetch: fetchUsers, deleteUser };
}
