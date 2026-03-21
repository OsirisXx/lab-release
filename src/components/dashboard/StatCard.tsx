import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "primary" | "warning" | "destructive";
  delay?: number;
}

const variantStyles = {
  default: "bg-card border",
  primary: "bg-primary/5 border border-primary/15",
  warning: "bg-warning/5 border border-warning/15",
  destructive: "bg-destructive/5 border border-destructive/15",
};

const iconVariants = {
  default: "bg-muted text-foreground",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default", delay = 0 }: StatCardProps) {
  return (
    <div
      className={cn("rounded-lg p-5 animate-slide-up", variantStyles[variant])}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {trend && (
            <p className={cn("text-xs font-medium mt-2", trend.positive ? "text-success" : "text-destructive")}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconVariants[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
