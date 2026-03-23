import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface RleGuide {
  id: string;
  year_level: "1st Year" | "2nd Year" | "3rd Year" | "4th Year";
  title: string;
  description: string;
  topics: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function useRleGuides() {
  const [guides, setGuides] = useState<RleGuide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuides();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("rle_guides_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rle_guides" },
        () => {
          fetchGuides();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGuides = async () => {
    try {
      const { data, error } = await supabase
        .from("rle_guides")
        .select("*")
        .order("year_level", { ascending: true });

      if (error) throw error;
      setGuides(data || []);
    } catch (error) {
      console.error("Error fetching guides:", error);
    } finally {
      setLoading(false);
    }
  };

  const createGuide = async (guide: Omit<RleGuide, "id" | "created_at" | "updated_at" | "created_by">) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("rle_guides")
      .insert([{ ...guide, created_by: user?.id }])
      .select()
      .single();

    if (error) throw error;

    // Immediately refetch to update UI
    await fetchGuides();

    return data;
  };

  const updateGuide = async (id: string, updates: Partial<RleGuide>) => {
    const { data, error } = await supabase
      .from("rle_guides")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Immediately refetch to update UI
    await fetchGuides();

    return data;
  };

  const deleteGuide = async (id: string) => {
    const { error } = await supabase
      .from("rle_guides")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // Immediately refetch to update UI
    await fetchGuides();
  };

  return {
    guides,
    loading,
    createGuide,
    updateGuide,
    deleteGuide,
  };
}
