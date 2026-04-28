import { useState } from "react";
import { BookOpen, Search, FileText, Plus, Edit2, Trash2, X, Loader2, ShoppingCart, Package, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRleGuides } from "@/hooks/useRleGuides";
import { useAuth } from "@/contexts/AuthContext";
import { useInventory } from "@/hooks/useInventory";
import { useTransactions } from "@/hooks/useTransactions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function RleGuide() {
  const { guides, loading, createGuide, updateGuide, deleteGuide } = useRleGuides();
  const { items } = useInventory();
  const { createBorrowRequest } = useTransactions();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBorrowDialogOpen, setIsBorrowDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<any>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [borrowQuantity, setBorrowQuantity] = useState(1);
  const [formData, setFormData] = useState({
    year_level: "1st Year" as any,
    title: "",
    description: "",
    topics: "",
    equipment: "",
  });
  const [selectedEquipmentItems, setSelectedEquipmentItems] = useState<string[]>([]);
  const [equipmentSearch, setEquipmentSearch] = useState("");

  const filtered = guides.filter((guide) => {
    const matchesSearch =
      guide.title.toLowerCase().includes(search.toLowerCase()) ||
      guide.description.toLowerCase().includes(search.toLowerCase()) ||
      guide.topics.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesYear = selectedYear === "all" || guide.year_level === selectedYear;
    return matchesSearch && matchesYear;
  });

  const handleOpenDialog = (guide?: any) => {
    if (guide) {
      setEditingGuide(guide);
      setFormData({
        year_level: guide.year_level,
        title: guide.title,
        description: guide.description,
        topics: guide.topics.join(", "),
        equipment: guide.equipment?.join(", ") || "",
      });
      setSelectedEquipmentItems(guide.equipment || []);
    } else {
      setEditingGuide(null);
      setFormData({
        year_level: "1st Year",
        title: "",
        description: "",
        topics: "",
        equipment: "",
      });
      setSelectedEquipmentItems([]);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingGuide(null);
    setEquipmentSearch("");
  };

  const handleSubmit = async () => {
    try {
      const topicsArray = formData.topics.split(",").map((t) => t.trim()).filter(Boolean);
      const equipmentArray = selectedEquipmentItems;
      
      if (editingGuide) {
        await updateGuide(editingGuide.id, {
          year_level: formData.year_level,
          title: formData.title,
          description: formData.description,
          topics: topicsArray,
          equipment: equipmentArray,
        });
        toast.success("Guide updated successfully");
      } else {
        await createGuide({
          year_level: formData.year_level,
          title: formData.title,
          description: formData.description,
          topics: topicsArray,
          equipment: equipmentArray,
        });
        toast.success("Guide created successfully");
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.message || "Failed to save guide");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this guide?")) return;
    
    try {
      await deleteGuide(id);
      toast.success("Guide deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete guide");
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">RLE Procedure</h1>
          <p className="text-muted-foreground mt-1">Related Learning Experience procedures for all year levels</p>
        </div>
        {user?.role === "sa" && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Guide
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search guides or topics..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {["all", "1st Year", "2nd Year", "3rd Year", "4th Year"].map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedYear === year ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {year === "all" ? "All" : year}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((guide, idx) => (
          <div
            key={guide.id}
            className="bg-card rounded-lg border overflow-hidden hover:shadow-md transition-shadow animate-slide-up"
            style={{ animationDelay: `${120 + idx * 60}ms`, animationFillMode: "both" }}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">{guide.year_level}</p>
                    <h3 className="font-semibold text-lg">{guide.title}</h3>
                  </div>
                </div>
                {user?.role === "sa" && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(guide)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(guide.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-4">{guide.description}</p>

              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Key Topics</p>
                <div className="flex flex-wrap gap-2">
                  {guide.topics.map((topic) => (
                    <span key={topic} className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {guide.equipment && guide.equipment.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Suggested Equipment</p>
                  <div className="space-y-2">
                    {guide.equipment.map((equipmentName, idx) => {
                      const inventoryItem = items.find(item => 
                        item.name.toLowerCase() === equipmentName.toLowerCase()
                      );
                      const isAvailable = inventoryItem && inventoryItem.stock_available > 0;
                      const isLowStock = inventoryItem && inventoryItem.stock_available > 0 && inventoryItem.stock_available < 5;
                      
                      return (
                        <div key={`${guide.id}-${equipmentName}-${idx}`} className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{equipmentName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {inventoryItem ? (
                              <>
                                {isAvailable ? (
                                  <span className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${
                                    isLowStock ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                                  }`}>
                                    {isLowStock ? <AlertCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                                    {inventoryItem.stock_available} available
                                  </span>
                                ) : (
                                  <span className="text-xs px-2 py-1 rounded-md bg-destructive/10 text-destructive flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    Out of stock
                                  </span>
                                )}
                                {user?.role === 'ci' && isAvailable && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      setSelectedEquipment(inventoryItem);
                                      setBorrowQuantity(1);
                                      setIsBorrowDialogOpen(true);
                                    }}
                                  >
                                    <ShoppingCart className="h-3 w-3 mr-1" />
                                    Borrow
                                  </Button>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not in inventory</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Last updated: {new Date(guide.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-lg border">
          <BookOpen className="h-12 w-12 mb-3 opacity-40" />
          <p className="font-medium">No guides found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGuide ? "Edit Guide" : "Add New Guide"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="year_level">Year Level</Label>
              <select
                id="year_level"
                value={formData.year_level}
                onChange={(e) => setFormData({ ...formData, year_level: e.target.value as any })}
                className="w-full mt-1.5 px-3 py-2 rounded-md border bg-background"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Fundamentals of Nursing"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the guide"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="topics">Topics (comma-separated)</Label>
              <Input
                id="topics"
                value={formData.topics}
                onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                placeholder="e.g., Vital Signs, Patient Assessment, Basic Life Support"
              />
            </div>
            <div>
              <Label>Suggested Equipment</Label>
              <p className="text-xs text-muted-foreground mb-2">Select from existing inventory items</p>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search equipment..."
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No inventory items available</p>
                ) : (
                  items
                    .filter(item => item.name.toLowerCase().includes(equipmentSearch.toLowerCase()))
                    .map((item) => (
                    <label key={item.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedEquipmentItems.includes(item.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEquipmentItems([...selectedEquipmentItems, item.name]);
                          } else {
                            setSelectedEquipmentItems(selectedEquipmentItems.filter(name => name !== item.name));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{item.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">({item.stock_available} available)</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{selectedEquipmentItems.length} item(s) selected</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingGuide ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Borrow Dialog */}
      <Dialog open={isBorrowDialogOpen} onOpenChange={setIsBorrowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrow Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Item</Label>
              <p className="text-sm font-medium mt-1">{selectedEquipment?.name}</p>
            </div>
            <div>
              <Label>Available Stock</Label>
              <p className="text-sm text-muted-foreground mt-1">{selectedEquipment?.stock_available} units</p>
            </div>
            <div>
              <Label htmlFor="borrow_quantity">Quantity to Borrow</Label>
              <Input
                id="borrow_quantity"
                type="number"
                min="1"
                max={selectedEquipment?.stock_available || 1}
                value={borrowQuantity}
                onChange={(e) => setBorrowQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBorrowDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                try {
                  if (!selectedEquipment) return;
                  await createBorrowRequest(selectedEquipment.id, borrowQuantity);
                  toast.success('Borrow request submitted successfully');
                  setIsBorrowDialogOpen(false);
                  setSelectedEquipment(null);
                  setBorrowQuantity(1);
                } catch (error: any) {
                  toast.error(error.message || 'Failed to submit borrow request');
                }
              }}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
