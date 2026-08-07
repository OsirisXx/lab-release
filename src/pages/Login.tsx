import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FlaskConical, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, requestPasswordReset, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"ci" | "sa">("ci");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || !password) {
      toast.error("Please enter a valid email and password");
      return;
    }

    setLoading(true);
    try {
      await signIn(normalizedEmail, password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim(), role);
      toast.success(`Account created! ${role === "ci" ? "Your CI ID will be assigned." : ""}`);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(normalizedEmail);
      setResetSent(true);
      toast.success("If an account exists for that email, a reset link has been sent.");
    } catch (error: any) {
      toast.error(error.message || "Unable to send the password reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar items-center justify-center p-12">
        <div className="max-w-md animate-fade-in">
          <div className="flex items-center gap-4 mb-8">
            <img src="/logo/schoollogo.png" alt="School Logo" className="h-16 w-16 object-contain" />
            <div className="flex-1 text-center">
              <h1 className="text-xl font-bold text-sidebar-foreground">NUF - CHS Inventory</h1>
            </div>
            <img src="/logo/departmentlogo.png" alt="Department Logo" className="h-16 w-16 object-contain" />
          </div>
          <h2 className="text-3xl font-bold text-sidebar-foreground leading-tight" style={{ lineHeight: "1.15" }}>
            Manage your laboratory inventory with confidence
          </h2>
          <p className="text-sidebar-foreground/60 mt-4 leading-relaxed">
            Track equipment, manage borrowing requests, and maintain complete audit trails — all in one place. Built for the College of Health and Sciences.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { label: "Items Tracked", value: "500+" },
              { label: "Active Users", value: "120" },
              { label: "Transactions/mo", value: "1,847" },
              { label: "Locations", value: "12" },
            ].map((stat) => (
              <div key={stat.label} className="bg-sidebar-accent rounded-lg p-4">
                <p className="text-lg font-bold text-sidebar-foreground tabular-nums">{stat.value}</p>
                <p className="text-xs text-sidebar-foreground/50 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/logo/schoollogo.png" alt="School Logo" className="h-10 w-10 object-contain" />
            <span className="text-lg font-bold">NUF - CHS Inventory</span>
            <img src="/logo/departmentlogo.png" alt="Department Logo" className="h-10 w-10 object-contain" />
          </div>

          {isForgotPassword ? (
            <>
              <h2 className="text-2xl font-bold">Forgot your password?</h2>
              <p className="text-muted-foreground mt-1 mb-8">Enter your email and we’ll send you a secure password reset link.</p>
              {resetSent ? (
                <div className="space-y-4">
                  <div className="rounded-md border border-success/30 bg-success/10 p-4 text-sm text-success">
                    If an account exists for <strong>{email.trim().toLowerCase()}</strong>, a reset link has been sent. Please check your inbox and spam folder.
                  </div>
                  <Button type="button" variant="outline" className="w-full" onClick={() => { setIsForgotPassword(false); setResetSent(false); }}>
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required autoFocus />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">Use the email address registered in the laboratory system.</p>
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending reset link...</> : "Send Reset Link"}
                  </Button>
                </form>
              )}
              {!resetSent && (
                <p className="text-xs text-center text-muted-foreground mt-6">
                  Remember your password?{" "}
                  <button type="button" className="text-primary font-medium hover:underline" onClick={() => setIsForgotPassword(false)}>
                    Back to Sign In
                  </button>
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{isSignUp ? "Create Account" : "Welcome back"}</h2>
              <p className="text-muted-foreground mt-1 mb-8">{isSignUp ? "Register with your university email" : "Sign in with your university Gmail"}</p>

              <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                    <Input type="text" placeholder="Juan Dela Cruz" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Password</label>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {isSignUp && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Role</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRole("ci")}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          role === "ci" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        Clinical Instructor
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("sa")}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          role === "sa" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        Student Assistant
                      </button>
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isSignUp ? "Creating Account..." : "Signing In..."}
                    </>
                  ) : (
                    isSignUp ? "Create Account" : "Sign In"
                  )}
                </Button>
              </form>

              {!isSignUp && (
                <div className="mt-3 text-right">
                  <button type="button" className="text-sm text-primary font-medium hover:underline" onClick={() => { setIsForgotPassword(true); setResetSent(false); }}>
                    Forgot password?
                  </button>
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground mt-6">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button type="button" className="text-primary font-medium hover:underline" onClick={() => setIsSignUp(!isSignUp)}>
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
