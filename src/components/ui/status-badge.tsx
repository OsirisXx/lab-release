import { cn } from "@/lib/utils";

export type Status = "pending" | "approved" | "returned" | "overdue" | "rejected" | "Good" | "Defective" | "Mixed" | "Expired" | "completed";

const statusStyles: Record<Status, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-info/10 text-info border-info/20",
  returned: "bg-success/10 text-success border-success/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  completed: "bg-success/10 text-success border-success/20",
  Good: "bg-success/10 text-success border-success/20",
  Defective: "bg-destructive/10 text-destructive border-destructive/20",
  Mixed: "bg-warning/10 text-warning border-warning/20",
  Expired: "bg-destructive/10 text-destructive border-destructive/20",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", statusStyles[status])}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
