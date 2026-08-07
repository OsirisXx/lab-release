import { Navigate } from "react-router-dom";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, X, Ban } from "lucide-react";
import { addCalendarDays, getApplicationDate } from "@/lib/date-utils";
import { useReservations } from "@/hooks/useReservations";
import { useUsers } from "@/hooks/useUsers";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StudentTagsField } from "@/components/StudentTagsField";
import type { StudentTagInput } from "@/hooks/useTransactions";

function getReservationDates(startDate: string, endDate: string): Date[] {
  const dates: Date[] = [];
  const current = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  while (current <= end && dates.length < 366) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export default function Reservations() {
  const {
    reservations,
    loading,
    error: reservationError,
    createReservation,
    rejectReservation,
    cancelReservation,
  } = useReservations();
  const { clinicalInstructors, error: usersError } = useUsers();
  const { items } = useInventory();
  const { user } = useAuth();
  const minimumReservationDate = addCalendarDays(getApplicationDate(), 2);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [studentTags, setStudentTags] = useState<StudentTagInput[]>([{ name: "", student_number: "" }]);
  const [formData, setFormData] = useState({
    item_id: "",
    borrower_id: "",
    start_date: "",
    end_date: "",
    quantity: 1,
  });

  const handleReject = async (id: string) => {
    try {
      await rejectReservation(id);
      toast.success("Reservation rejected and held stock released");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to reject");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelReservation(id);
      toast.success("Reservation cancelled and held stock released");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel");
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.item_id || !formData.borrower_id || !formData.start_date || !formData.end_date) {
        toast.error("Please select an item, registered Clinical Instructor, and reservation dates");
        return;
      }
      if (formData.start_date < minimumReservationDate) {
        toast.error(`Reservations must start on or after ${minimumReservationDate}`);
        return;
      }
      if (formData.end_date < formData.start_date) {
        toast.error("Reservation end date cannot be before the start date");
        return;
      }
      const selectedItem = items.find((item) => item.id === formData.item_id);
      if (!selectedItem) {
        toast.error("Selected inventory item could not be found");
        return;
      }
      if (formData.quantity > selectedItem.stock_available) {
        toast.error(`Only ${selectedItem.stock_available} unit(s) of ${selectedItem.name} are available`);
        return;
      }
      await createReservation(
        formData.item_id,
        formData.start_date,
        formData.end_date,
        formData.quantity,
        formData.borrower_id,
        studentTags,
      );
      toast.success("Reservation created for the Clinical Instructor; stock held immediately");
      setIsDialogOpen(false);
      setStudentTags([{ name: "", student_number: "" }]);
      setFormData({ item_id: "", borrower_id: "", start_date: "", end_date: "", quantity: 1 });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create reservation");
    }
  };

  const reservedDates = reservations.flatMap((reservation) =>
    getReservationDates(reservation.start_date, reservation.end_date),
  );

  if (user?.role === "ci") {
    return <Navigate to="/transactions" replace />;
  }

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
          <h1 className="text-2xl font-bold">Reservations</h1>
          <p className="text-muted-foreground mt-1">Create reservations for registered Clinical Instructors; held stock is unavailable immediately.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Reservation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border p-4 animate-slide-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            modifiers={{ reserved: reservedDates }}
            modifiersClassNames={{ reserved: "bg-primary/20 text-primary font-semibold" }}
            className="pointer-events-auto"
          />
          <div className="flex items-center gap-2 px-3 pb-2 text-xs text-muted-foreground">
            <span className="h-3 w-3 rounded-sm bg-primary/20" />
            Reserved period
          </div>
        </div>

        <div className="lg:col-span-2 bg-card rounded-lg border animate-slide-up" style={{ animationDelay: "120ms", animationFillMode: "both" }}>
          <div className="p-5 border-b">
            <h2 className="font-semibold">Upcoming Reservations</h2>
          </div>
          <ScrollArea className="h-[28rem] max-h-[70vh] sm:h-[36rem]">
            <div>
              {reservationError && (
                <div className="mx-5 mt-5 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Unable to load reservations: {reservationError}
                </div>
              )}
              <div className="divide-y">
                {reservations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p className="font-medium">No reservations</p>
                    <p className="text-sm mt-1">Create a reservation to get started</p>
                  </div>
                ) : (
                  reservations.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-5 py-4">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{r.inventory_items?.name || "Item Reserved"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Borrower: {r.user_profiles?.name || "Registered CI"}
                          {r.user_profiles?.ci_id ? ` (${r.user_profiles.ci_id})` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Qty: {r.quantity} · {r.stock_held_quantity > 0 ? `${r.stock_held_quantity} held` : "No stock held"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.start_date} → {r.end_date}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Students: {r.reservation_student_tags?.map((tag) => tag.student_name).join(", ") || "—"}
                        </p>
                        {r.issued_transaction_id && (
                          <p className="text-xs text-success mt-0.5">Automatically issued on the reservation start date</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={r.status} />
                        {r.status === "pending" && user?.role === "sa" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleReject(r.id)}
                            title="Reject reservation and release stock"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {(["pending", "approved"] as const).includes(r.status) && user?.role === "sa" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => handleCancel(r.id)}
                            title="Cancel reservation and release stock"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* New Reservation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Reservation</DialogTitle>
            <DialogDescription>
              Choose a registered Clinical Instructor, item, and dates at least two calendar days ahead. Stock is held immediately and the reservation will appear in the selected CI's Transactions page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="borrower">Clinical Instructor</Label>
              <select
                id="borrower"
                value={formData.borrower_id}
                onChange={(e) => setFormData({ ...formData, borrower_id: e.target.value })}
                className="w-full mt-1.5 px-3 py-2 rounded-md border bg-background"
              >
                <option value="">Select a registered CI...</option>
                {clinicalInstructors.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} {candidate.ci_id ? `(${candidate.ci_id})` : ""}
                  </option>
                ))}
              </select>
              {usersError && <p className="text-xs text-destructive mt-1.5">Unable to load CI profiles: {usersError}</p>}
              {!usersError && clinicalInstructors.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">No registered CI profiles were found.</p>
              )}
            </div>
            <div>
              <Label htmlFor="item">Item</Label>
              <select
                id="item"
                value={formData.item_id}
                onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                className="w-full mt-1.5 px-3 py-2 rounded-md border bg-background"
              >
                <option value="">Select an item...</option>
                {items.filter(i => i.stock_available > 0).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - Available: {item.stock_available} {item.unit}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                min={minimumReservationDate}
              />
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date || minimumReservationDate}
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={items.find((item) => item.id === formData.item_id)?.stock_available || 1}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            <StudentTagsField
              tags={studentTags}
              onChange={setStudentTags}
              description="The SA must tag 1 to 3 students accompanying the selected Clinical Instructor."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Create Reservation & Hold Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
