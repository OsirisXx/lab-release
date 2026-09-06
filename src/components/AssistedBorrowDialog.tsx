import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudentTagsField } from "@/components/StudentTagsField";
import { useAuth } from "@/contexts/AuthContext";
import { useInventory } from "@/hooks/useInventory";
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
}

const EMPTY_TAGS: StudentTagInput[] = [];
const EMPTY_FORM = { item_id: "", borrower_id: "", quantity: 1 };

export function AssistedBorrowDialog({ createBorrowForCI, refetchTransactions }: AssistedBorrowDialogProps) {
  const { user } = useAuth();
  const { clinicalInstructors, error: usersError } = useUsers();
  const { items, error: inventoryError } = useInventory();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentTags, setStudentTags] = useState<StudentTagInput[]>(EMPTY_TAGS);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const resetForm = () => {
    setStudentTags([]);
    setFormData({ ...EMPTY_FORM });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  const handleSubmit = async () => {
    const selectedItem = items.find((item) => item.id === formData.item_id);
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
      await createBorrowForCI(
        formData.item_id,
        formData.quantity,
        formData.borrower_id,
        studentTags,
      );
      await refetchTransactions();
      toast.success(`Borrow recorded for ${selectedBorrower.name}`);
      handleOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to record assisted borrow");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.role !== "sa") return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" />
        Borrow for CI
      </Button>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Borrow for Clinical Instructor</DialogTitle>
          <DialogDescription>
            Record the equipment requested by a registered Clinical Instructor. The borrow becomes active immediately and available stock is deducted.
          </DialogDescription>
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
              {items.filter((item) => item.stock_available > 0).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {item.stock_available} {item.unit} available
                </option>
              ))}
            </select>
            {inventoryError && <p className="mt-1.5 text-xs text-destructive">Unable to load inventory: {inventoryError}</p>}
          </div>

          <div>
            <Label htmlFor="assisted-quantity">Quantity</Label>
            <Input
              id="assisted-quantity"
              type="number"
              min={1}
              max={items.find((item) => item.id === formData.item_id)?.stock_available || 1}
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
          <Button onClick={handleSubmit} disabled={isSubmitting || clinicalInstructors.length === 0}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? "Recording..." : "Record Borrow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
