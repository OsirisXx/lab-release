import { useState } from "react";
import { BookOpen, Search, FileText, Plus, Edit2, Trash2, Loader2, ShoppingCart, Package, CheckCircle, XCircle, AlertCircle, ListChecks, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRleGuides, type RleGuide } from "@/hooks/useRleGuides";
import { useAuth } from "@/contexts/AuthContext";
import { useInventory, type InventoryItem } from "@/hooks/useInventory";
import { useTransactions, type Transaction } from "@/hooks/useTransactions";
import { AssistedBorrowDialog } from "@/components/AssistedBorrowDialog";
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
import { addCalendarDays, getApplicationDate, formatDueDate } from "@/lib/date-utils";

const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export default function RleGuide() {
  const { guides, loading, createGuide, updateGuide, deleteGuide } = useRleGuides();
  const { items } = useInventory();
  const {
    createBorrowRequest,
    createBulkBorrowRequests,
    createBorrowForCI,
    createBulkBorrowForCI,
    refetch: refetchTransactions,
  } = useTransactions();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBorrowDialogOpen, setIsBorrowDialogOpen] = useState(false);
  const [isBulkBorrowDialogOpen, setIsBulkBorrowDialogOpen] = useState(false);
  const [isAssistedBorrowDialogOpen, setIsAssistedBorrowDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<RleGuide | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<InventoryItem | null>(null);
  const [bulkBorrowGuideId, setBulkBorrowGuideId] = useState<string | null>(null);
  const [bulkBorrowItems, setBulkBorrowItems] = useState<InventoryItem[]>([]);
  const [bulkBorrowQuantities, setBulkBorrowQuantities] = useState<Record<string, number>>({});
  const [assistedBorrowItems, setAssistedBorrowItems] = useState<InventoryItem[]>([]);
  const [assistedBorrowInitialItemId, setAssistedBorrowInitialItemId] = useState("");
  const [assistedBorrowGuideId, setAssistedBorrowGuideId] = useState<string | null>(null);
  const [assistedBorrowTitle, setAssistedBorrowTitle] = useState("Borrow for Clinical Instructor");
  const [assistedBorrowDescription, setAssistedBorrowDescription] = useState<string | undefined>(undefined);
  const [markedEquipmentByGuide, setMarkedEquipmentByGuide] = useState<Record<string, string[]>>({});
  const [isDeleteMarkDialogOpen, setIsDeleteMarkDialogOpen] = useState(false);
  const [deleteMarkGuideId, setDeleteMarkGuideId] = useState<string | null>(null);
  const [deleteMarkItems, setDeleteMarkItems] = useState<InventoryItem[]>([]);
  const [borrowQuantity, setBorrowQuantity] = useState(1);
  const [formData, setFormData] = useState({
    year_level: "1st Year" as RleGuide["year_level"],
    title: "",
    description: "",
    topics: "",
    equipment: "",
  });
  const [selectedEquipmentItems, setSelectedEquipmentItems] = useState<string[]>([]);
  const [equipmentSearch, setEquipmentSearch] = useState("");

  const getAvailableEquipmentForGuide = (guide: RleGuide): InventoryItem[] => {
    const seen = new Set<string>();
    return guide.equipment
      .map((equipmentName) => items.find((item) => item.name.toLowerCase() === equipmentName.toLowerCase()))
      .filter((item): item is InventoryItem => {
        if (!item || item.stock_available <= 0 || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
  };

  const toggleMarkedEquipment = (guideId: string, itemId: string, checked: boolean) => {
    setMarkedEquipmentByGuide((current) => {
      const marked = current[guideId] || [];
      return {
        ...current,
        [guideId]: checked
          ? marked.includes(itemId) ? marked : [...marked, itemId]
          : marked.filter((id) => id !== itemId),
      };
    });
  };

  const handleMarkAll = (guide: RleGuide) => {
    setMarkedEquipmentByGuide((current) => ({
      ...current,
      [guide.id]: getAvailableEquipmentForGuide(guide).map((item: InventoryItem) => item.id),
    }));
  };

  const handleDeleteMark = (guide: RleGuide) => {
    const markedIds = markedEquipmentByGuide[guide.id] || [];
    if (markedIds.length === 0) {
      toast.error("Mark at least one item before deleting marks");
      return;
    }
    const markedItems = markedIds
      .map((itemId: string) => items.find((item) => item.id === itemId))
      .filter(Boolean);
    setDeleteMarkGuideId(guide.id);
    setDeleteMarkItems(markedItems);
    setIsDeleteMarkDialogOpen(true);
  };

  const handleDeleteMarkDialogChange = (open: boolean) => {
    setIsDeleteMarkDialogOpen(open);
    if (!open) {
      setDeleteMarkGuideId(null);
      setDeleteMarkItems([]);
    }
  };

  const handleOpenBulkBorrow = (guide: RleGuide) => {
    const markedIds = markedEquipmentByGuide[guide.id] || [];
    const selected = getAvailableEquipmentForGuide(guide).filter((item: InventoryItem) => markedIds.includes(item.id));
    if (selected.length === 0) {
      toast.error("Mark at least one available item first");
      return;
    }
    setBulkBorrowGuideId(guide.id);
    setBulkBorrowItems(selected);
    setBulkBorrowQuantities(Object.fromEntries(selected.map((item: InventoryItem) => [item.id, 1])));
    setIsBulkBorrowDialogOpen(true);
  };

  const resetAssistedBorrowDialog = () => {
    setAssistedBorrowItems([]);
    setAssistedBorrowInitialItemId("");
    setAssistedBorrowGuideId(null);
    setAssistedBorrowTitle("Borrow for Clinical Instructor");
    setAssistedBorrowDescription(undefined);
  };

  const handleOpenAssistedBorrow = (item: InventoryItem) => {
    setAssistedBorrowItems([item]);
    setAssistedBorrowInitialItemId(item.id);
    setAssistedBorrowGuideId(null);
    setAssistedBorrowTitle("Borrow for Clinical Instructor");
    setAssistedBorrowDescription(undefined);
    setIsAssistedBorrowDialogOpen(true);
  };

  const handleOpenMarkedAssistedBorrow = (guide: RleGuide) => {
    const markedIds = markedEquipmentByGuide[guide.id] || [];
    const selected = markedIds
      .map((itemId) => items.find((item) => item.id === itemId))
      .filter((item): item is InventoryItem => Boolean(item));

    if (selected.length !== markedIds.length || selected.some((item) => item.stock_available <= 0)) {
      toast.error("One or more marked items are no longer available. Refresh the page and update your marks.");
      return;
    }
    if (selected.length === 0) {
      toast.error("Mark at least one available item first");
      return;
    }

    setAssistedBorrowItems(selected);
    setAssistedBorrowInitialItemId(selected[0].id);
    setAssistedBorrowGuideId(guide.id);
    setAssistedBorrowTitle("Borrow Marked Equipment for CI");
    setAssistedBorrowDescription("Set a quantity for every marked item. All marked items will be recorded together for the selected registered Clinical Instructor, or none will be recorded if validation fails.");
    setIsAssistedBorrowDialogOpen(true);
  };

  const handleAssistedBorrowDialogChange = (open: boolean) => {
    setIsAssistedBorrowDialogOpen(open);
    if (!open) resetAssistedBorrowDialog();
  };

  const handleAssistedBorrowSuccess = (transactions: Transaction | Transaction[]) => {
    if (!assistedBorrowGuideId) return;
    const createdTransactions = Array.isArray(transactions) ? transactions : [transactions];
    const createdItemIds = new Set(createdTransactions.map((transaction) => transaction.item_id));

    setMarkedEquipmentByGuide((current) => ({
      ...current,
      [assistedBorrowGuideId]: (current[assistedBorrowGuideId] || []).filter((itemId) => !createdItemIds.has(itemId)),
    }));
  };

  const handleBulkBorrow = async () => {
    try {
      const invalidRequest = bulkBorrowItems.find((item: InventoryItem) => {
        const quantity = bulkBorrowQuantities[item.id] || 1;
        return quantity > item.stock_available;
      });
      if (invalidRequest) {
        const quantity = bulkBorrowQuantities[invalidRequest.id] || 1;
        toast.error(`Only ${invalidRequest.stock_available} unit(s) of ${invalidRequest.name} are available; requested ${quantity}`);
        return;
      }
      const requests = bulkBorrowItems.map((item: InventoryItem) => ({
        itemId: item.id,
        quantity: bulkBorrowQuantities[item.id] || 1,
      }));
      const created = await createBulkBorrowRequests(requests);
      toast.success(`${created.length} borrow request${created.length === 1 ? "" : "s"} submitted`);
      if (bulkBorrowGuideId) {
        setMarkedEquipmentByGuide((current) => ({ ...current, [bulkBorrowGuideId]: [] }));
      }
      setIsBulkBorrowDialogOpen(false);
      setBulkBorrowItems([]);
      setBulkBorrowGuideId(null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to submit bulk borrow request"));
    }
  };

  const filtered = guides.filter((guide) => {
    const matchesSearch =
      guide.title.toLowerCase().includes(search.toLowerCase()) ||
      guide.description.toLowerCase().includes(search.toLowerCase()) ||
      guide.topics.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesYear = selectedYear === "all" || guide.year_level === selectedYear;
    return matchesSearch && matchesYear;
  });



  const handleOpenDialog = (guide?: RleGuide) => {
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to save guide"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this guide?")) return;
    
    try {
      await deleteGuide(id);
      toast.success("Guide deleted successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete guide"));
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
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-medium text-muted-foreground">Suggested Equipment</p>
                    {(user?.role === "ci" || user?.role === "sa") && (
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleMarkAll(guide)}
                        >
                          <ListChecks className="h-3 w-3 mr-1" />
                          Mark All
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => handleDeleteMark(guide)}
                        >
                          <Eraser className="h-3 w-3 mr-1" />
                          Delete Mark
                        </Button>
                        {user?.role === "ci" ? (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={(markedEquipmentByGuide[guide.id] || []).length === 0}
                            onClick={() => handleOpenBulkBorrow(guide)}
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Borrow Marked ({(markedEquipmentByGuide[guide.id] || []).length})
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={(markedEquipmentByGuide[guide.id] || []).length === 0}
                            onClick={() => handleOpenMarkedAssistedBorrow(guide)}
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Borrow Marked for CI ({(markedEquipmentByGuide[guide.id] || []).length})
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
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
                            {(user?.role === "ci" || user?.role === "sa") && inventoryItem && isAvailable && (
                              <input
                                type="checkbox"
                                aria-label={`Mark ${equipmentName}`}
                                checked={(markedEquipmentByGuide[guide.id] || []).includes(inventoryItem.id)}
                                onChange={(event) => toggleMarkedEquipment(guide.id, inventoryItem.id, event.target.checked)}
                                className="h-4 w-4 rounded border-input"
                              />
                            )}
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
                                {user?.role === 'sa' && isAvailable && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => handleOpenAssistedBorrow(inventoryItem)}
                                  >
                                    <ShoppingCart className="h-3 w-3 mr-1" />
                                    Borrow for CI
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
                onChange={(e) => setFormData({ ...formData, year_level: e.target.value as RleGuide["year_level"] })}
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

      <AssistedBorrowDialog
        open={isAssistedBorrowDialogOpen}
        onOpenChange={handleAssistedBorrowDialogChange}
        itemOptions={assistedBorrowItems}
        initialItemId={assistedBorrowInitialItemId}
        title={assistedBorrowTitle}
        description={assistedBorrowDescription}
        trigger={null}
        bulkMode={Boolean(assistedBorrowGuideId)}
        createBorrowForCI={createBorrowForCI}
        createBulkBorrowForCI={createBulkBorrowForCI}
        refetchTransactions={refetchTransactions}
        onSuccess={handleAssistedBorrowSuccess}
      />

      {/* Delete Mark Dialog */}
      <Dialog open={isDeleteMarkDialogOpen} onOpenChange={handleDeleteMarkDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Marked Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              Uncheck the equipment you want to remove from the marked list for this RLE procedure.
            </p>
            {deleteMarkItems.length === 0 ? (
              <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                No equipment is currently marked.
              </p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {deleteMarkItems.map((item: InventoryItem) => (
                  <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={deleteMarkGuideId ? (markedEquipmentByGuide[deleteMarkGuideId] || []).includes(item.id) : false}
                      onChange={(event) => {
                        if (deleteMarkGuideId) {
                          toggleMarkedEquipment(deleteMarkGuideId, item.id, event.target.checked);
                        }
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">{item.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{item.stock_available} available</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => handleDeleteMarkDialogChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Borrow Dialog */}
      <Dialog open={isBorrowDialogOpen} onOpenChange={setIsBorrowDialogOpen}>
        <DialogContent className="max-w-none" style={{ width: "min(90vw, 48rem)", maxWidth: "none" }}>
          <DialogHeader>
            <DialogTitle>Borrow Equipment</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-3">
            <div className="sm:col-span-3">
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
            <div className="sm:col-span-2 bg-muted/50 p-3 rounded-md">
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className="text-sm font-medium">{formatDueDate(addCalendarDays(getApplicationDate(), 2))}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBorrowDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                try {
                  if (!selectedEquipment) return;
                  if (borrowQuantity > selectedEquipment.stock_available) {
                    toast.error(`Only ${selectedEquipment.stock_available} unit(s) of ${selectedEquipment.name} are available`);
                    return;
                  }
                  await createBorrowRequest(selectedEquipment.id, borrowQuantity);
                  toast.success('Borrow request submitted successfully');
                  setIsBorrowDialogOpen(false);
                  setSelectedEquipment(null);
                  setBorrowQuantity(1);
                } catch (error: unknown) {
                  toast.error(getErrorMessage(error, "Failed to submit borrow request"));
                }
              }}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Borrow Dialog */}
      <Dialog open={isBulkBorrowDialogOpen} onOpenChange={setIsBulkBorrowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrow Marked Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Submit the marked equipment as one RLE borrow request. The Student Assistant will tag accompanying students when approving each transaction.
            </p>
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-xs text-muted-foreground">Due Date for All Requests</p>
              <p className="text-sm font-medium">{formatDueDate(addCalendarDays(getApplicationDate(), 2))}</p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {bulkBorrowItems.map((item: InventoryItem) => (
                <div key={item.id} className="grid grid-cols-[1fr_7rem] gap-3 items-center border rounded-md p-3">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Available: {item.stock_available} {item.unit}</p>
                  </div>
                  <div>
                    <Label htmlFor={`bulk-quantity-${item.id}`} className="text-xs">Quantity</Label>
                    <Input
                      id={`bulk-quantity-${item.id}`}
                      type="number"
                      min={1}
                      max={item.stock_available}
                      value={bulkBorrowQuantities[item.id] || 1}
                      onChange={(event) => setBulkBorrowQuantities((current) => ({
                        ...current,
                        [item.id]: parseInt(event.target.value) || 1,
                      }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkBorrowDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkBorrow}>Submit Bulk Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
