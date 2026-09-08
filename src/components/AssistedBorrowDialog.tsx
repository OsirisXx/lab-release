import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudentTagsField } from "@/components/StudentTagsField";
import { useAuth } from "@/contexts/AuthContext";
import { useInventory, type InventoryItem } from "@/hooks/useInventory";
import { useUsers } from "@/hooks/useUsers";
import type { BulkBorrowRequest, StudentTagInput, Transaction } from "@/hooks/useTransactions";
import { toast } from "sonner";

interface AssistedBorrowDialogProps {
  createBorrowForCI: (
    itemId: string,
    quantity: number,
    borrowerId: string,
    studentTags: StudentTagInput[],
  ) => Promise<Transaction>;
  createBulkBorrowForCI?: (
    requests: BulkBorrowRequest[],
    borrowerId: string,
    studentTags: StudentTagInput[],
  ) => Promise<Transaction[]>;
  refetchTransactions: () => Promise<void>;
  bulkMode?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  itemOptions?: InventoryItem[];
  initialItemId?: string;
  trigger?: ReactNode;
  title?: string;
  description?: string;
  onSuccess?: (transaction: Transaction | Transaction[]) => void | Promise<void>;
}

const EMPTY_TAGS: StudentTagInput[] = [];
const EMPTY_FORM = { item_id: "", borrower_id: "", quantity: 1 };
const DEFAULT_TITLE = "Borrow for Clinical Instructor";
const DEFAULT_DESCRIPTION = "Record the equipment requested by a registered Clinical Instructor. The borrow becomes active immediately and available stock is deducted.";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

