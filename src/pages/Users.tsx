import { useState } from "react";
import { Search, Mail, UserCheck, UserX, Loader2, Shield, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Users() {
  const { users, loading, deleteUser } = useUsers();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ciUsers = filtered.filter((u) => u.role === "ci");
  const saUsers = filtered.filter((u) => u.role === "sa");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage Clinical Instructors and Student Assistants</p>
        </div>
      </div>

      <div className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, or CI ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["all", "ci", "sa"] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                roleFilter === role ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {role === "all" ? "All" : role === "ci" ? "Clinical Instructors" : "Student Assistants"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border overflow-hidden animate-slide-up" style={{ animationDelay: "120ms", animationFillMode: "both" }}>
          <div className="p-5 border-b bg-muted/50">
            <h2 className="font-semibold flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Clinical Instructors ({ciUsers.length})
            </h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <tbody>
                {ciUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {user.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Shield className={`h-4 w-4 ${user.role === "sa" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-sm capitalize">{user.role === "sa" ? "Student Assistant" : "Clinical Instructor"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{user.ci_id || "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                        {currentUser?.role === "sa" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUserToDelete({ id: user.id, name: user.name })}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ciUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <UserX className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No clinical instructors found</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg border overflow-hidden animate-slide-up" style={{ animationDelay: "180ms", animationFillMode: "both" }}>
          <div className="p-5 border-b bg-muted/50">
            <h2 className="font-semibold flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Student Assistants ({saUsers.length})
            </h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {saUsers.map((user) => (
              <div key={user.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-sm font-bold">
                      {user.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <p className="text-xs font-medium text-secondary-foreground mt-1">ID: {user.id}</p>
                    </div>
                  </div>
                  {currentUser?.role === "sa" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUserToDelete({ id: user.id, name: user.name })}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {saUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <UserX className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No student assistants found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
              All related data (transactions, attendance records) will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!userToDelete) return;
                setIsDeleting(true);
                try {
                  await deleteUser(userToDelete.id);
                  toast.success(`User ${userToDelete.name} deleted successfully`);
                  setUserToDelete(null);
                } catch (error: any) {
                  toast.error(error.message || "Failed to delete user");
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
