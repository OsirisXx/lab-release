import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface InventoryItem {
  id: string;
  item_code?: string;
  name: string;
  category: "consumable" | "non-consumable";
  unit: string;
  maintaining_stock: number;
  stock_available: number;
  condition: "Good" | "Defective" | "Mixed" | "Expired";
  location: string;
  image_url?: string;
  expiration_date?: string;
  last_restock_date?: string;
  created_at: string;
  updated_at: string;
}

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel("inventory_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name");

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: Omit<InventoryItem, "id" | "created_at" | "updated_at">) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can add items");

    const { data, error } = await supabase
      .from("inventory_items")
      .insert(item)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "Added Inventory Item",
      details: `New item: ${item.name} (Qty: ${item.maintaining_stock})`,
      category: "inventory",
    });

    // Immediately refetch to update UI
    await fetchItems();

    return data;
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can update items");

    const { data, error } = await supabase
      .from("inventory_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "Updated Inventory",
      details: `Updated item: ${data.name}`,
      category: "inventory",
    });

    // Immediately refetch to update UI
    await fetchItems();

    return data;
  };

  const deleteItem = async (id: string) => {
    if (user?.role !== "sa") throw new Error("Only Student Assistants can delete items");

    const item = items.find((i) => i.id === id);
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);

    if (error) throw error;

    if (item) {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "Deleted Inventory Item",
        details: `Deleted: ${item.name}`,
        category: "inventory",
      });
    }

    // Immediately refetch to update UI
    await fetchItems();
  };

  return { items, loading, error, addItem, updateItem, deleteItem, refetch: fetchItems };
}
