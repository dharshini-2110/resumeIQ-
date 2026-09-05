import { ArrowRight, BriefcaseBusiness, CheckCircle2, CircleDashed, Compass, FileUp, Github, Mic, Radar, Rocket, ScanSearch, ShieldCheck, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { calculateInterviewSignal, calculateMomentumSignal, calculateReadiness, clampReadinessScore } from "@/lib/mnc-readiness";

function scoreLabel(score: number | null) {
  if (score === null) return "Waiting for your first signal";
  if (score >= 80) return "MNC-ready signal";
  if (score >= 60) return "Building a strong signal";
  return "Early signal — your next action is clear";
}

function signalValue(value: number | null) {
  return value === null ? "—" : `${value}`;
}

const toneClasses: Record<string, { icon: string; background: string; fill: string }> = {
  cyan: { icon: "text-cyan", background: "bg-cyan/15", fill: "bg-cyan" },
  violet: { icon: "text-violet", background: "bg-violet/15", fill: "bg-violet" },
  pink: { icon: "text-pink", background: "bg-pink/15", fill: "bg-pink" },
};

export default function MNCCareerLaunch() {
  const [, setLocation] = useLocation();
  const onboarding = trpc.onboarding.get.useQuery();
  const resumes = trpc.resumeVersions.list.useQuery();
  const ats = trpc.ats.history.useQuery();
  const jobFit = trpc.jobFit.history.useQuery();
  const github = trpc.github.history.useQuery();
  const interviews = trpc.interview.getSessions.useQuery();
  const applications = trpc.applications.list.useQuery();
  const progress = trpc.progress.get.useQuery();

  const latestAts = ats.data?.[0];
  const latestFit = jobFit.data?.[0];
  const latestGithub = github.data?.[0];
  const completedInterviews = interviews.data?.filter((session) => session.sessionState === "completed").length ?? 0;
  const appliedRoles = applications.data?.filter((application) => ["applied", "interview", "offer"].includes(application.status)).length ?? 0;
  const targetRole = onboarding.data?.targetRole || "your target role";
  const signals = [
    { label: "Resume signal", value: clampReadinessScore(latestAts?.atsScore), icon: FileUp, tone: "cyan" },
    { label: "Role alignment", value: clampReadinessScore(latestFit?.matchScore), icon: Target, tone: "violet" },
    { label: "Project proof", value: clampReadinessScore(latestGithub?.score), icon: Github, tone: "pink" },
    { label: "Interview muscle", value: calculateInterviewSignal(completedInterviews), icon: Mic, tone: "cyan" },
    { label: "Momentum", value: calculateMomentumSignal(progress.data?.currentStreak), icon: Zap, tone: "violet" },
  ];
  const readiness = calculateReadiness(signals.map((signal) => signal.value));
  const loading = [onboarding, resumes, ats, jobFit, github, interviews, applications, progress].some((query) => query.isLoading);

  const actions = [
    !resumes.data?.length ? { icon: FileUp, title: "Upload your PowerPoint resume", detail: "Start with a .pptx so every signal is grounded in your real profile.", path: "/onboarding", tone: "cyan" } : null,
    !ats.data?.length ? { icon: ScanSearch, title: "Run your first ATS scan", detail: "Find the keywords and structure MNC screening systems may miss.", path: "/ats-scanner", tone: "violet" } : null,
    !jobFit.data?.length ? { icon: Target, title: "Calibrate against a target role", detail: "Paste one real job description and turn the role into a skill checklist.", path: "/job-fit", tone: "pink" } : null,
    !completedInterviews ? { icon: Mic, title: "Complete an interview sprint", detail: "Practice the behavioral and role-specific questions hiring panels ask.", path: "/mock-interview", tone: "cyan" } : null,
    !github.data?.length ? { icon: Github, title: "Create your project proof layer", detail: "Analyze your public portfolio and surface the strongest evidence of impact.", path: "/github-analyzer", tone: "violet" } : null,
  ].filter(Boolean).slice(0, 3) as Array<{ icon: typeof FileUp; title: string; detail: string; path: string; tone: string }>;

  const stages = [
    { label: "Signal", detail: "Resume + ATS", complete: Boolean(resumes.data?.length && ats.data?.length), path: "/ats-scanner" },
    { label: "Fit", detail: "Role alignment", complete: Boolean(jobFit.data?.length), path: "/job-fit" },
    { label: "Proof", detail: "Projects + stories", complete: Boolean(github.data?.length), path: "/github-analyzer" },
    { label: "Perform", detail: "Interview sprint", complete: completedInterviews > 0, path: "/mock-interview" },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/15 via-background to-violet/15 p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-pink/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2"><Badge className="border-primary/20 bg-primary/10 text-primary">MNC Career Launch</Badge><Badge variant="outline" className="border-violet/30 text-violet">Personal command center</Badge></div>
            <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl"><span className="text-gradient-full">Turn preparation into a high-signal profile.</span></h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">A transparent readiness cockpit for <strong className="text-foreground">{targetRole}</strong>. Build the resume signal, role fit, project proof, and interview confidence that competitive hiring loops look for.</p>
            <div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => setLocation(actions[0]?.path || "/ats-scanner")} className="bg-primary text-primary-foreground">{actions[0] ? "Take my next action" : "Keep building momentum"}<ArrowRight className="ml-2 h-4 w-4" /></Button><Button variant="outline" onClick={() => setLocation("/applications")} className="border-primary/20 bg-background/20"><BriefcaseBusiness className="mr-2 h-4 w-4" />Track applications</Button></div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-background/40 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Readiness index</span><Radar className="h-5 w-5 text-primary" /></div>
            <div className="mt-5 flex items-end gap-2"><span className="text-6xl font-bold text-gradient-full">{loading ? "…" : signalValue(readiness)}</span><span className="pb-2 text-sm text-muted-foreground">/ 100</span></div>
            <p className="mt-2 text-sm font-medium text-foreground">{loading ? "Calculating your signals" : scoreLabel(readiness)}</p>
            <Progress value={readiness ?? 0} className="mt-5 h-2 bg-accent/40" />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">This is a progress signal based on your activity, not a hiring or salary guarantee.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {signals.map((signal) => { const tone = toneClasses[signal.tone] ?? toneClasses.cyan; return <Card key={signal.label} className="glass-card border-0"><CardContent className="p-4"><div className="flex items-center justify-between"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone.background}`}><signal.icon className={`h-4 w-4 ${tone.icon}`} /></div><span className="text-2xl font-bold">{loading ? "…" : signalValue(signal.value)}</span></div><p className="mt-3 text-xs text-muted-foreground">{signal.label}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent/40"><div className={`h-full rounded-full ${tone.fill}`} style={{ width: `${signal.value ?? 0}%` }} /></div></CardContent></Card>; })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="glass-card border-0"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Compass className="h-5 w-5 text-primary" />Your MNC signal path</CardTitle><p className="mt-1 text-sm text-muted-foreground">Four proof layers turn preparation into evidence.</p></div><Badge variant="outline" className="border-primary/20">{stages.filter((stage) => stage.complete).length}/4 complete</Badge></div></CardHeader><CardContent><div className="relative grid gap-3 sm:grid-cols-4">{stages.map((stage, index) => <button key={stage.label} onClick={() => setLocation(stage.path)} className="group relative rounded-2xl border border-border bg-background/20 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">0{index + 1}</span>{stage.complete ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" />}</div><p className="mt-5 font-semibold">{stage.label}</p><p className="mt-1 text-xs text-muted-foreground">{stage.detail}</p><ArrowRight className="mt-4 h-4 w-4 text-primary opacity-0 transition group-hover:opacity-100" />{index < stages.length - 1 && <span className="absolute -right-3 top-1/2 hidden h-px w-3 bg-primary/30 sm:block" />}</button>)}</div></CardContent></Card>

        <Card className="glass-card border-0"><CardHeader><CardTitle className="flex items-center gap-2"><Rocket className="h-5 w-5 text-pink" />Next-best actions</CardTitle><p className="text-sm text-muted-foreground">The shortest path to your next meaningful signal.</p></CardHeader><CardContent className="space-y-3">{actions.length ? actions.map((action) => { const tone = toneClasses[action.tone] ?? toneClasses.cyan; return <button key={action.title} onClick={() => setLocation(action.path)} className="group flex w-full items-start gap-3 rounded-2xl border border-border bg-background/20 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.background}`}><action.icon className={`h-4 w-4 ${tone.icon}`} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{action.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{action.detail}</span></span><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary opacity-0 transition group-hover:opacity-100" /></button>; }) : <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4"><ShieldCheck className="h-5 w-5 text-emerald-400" /><p className="mt-3 font-semibold">Your core signal stack is active.</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Keep applying, review your latest job-fit gaps, and protect your streak with one focused practice block today.</p><Button variant="outline" onClick={() => setLocation("/applications")} className="mt-4 border-emerald-400/20">Open application pipeline</Button></div>}</CardContent></Card>
      </div>

      <Card className="glass-card border-0"><CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet/15"><Trophy className="h-5 w-5 text-violet" /></div><div><p className="font-semibold">Your progress compounds</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{appliedRoles ? `${appliedRoles} active role${appliedRoles === 1 ? "" : "s"} in your pipeline.` : "Save your first target role to connect preparation with real applications."} {progress.data?.totalXP ? `${progress.data.totalXP} XP earned so far.` : "Every completed action earns momentum."}</p></div></div><Button variant="outline" onClick={() => setLocation("/gamification")} className="shrink-0 border-violet/20"><Sparkles className="mr-2 h-4 w-4" />View momentum</Button></CardContent></Card>
    </div>
  );
}