export function AssistedBorrowDialog({
  createBorrowForCI,
  createBulkBorrowForCI,
  refetchTransactions,
  bulkMode = false,
  open,
  onOpenChange,
  itemOptions,
  initialItemId,
  trigger,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  onSuccess,
}: AssistedBorrowDialogProps) {
  const { user } = useAuth();
  const { clinicalInstructors, error: usersError } = useUsers();
  const { items, error: inventoryError } = useInventory();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentTags, setStudentTags] = useState<StudentTagInput[]>(EMPTY_TAGS);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});

  const dialogOpen = open ?? isOpen;
  const selectableItems = (itemOptions ?? items).filter((item) => item.stock_available > 0);
  const isBulkMode = bulkMode && Boolean(createBulkBorrowForCI);

  const resetForm = () => {
    setStudentTags([]);
    setFormData({ ...EMPTY_FORM });
    setItemQuantities({});
  };

  useEffect(() => {
    if (!dialogOpen) return;

    const options = (itemOptions ?? items).filter((item) => item.stock_available > 0);
    const initialItem = initialItemId && options.some((item) => item.id === initialItemId)
      ? initialItemId
      : "";

    setItemQuantities((current) => {
      const next = { ...current };
      options.forEach((item) => {
        if (!Number.isInteger(next[item.id]) || next[item.id] <= 0) {
          next[item.id] = 1;
        }
      });
      return next;
    });

    setFormData((current) => current.item_id ? current : { ...current, item_id: initialItem });
  }, [dialogOpen, initialItemId, itemOptions, items]);

  const handleItemChange = (itemId: string) => {
    setFormData((current) => ({
      ...current,
      item_id: itemId,
      quantity: itemQuantities[itemId] ?? 1,
    }));
  };

  const handleQuantityChange = (itemId: string, value: string) => {
    const quantity = Number.parseInt(value, 10) || 1;
    setItemQuantities((current) => ({ ...current, [itemId]: quantity }));
    setFormData((current) => current.item_id === itemId ? { ...current, quantity } : current);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    if (open === undefined) setIsOpen(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleSubmit = async () => {
    const selectedItem = selectableItems.find((item) => item.id === formData.item_id);
    const selectedBorrower = clinicalInstructors.find((candidate) => candidate.id === formData.borrower_id);
    const bulkItems = itemOptions ?? [];

    if (!selectedBorrower) {
      toast.error("Please select a registered Clinical Instructor");
      return;
    }

    if (isBulkMode) {
      if (!createBulkBorrowForCI || bulkItems.length === 0) {
        toast.error("Select at least one item to borrow");
        return;
      }

      const invalidItem = bulkItems.find((item) => {
        const quantity = itemQuantities[item.id] ?? 1;
        return !Number.isInteger(quantity) || quantity <= 0 || quantity > item.stock_available;
      });
      if (invalidItem) {
        const quantity = itemQuantities[invalidItem.id] ?? 1;
        toast.error(`Only ${invalidItem.stock_available} unit(s) of ${invalidItem.name} are available; requested ${quantity}`);
        return;
      }
    } else {
      if (!selectedItem) {
        toast.error("Please select a registered Clinical Instructor and an inventory item");
        return;
      }
      if (!Number.isInteger(formData.quantity) || formData.quantity <= 0) {
        toast.error("Borrow quantity must be greater than zero");
        return;
      }
      if (formData.quantity > selectedItem.stock_available) {
        toast.error(`Only ${selectedItem.stock_available} unit(s) of ${selectedItem.name} are available`);
        return;
      }
    }

    try {
      setIsSubmitting(true);

      if (isBulkMode && createBulkBorrowForCI) {
        const requests = bulkItems.map((item) => ({
          itemId: item.id,
          quantity: itemQuantities[item.id] ?? 1,
        }));
        const transactions = await createBulkBorrowForCI(
          requests,
          formData.borrower_id,
          studentTags,
        );
        await refetchTransactions();
        await onSuccess?.(transactions);
        toast.success(`${transactions.length} item${transactions.length === 1 ? "" : "s"} recorded for ${selectedBorrower.name}`);
      } else {
        const transaction = await createBorrowForCI(
          formData.item_id,
          formData.quantity,
          formData.borrower_id,
          studentTags,
        );
        await refetchTransactions();
        await onSuccess?.(transaction);
        toast.success(`Borrow recorded for ${selectedBorrower.name}`);
      }

      handleOpenChange(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to record assisted borrow"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.role !== "sa") return null;

  const renderedTrigger = trigger === undefined && open === undefined ? (
    <Button>
      <Plus className="h-4 w-4" />
      Borrow for CI
    </Button>
  ) : trigger;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {renderedTrigger && <DialogTrigger asChild>{renderedTrigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="assisted-borrower">Clinical Instructor</Label>
            <select
              id="assisted-borrower"
              value={formData.borrower_id}
              onChange={(event) => setFormData({ ...formData, borrower_id: event.target.value })}
              className="mt-1.5 w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="">Select a registered CI...</option>
              {clinicalInstructors.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}{candidate.ci_id ? ` (${candidate.ci_id})` : ""}
                </option>
              ))}
            </select>
            {usersError && <p className="mt-1.5 text-xs text-destructive">Unable to load CI profiles: {usersError}</p>}
            {!usersError && clinicalInstructors.length === 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">No registered CI profiles were found.</p>
            )}
          </div>

          {itemOptions && itemOptions.length > 1 ? (
            <div className="sm:col-span-2">
              <Label>Marked Equipment</Label>
              <div className="mt-1.5 max-h-64 space-y-2 overflow-y-auto rounded-md border p-2">
                {selectableItems.map((item) => {
                  const quantity = itemQuantities[item.id] ?? 1;
                  const isSelected = formData.item_id === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 rounded-md border p-2 transition-colors ${
                        isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleItemChange(item.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.stock_available} {item.unit} available
                        </p>
                      </button>
                      <div className="w-24 shrink-0">
                        <Label htmlFor={`assisted-quantity-${item.id}`} className="text-xs">Quantity</Label>
                        <Input
                          id={`assisted-quantity-${item.id}`}
                          type="number"
                          min={1}
                          max={item.stock_available}
                          value={quantity}
                          onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {isBulkMode
                  ? "All marked items and their quantities will be recorded together."
                  : "Select an item to record it. Quantities are saved for every marked item."}
              </p>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="assisted-item">Item</Label>
                <select
                  id="assisted-item"
                  value={formData.item_id}
                  onChange={(event) => handleItemChange(event.target.value)}
                  className="mt-1.5 w-full rounded-md border bg-background px-3 py-2"
                >
                  <option value="">Select an item...</option>
                  {selectableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {item.stock_available} {item.unit} available
                    </option>
                  ))}
                </select>
                {inventoryError && !itemOptions && <p className="mt-1.5 text-xs text-destructive">Unable to load inventory: {inventoryError}</p>}
              </div>

              <div>
                <Label htmlFor="assisted-quantity">Quantity</Label>
                <Input
                  id="assisted-quantity"
                  type="number"
                  min={1}
                  max={selectableItems.find((item) => item.id === formData.item_id)?.stock_available || 1}
                  value={formData.quantity}
                  onChange={(event) => handleQuantityChange(formData.item_id, event.target.value)}
                  className="mt-1.5"
                />
              </div>
            </>
          )}

          <div className="border-t pt-4 sm:col-span-2">
            <StudentTagsField
              tags={studentTags}
              onChange={setStudentTags}
              minTags={0}
              description="Optional: tag up to 3 students who may return the equipment."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || clinicalInstructors.length === 0 || selectableItems.length === 0}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? "Recording..." : isBulkMode ? "Record All Borrows" : "Record Borrow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
