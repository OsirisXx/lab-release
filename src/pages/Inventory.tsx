import { useState } from "react";
import { Search, Filter, Plus, Package, ShoppingCart, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventory } from "@/hooks/useInventory";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "consumable" | "non-consumable">("all");
  const { items, loading, addItem, updateItem, deleteItem } = useInventory();
  const { createBorrowRequest } = useTransactions();
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBorrowDialogOpen, setIsBorrowDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [borrowQuantity, setBorrowQuantity] = useState(1);
  const [editForm, setEditForm] = useState({
    item_code: "",
    name: "",
    category: "non-consumable" as "consumable" | "non-consumable",
    unit: "pc",
    maintaining_stock: 0,
    stock_available: 0,
    condition: "Good" as "Good" | "Defective" | "Mixed" | "Expired",
    location: "",
    image_url: "",
    expiration_date: "",
    last_restock_date: "",
  });
  const [addForm, setAddForm] = useState({
    item_code: "",
    name: "",
    category: "non-consumable" as "consumable" | "non-consumable",
    unit: "pc",
    maintaining_stock: 0,
    stock_available: 0,
    condition: "Good" as "Good" | "Defective" | "Mixed" | "Expired",
    location: "",
    image_url: "",
    expiration_date: "",
    last_restock_date: "",
  });

  const filtered = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.location.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">{items.length} items across all locations</p>
        </div>
        {user?.role === "sa" && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items or locations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["all", "non-consumable", "consumable"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                categoryFilter === cat ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "all" ? "All" : cat === "non-consumable" ? "Equipment" : "Consumables"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-hidden animate-slide-up" style={{ animationDelay: "120ms", animationFillMode: "both" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Item</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Category</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Location</th>
              <th className="text-center px-5 py-3 font-medium text-muted-foreground">Maintaining Stock</th>
              <th className="text-center px-5 py-3 font-medium text-muted-foreground">Available</th>
              <th className="text-center px-5 py-3 font-medium text-muted-foreground">Condition</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((item) => {
              const pct = Math.round((item.stock_available / item.maintaining_stock) * 100);
              return (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/8 text-primary">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {item.id.slice(0, 8)} · {item.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-secondary">
                      {item.category === "consumable" ? "Consumable" : "Equipment"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{item.location}</td>
                  <td className="px-5 py-3.5 text-center tabular-nums">{item.maintaining_stock}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <span className="tabular-nums font-medium">{item.stock_available}</span>
                      <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct < 30 ? "bg-destructive" : pct < 50 ? "bg-warning" : "bg-success"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <StatusBadge status={item.condition} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {user?.role === "ci" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={item.stock_available === 0}
                          onClick={() => {
                            setSelectedItem(item);
                            setBorrowQuantity(1);
                            setIsBorrowDialogOpen(true);
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Borrow
                        </Button>
                      )}
                      {user?.role === "sa" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedItem(item);
                              setEditForm({
                                item_code: item.item_code || "",
                                name: item.name,
                                category: item.category,
                                unit: item.unit,
                                maintaining_stock: item.maintaining_stock,
                                stock_available: item.stock_available,
                                condition: item.condition,
                                location: item.location,
                                image_url: item.image_url || "",
                                expiration_date: item.expiration_date || "",
                                last_restock_date: item.last_restock_date || "",
                              });
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedItem(item);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">No items found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}
          </>
        )}
      </div>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label htmlFor="item_code">Item Code (Optional)</Label>
              <Input
                id="item_code"
                value={addForm.item_code}
                onChange={(e) => setAddForm({ ...addForm, item_code: e.target.value })}
                placeholder="e.g., OR-001"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value as any })}
                className="w-full mt-1.5 px-3 py-2 rounded-md border bg-background"
              >
                <option value="non-consumable">Equipment</option>
                <option value="consumable">Consumable</option>
              </select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g., Stethoscope"
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={addForm.unit}
                onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                placeholder="e.g., pc, box, set"
              />
            </div>
            <div>
              <Label htmlFor="condition">Condition</Label>
              <select
                id="condition"
                value={addForm.condition}
                onChange={(e) => setAddForm({ ...addForm, condition: e.target.value as any })}
                className="w-full mt-1.5 px-3 py-2 rounded-md border bg-background"
              >
                <option value="Good">Good</option>
                <option value="Mixed">Mixed</option>
                <option value="Defective">Defective</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
            <div>
              <Label htmlFor="maintaining_stock">Maintaining Stock</Label>
              <Input
                id="maintaining_stock"
                type="number"
                value={addForm.maintaining_stock}
                onChange={(e) => setAddForm({ ...addForm, maintaining_stock: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="stock_available">Available Stock</Label>
              <Input
                id="stock_available"
                type="number"
                value={addForm.stock_available}
                onChange={(e) => setAddForm({ ...addForm, stock_available: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={addForm.location}
                onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                placeholder="e.g., C1A, C1L, OR/DRN"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="image_url">Image URL (Optional)</Label>
              <Input
                id="image_url"
                value={addForm.image_url}
                onChange={(e) => setAddForm({ ...addForm, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            {addForm.category === "consumable" && (
              <div>
                <Label htmlFor="expiration_date">Expiration Date</Label>
                <Input
                  id="expiration_date"
                  type="date"
                  value={addForm.expiration_date}
                  onChange={(e) => setAddForm({ ...addForm, expiration_date: e.target.value })}
                />
              </div>
            )}
            <div className={addForm.category === "consumable" ? "" : "col-span-2"}>
              <Label htmlFor="last_restock_date">Last Restock Date (Optional)</Label>
              <Input
                id="last_restock_date"
                type="date"
                value={addForm.last_restock_date}
                onChange={(e) => setAddForm({ ...addForm, last_restock_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                // Convert empty strings to undefined for optional fields
                const itemData = {
                  ...addForm,
                  item_code: addForm.item_code || undefined,
                  image_url: addForm.image_url || undefined,
                  expiration_date: addForm.expiration_date || undefined,
                  last_restock_date: addForm.last_restock_date || undefined,
                };
                await addItem(itemData);
                toast.success("Item added successfully");
                setIsAddDialogOpen(false);
                setAddForm({
                  item_code: "",
                  name: "",
                  category: "non-consumable",
                  unit: "pc",
                  maintaining_stock: 0,
                  stock_available: 0,
                  condition: "Good",
                  location: "",
                  image_url: "",
                  expiration_date: "",
                  last_restock_date: "",
                });
              } catch (error: any) {
                toast.error(error.message || "Failed to add item");
              }
            }}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Borrow Dialog */}
      <Dialog open={isBorrowDialogOpen} onOpenChange={setIsBorrowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrow Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Item</Label>
              <p className="text-sm font-medium mt-1.5">{selectedItem?.name}</p>
              <p className="text-xs text-muted-foreground">Available: {selectedItem?.stock_available} {selectedItem?.unit}</p>
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={selectedItem?.stock_available || 1}
                value={borrowQuantity}
                onChange={(e) => setBorrowQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className="text-sm font-medium">{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} (7 days)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBorrowDialogOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                await createBorrowRequest(selectedItem.id, borrowQuantity);
                toast.success("Borrow request submitted");
                setIsBorrowDialogOpen(false);
              } catch (error: any) {
                toast.error(error.message || "Failed to create borrow request");
              }
            }}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label htmlFor="edit_item_code">Item Code (Optional)</Label>
              <Input
                id="edit_item_code"
                value={editForm.item_code}
                onChange={(e) => setEditForm({ ...editForm, item_code: e.target.value })}
                placeholder="e.g., OR-001"
              />
            </div>
            <div>
              <Label htmlFor="edit_category">Category</Label>
              <select
                id="edit_category"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                className="w-full mt-1.5 px-3 py-2 rounded-md border bg-background"
              >
                <option value="non-consumable">Equipment</option>
                <option value="consumable">Consumable</option>
              </select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit_name">Item Name</Label>
              <Input
                id="edit_name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_unit">Unit</Label>
              <Input
                id="edit_unit"
                value={editForm.unit}
                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_condition">Condition</Label>
              <select
                id="edit_condition"
                value={editForm.condition}
                onChange={(e) => setEditForm({ ...editForm, condition: e.target.value as any })}
                className="w-full mt-1.5 px-3 py-2 rounded-md border bg-background"
              >
                <option value="Good">Good</option>
                <option value="Mixed">Mixed</option>
                <option value="Defective">Defective</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
            <div>
              <Label htmlFor="edit_maintaining_stock">Maintaining Stock</Label>
              <Input
                id="edit_maintaining_stock"
                type="number"
                value={editForm.maintaining_stock}
                onChange={(e) => setEditForm({ ...editForm, maintaining_stock: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="edit_stock_available">Available Stock</Label>
              <Input
                id="edit_stock_available"
                type="number"
                value={editForm.stock_available}
                onChange={(e) => setEditForm({ ...editForm, stock_available: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit_location">Location</Label>
              <Input
                id="edit_location"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit_image_url">Image URL (Optional)</Label>
              <Input
                id="edit_image_url"
                value={editForm.image_url}
                onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
              />
            </div>
            {editForm.category === "consumable" && (
              <div>
                <Label htmlFor="edit_expiration_date">Expiration Date</Label>
                <Input
                  id="edit_expiration_date"
                  type="date"
                  value={editForm.expiration_date}
                  onChange={(e) => setEditForm({ ...editForm, expiration_date: e.target.value })}
                />
              </div>
            )}
            <div className={editForm.category === "consumable" ? "" : "col-span-2"}>
              <Label htmlFor="edit_last_restock_date">Last Restock Date (Optional)</Label>
              <Input
                id="edit_last_restock_date"
                type="date"
                value={editForm.last_restock_date}
                onChange={(e) => setEditForm({ ...editForm, last_restock_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                if (!selectedItem) return;
                const itemData = {
                  ...editForm,
                  item_code: editForm.item_code || undefined,
                  image_url: editForm.image_url || undefined,
                  expiration_date: editForm.expiration_date || undefined,
                  last_restock_date: editForm.last_restock_date || undefined,
                };
                await updateItem(selectedItem.id, itemData);
                toast.success("Item updated successfully");
                setIsEditDialogOpen(false);
              } catch (error: any) {
                toast.error(error.message || "Failed to update item");
              }
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  if (!selectedItem) return;
                  await deleteItem(selectedItem.id);
                  toast.success("Item deleted successfully");
                  setIsDeleteDialogOpen(false);
                } catch (error: any) {
                  toast.error(error.message || "Failed to delete item");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
