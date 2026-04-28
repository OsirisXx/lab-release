import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FlaskConical, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();

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
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
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
      await signUp(email, password, name, role);
      toast.success(`Account created! ${role === "ci" ? "Your CI ID will be assigned." : ""}`);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
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
            <div className="flex-1">
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

          <p className="text-xs text-center text-muted-foreground mt-6">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button type="button" className="text-primary font-medium hover:underline" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
