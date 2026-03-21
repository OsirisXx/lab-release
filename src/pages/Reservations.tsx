import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { mockTransactions } from "@/lib/mock-data";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Reservations() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const reservations = mockTransactions.filter((t) => t.type === "reserve");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reservations</h1>
          <p className="text-muted-foreground mt-1">Schedule and manage item reservations</p>
        </div>
        <Button>
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
                  <div>
                    <p className="font-medium text-sm">{r.itemName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.userName} · Qty: {r.quantity}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-xs tabular-nums text-muted-foreground">{r.borrowDate} → {r.dueDate}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
