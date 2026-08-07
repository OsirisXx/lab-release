import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, signOut } = useAuth();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setHasRecoverySession(Boolean(data.session));
        setCheckingSession(false);
      }
    };

    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Your new password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("The passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      await signOut();
      setUpdated(true);
      toast.success("Password updated successfully");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to update your password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 flex items-center justify-center gap-3">
          <img src="/logo/schoollogo.png" alt="School Logo" className="h-12 w-12 object-contain" />
          <span className="text-lg font-bold">NUF - CHS Inventory</span>
          <img src="/logo/departmentlogo.png" alt="Department Logo" className="h-12 w-12 object-contain" />
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          {checkingSession ? (
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin" />
              <p className="text-sm">Verifying your reset link...</p>
            </div>
          ) : updated ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Password updated</h1>
                <p className="mt-2 text-sm text-muted-foreground">Your password has been changed successfully. You can now sign in with your new password.</p>
              </div>
              <Button className="w-full" onClick={() => navigate("/login", { replace: true })}>
                Return to Sign In
              </Button>
            </div>
          ) : !hasRecoverySession ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Reset link unavailable</h1>
                <p className="mt-2 text-sm text-muted-foreground">This link may have expired or already been used. Request a new password reset email to continue.</p>
              </div>
              <Button className="w-full" onClick={() => navigate("/login", { replace: true })}>
                Request a New Link
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold">Create a new password</h1>
                <p className="mt-2 text-sm text-muted-foreground">Choose a secure password for your NUF - CHS Inventory account.</p>
              </div>
              <div>
                <label htmlFor="new-password" className="text-sm font-medium">New password</label>
                <Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="mt-1.5" autoComplete="new-password" required />
              </div>
              <div>
                <label htmlFor="confirm-password" className="text-sm font-medium">Confirm new password</label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your new password" className="mt-1.5" autoComplete="new-password" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating password...</> : "Update Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
