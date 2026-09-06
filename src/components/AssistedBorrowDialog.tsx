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
import type { StudentTagInput, Transaction } from "@/hooks/useTransactions";
import { toast } from "sonner";

interface AssistedBorrowDialogProps {
  createBorrowForCI: (
    itemId: string,
    quantity: number,
    borrowerId: string,
    studentTags: StudentTagInput[],
  ) => Promise<Transaction>;
  refetchTransactions: () => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  itemOptions?: InventoryItem[];
  initialItemId?: string;
  trigger?: ReactNode;
  title?: string;
  description?: string;
  onSuccess?: (transaction: Transaction) => void | Promise<void>;
}

const EMPTY_TAGS: StudentTagInput[] = [];
const EMPTY_FORM = { item_id: "", borrower_id: "", quantity: 1 };
const DEFAULT_TITLE = "Borrow for Clinical Instructor";
const DEFAULT_DESCRIPTION = "Record the equipment requested by a registered Clinical Instructor. The borrow becomes active immediately and available stock is deducted.";

export function AssistedBorrowDialog({
  createBorrowForCI,
  refetchTransactions,
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

  const dialogOpen = open ?? isOpen;
  const selectableItems = (itemOptions ?? items).filter((item) => item.stock_available > 0);

  const resetForm = () => {
    setStudentTags([]);
    setFormData({ ...EMPTY_FORM });
  };

  useEffect(() => {
    if (!dialogOpen) return;

    const options = (itemOptions ?? items).filter((item) => item.stock_available > 0);
    const initialItem = initialItemId && options.some((item) => item.id === initialItemId)
      ? initialItemId
      : "";

    setFormData((current) => current.item_id ? current : { ...current, item_id: initialItem });
  }, [dialogOpen, initialItemId, itemOptions, items]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    if (open === undefined) setIsOpen(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleSubmit = async () => {
    const selectedItem = selectableItems.find((item) => item.id === formData.item_id);
    const selectedBorrower = clinicalInstructors.find((candidate) => candidate.id === formData.borrower_id);

    if (!selectedBorrower || !selectedItem) {
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

    try {
      setIsSubmitting(true);
      const transaction = await createBorrowForCI(
        formData.item_id,
        formData.quantity,
        formData.borrower_id,
        studentTags,
      );
      await refetchTransactions();
      await onSuccess?.(transaction);
      toast.success(`Borrow recorded for ${selectedBorrower.name}`);
      handleOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to record assisted borrow");
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

          <div>
            <Label htmlFor="assisted-item">Item</Label>
            <select
              id="assisted-item"
              value={formData.item_id}
              onChange={(event) => setFormData({ ...formData, item_id: event.target.value })}
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
              onChange={(event) => setFormData({ ...formData, quantity: Number.parseInt(event.target.value, 10) || 1 })}
              className="mt-1.5"
            />
          </div>

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
            {isSubmitting ? "Recording..." : "Record Borrow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
