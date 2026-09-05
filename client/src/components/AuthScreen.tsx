import { useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => window.location.reload(),
    onError: error => {
      const message = error.message || "Unable to sign in.";
      setErrorMessage(message);
      toast.error(message);
    },
  });
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => window.location.reload(),
    onError: error => {
      const message = error.message || "Unable to create your account.";
      setErrorMessage(message);
      toast.error(message);
    },
  });

  const isPending = loginMutation.isPending || registerMutation.isPending;
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    if (mode === "register" && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (mode === "register") {
      registerMutation.mutate({ email, password });
    } else {
      loginMutation.mutate({ email, password });
    }
  };

  return (
    <div className="min-h-screen aurora-bg intelligence-grid relative overflow-hidden px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_440px]">
        <section className="hidden space-y-7 lg:block">
          <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl aurora-gradient shadow-lg aurora-glow-cyan"><Zap className="h-4 w-4 text-white" /></span>
            <span>ResumeIQ <span className="text-primary">Pro</span></span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Career intelligence cockpit
          </div>
          <div className="max-w-xl space-y-4">
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-foreground xl:text-6xl">
              Turn your next opportunity into a <span className="text-gradient-full">clearer plan.</span>
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              One focused workspace for resume signals, interview confidence, portfolio proof, and the next best career move.
            </p>
          </div>
          <div className="grid max-w-xl grid-cols-3 gap-3">
            {[
              ["01", "Scan", "Find resume gaps"],
              ["02", "Practice", "Build confidence"],
              ["03", "Move", "Track momentum"],
            ].map(([number, title, description]) => (
              <div key={number} className="glass-card glass-card-hover panel-sheen border-0 p-4">
                <div className="mb-3 text-xs font-bold text-primary">{number}</div>
                <div className="font-semibold text-foreground">{title}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card panel-sheen relative mx-auto w-full max-w-md border-white/10 p-6 shadow-2xl shadow-primary/10 sm:p-8">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl aurora-gradient shadow-lg aurora-glow-cyan">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-gradient-full">ResumeIQ Pro</div>
              <div className="text-xs text-muted-foreground">Your career, with signal.</div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-xl bg-background/50 p-1">
            {(["login", "register"] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setMode(tab)}
                aria-pressed={mode === tab}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === tab ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
              >
                {tab === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div className="mb-6 space-y-1">
            <h2 className="text-2xl font-bold text-foreground">{mode === "login" ? "Welcome back" : "Start your journey"}</h2>
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? "Sign in with the email and password for your ResumeIQ Pro account." : "Create a private workspace for your career goals."}
            </p>
          </div>

          {errorMessage && (
            <div role="alert" className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm leading-5 text-rose-100">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                <span>{errorMessage}</span>
              </div>

            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="auth-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 8 : 1} value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === "register" ? "At least 8 characters" : "Your password"} className="pl-10 pr-10" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="auth-confirm-password">Confirm password</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="auth-confirm-password" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repeat your password" className="pl-10 pr-10" />
                  <button type="button" aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} onClick={() => setShowConfirmPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <Button type="submit" disabled={isPending} className="h-11 w-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              {isPending ? "Please wait…" : mode === "login" ? "Sign in securely" : "Create my account"}
              {!isPending && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> Passwords are protected with one-way hashing and are never shown in the app.
          </div>
        </section>
      </div>
    </div>
  );
}
