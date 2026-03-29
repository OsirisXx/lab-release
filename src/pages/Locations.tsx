import { useState } from "react";
import { MapPin, Plus, Edit2, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventory } from "@/hooks/useInventory";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";

export default function Locations() {
  const { items, loading, updateItem } = useInventory();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    maintaining_stock: 0,
    stock_available: 0,
    condition: "Good" as "Good" | "Defective" | "Mixed",
  });

  // Group items by location
  const groupedByLocation = items.reduce((acc, item) => {
    const location = item.location || "Unassigned";
    if (!acc[location]) {
      acc[location] = [];
    }
    acc[location].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const locations = Object.keys(groupedByLocation).sort();

  const handleEdit = (item: typeof items[0]) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      maintaining_stock: item.maintaining_stock,
      stock_available: item.stock_available,
      condition: item.condition as any,
    });
  };

  const handleSave = async (itemId: string) => {
    try {
      await updateItem(itemId, editForm);
      toast.success("Item updated successfully");
      setEditingId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update item");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Room Clusters & Locations</h1>
        <p className="text-muted-foreground mt-1">Manage inventory by location - {locations.length} locations</p>
      </div>

      <div className="space-y-6">
        {locations.map((location, idx) => {
          const locationItems = groupedByLocation[location];
          const totalItems = locationItems.length;
          const totalStock = locationItems.reduce((sum, item) => sum + item.maintaining_stock, 0);
          const availableStock = locationItems.reduce((sum, item) => sum + item.stock_available, 0);

          return (
            <div
              key={location}
              className="bg-card rounded-lg border overflow-hidden animate-slide-up"
              style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "both" }}
            >
              {/* Location Header */}
              <div className="bg-muted/50 px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{location}</h3>
                      <p className="text-sm text-muted-foreground">
                        {totalItems} items · {availableStock}/{totalStock} available
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Item Code</th>
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Item Name</th>
                      <th className="text-center px-6 py-3 font-medium text-muted-foreground">Total Stock</th>
                      <th className="text-center px-6 py-3 font-medium text-muted-foreground">On Hand</th>
                      <th className="text-center px-6 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {locationItems.map((item) => {
                      const isEditing = editingId === item.id;

                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs text-muted-foreground">{item.id.slice(0, 8)}</span>
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="h-8"
                              />
                            ) : (
                              <p className="font-medium">{item.name}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editForm.maintaining_stock}
                                onChange={(e) => setEditForm({ ...editForm, maintaining_stock: parseInt(e.target.value) || 0 })}
                                className="h-8 w-20 mx-auto text-center"
                              />
                            ) : (
                              <span className="tabular-nums font-medium">{item.maintaining_stock}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editForm.stock_available}
                                onChange={(e) => setEditForm({ ...editForm, stock_available: parseInt(e.target.value) || 0 })}
                                className="h-8 w-20 mx-auto text-center"
                              />
                            ) : (
                              <span className="tabular-nums font-medium">{item.stock_available}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isEditing ? (
                              <select
                                value={editForm.condition}
                                onChange={(e) => setEditForm({ ...editForm, condition: e.target.value as any })}
                                className="h-8 px-2 rounded-md border bg-background text-sm"
                              >
                                <option value="Good">Good</option>
                                <option value="Mixed">Mixed</option>
                                <option value="Defective">Defective</option>
                              </select>
                            ) : (
                              <StatusBadge status={item.condition} />
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-success" onClick={() => handleSave(item.id)}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" onClick={handleCancel}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEdit(item)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
