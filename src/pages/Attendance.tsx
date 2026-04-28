import { useState } from "react";
import { Clock, Calendar, LogIn, LogOut as LogOutIcon, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAttendance } from "@/hooks/useAttendance";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function getInitials(name: string): string {
  return name.split(/\s+/).map(word => word[0]).join("").toUpperCase();
}

export function formatDuration(timeIn: string, timeOut: string | null): string {
  if (!timeOut) return "—";

  const [inH, inM] = timeIn.split(":").map(Number);
  const [outH, outM] = timeOut.split(":").map(Number);
  const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);

  if (totalMinutes < 0) return "—";
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export default function Attendance() {
  const { attendance, loading, clockIn, clockOut } = useAttendance();
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const filtered = attendance;

  const todayRecord = attendance.find(
    (r) => r.user_id === user?.id && 
    r.date === new Date().toISOString().split('T')[0] &&
    !r.time_out
  );

  const handleClockIn = async () => {
    try {
      await clockIn();
      toast.success("Clocked in successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to clock in");
    }
  };

  const handleClockOut = async () => {
    if (!todayRecord) return;
    try {
      await clockOut(todayRecord.id);
      toast.success("Clocked out successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to clock out");
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
          <h1 className="text-2xl font-bold">Attendance Tracking</h1>
          <p className="text-muted-foreground mt-1">Student Assistant time logs</p>
        </div>
        {user?.role === "sa" && (
          <div className="flex gap-2">
            <Button onClick={handleClockIn} disabled={!!todayRecord}>
              <LogIn className="h-4 w-4 mr-2" />
              Clock In
            </Button>
            <Button variant="outline" onClick={handleClockOut} disabled={!todayRecord}>
              <LogOutIcon className="h-4 w-4 mr-2" />
              Clock Out
            </Button>
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg border overflow-hidden animate-slide-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        <div className="p-5 border-b">
          <h2 className="font-semibold">Attendance Records</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Student Assistant</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Time In</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Time Out</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Duration</th>
              <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((record) => (
              <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {record.user_profiles?.name ? getInitials(record.user_profiles.name) : "SA"}
                    </div>
                    <span className="font-medium">{record.user_profiles?.name ?? "Student Assistant"}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{record.date}</td>
                <td className="px-6 py-4 text-sm">{record.time_in}</td>
                <td className="px-6 py-4 text-sm">{record.time_out || "—"}</td>
                <td className="px-6 py-4 text-sm">{formatDuration(record.time_in, record.time_out)}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${record.time_out ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    {record.time_out ? "Complete" : "Active"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Clock className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">No attendance records</p>
            <p className="text-sm mt-1">Clock in to start tracking</p>
          </div>
        )}
      </div>
    </div>
  );
}
