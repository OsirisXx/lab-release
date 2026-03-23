import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Check, X } from "lucide-react";
import { useReservations } from "@/hooks/useReservations";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function Reservations() {
  const { reservations, loading, createReservation, approveReservation, rejectReservation } = useReservations();
  const { items } = useInventory();
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    item_id: "",
    start_date: "",
    end_date: "",
    quantity: 1,
  });

  const handleApprove = async (id: string) => {
    try {
      await approveReservation(id);
      toast.success("Reservation approved");
    } catch (error: any) {
      toast.error(error.message || "Failed to approve");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectReservation(id);
      toast.success("Reservation rejected");
    } catch (error: any) {
      toast.error(error.message || "Failed to reject");
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.item_id || !formData.start_date || !formData.end_date) {
        toast.error("Please fill in all fields");
        return;
      }
      await createReservation(formData.item_id, formData.start_date, formData.end_date, formData.quantity);
      toast.success("Reservation created successfully");
      setIsDialogOpen(false);
      setFormData({ item_id: "", start_date: "", end_date: "", quantity: 1 });
    } catch (error: any) {
      toast.error(error.message || "Failed to create reservation");
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
          <h1 className="text-2xl font-bold">Reservations</h1>
          <p className="text-muted-foreground mt-1">Schedule and manage item reservations</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Reservation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border p-4 animate-slide-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
          <Calendar mode="single" selected={date} onSelect={setDate} className="pointer-events-auto" />
        </div>

        <div className="lg:col-span-2 bg-card rounded-lg border animate-slide-up" style={{ animationDelay: "120ms", animationFillMode: "both" }}>
          <div className="p-5 border-b">
            <h2 className="font-semibold">Upcoming Reservations</h2>
          </div>
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
                    <p className="font-medium text-sm">Item Reserved</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Qty: {r.quantity}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(r.start_date).toLocaleDateString()} → {new Date(r.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    {r.status === "pending" && user?.role === "sa" && (
                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0 text-success hover:text-success hover:bg-success/10" 
                          onClick={() => handleApprove(r.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" 
                          onClick={() => handleReject(r.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Reservation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Reservation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date || new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Create Reservation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
