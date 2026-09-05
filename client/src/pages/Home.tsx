import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import {
  ScanSearch,
  Target,
  Sparkles,
  MessageSquare,
  Map,
  FileDown,
  Zap,
  ArrowRight,
  TrendingUp,
  Shield,
  Rocket,
  Mic,
  Github,
  GitBranch,
  ArrowLeftRight,
  Trophy,
  BriefcaseBusiness,
  Radar,
} from "lucide-react";

const features = [
  {
    icon: Rocket,
    title: "MNC Launchpad",
    description: "See your readiness signals and the next action that builds the strongest hiring proof",
    path: "/launchpad",
    color: "pink",
  },
  {
    icon: ScanSearch,
    title: "ATS Scanner",
    description: "Detect formatting issues that break Applicant Tracking Systems",
    path: "/ats-scanner",
    color: "cyan",
  },
  {
    icon: Target,
    title: "Job-Fit Score",
    description: "Semantic matching against job descriptions with gap analysis",
    path: "/job-fit",
    color: "violet",
  },
  {
    icon: Sparkles,
    title: "Resume Rewriter",
    description: "AI-powered bullet point improvements with STAR format",
    path: "/resume-rewriter",
    color: "pink",
  },
  {
    icon: MessageSquare,
    title: "Career Coach",
    description: "Personalized AI career advice based on your profile",
    path: "/career-coach",
    color: "cyan",
  },
  {
    icon: Map,
    title: "Skill Gap Analysis",
    description: "Identify missing skills and get a step-by-step learning roadmap",
    path: "/skill-gap",
    color: "violet",
  },
  {
    icon: FileDown,
    title: "PDF Export",
    description: "Export branded career reports and optimized resumes",
    path: "/pdf-export",
    color: "pink",
  },
  {
    icon: Mic,
    title: "Mock Interview",
    description: "Practice realistic questions with AI feedback",
    path: "/mock-interview",
    color: "cyan",
  },
  {
    icon: Github,
    title: "GitHub Analyzer",
    description: "Turn public project signals into portfolio insights",
    path: "/github-analyzer",
    color: "violet",
  },
  {
    icon: GitBranch,
    title: "Career Paths",
    description: "Compare possible routes to your target role",
    path: "/career-paths",
    color: "pink",
  },
  {
    icon: ArrowLeftRight,
    title: "Resume Versions",
    description: "Compare saved resume drafts side-by-side",
    path: "/resume-versions",
    color: "cyan",
  },
  {
    icon: Trophy,
    title: "Career Momentum",
    description: "Track XP, badges, streaks, and real progress",
    path: "/gamification",
    color: "violet",
  },
  {
    icon: BriefcaseBusiness,
    title: "Applications",
    description: "Save roles, update statuses, and keep your pipeline moving",
    path: "/applications",
    color: "pink",
  },
];

const colorMap: Record<string, string> = {
  cyan: "text-cyan",
  violet: "text-violet",
  pink: "text-pink",
};

const iconBgMap: Record<string, string> = {
  cyan: "bg-cyan/15 border-cyan/20",
  violet: "bg-violet/15 border-violet/20",
  pink: "bg-pink/15 border-pink/20",
};

function StatsRow() {
  const atsQuery = trpc.ats.history.useQuery();
  const progressQuery = trpc.progress.get.useQuery();

  const analysisCount = atsQuery.data?.length ?? 0;
  const xp = progressQuery.data?.totalXP ?? 0;
  const streak = progressQuery.data?.currentStreak ?? 0;
  const loading = atsQuery.isLoading || progressQuery.isLoading;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="glass-card glass-card-hover border-0 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/20 animate-pulse" />
                <div className="flex-1">
                  <div className="h-6 w-12 rounded bg-accent/20 animate-pulse mb-1" />
                  <div className="h-3 w-24 rounded bg-accent/15 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      <Card className="glass-card glass-card-hover border-0 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analysisCount}</p>
              <p className="text-xs text-muted-foreground">Resume Analyses</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="glass-card glass-card-hover border-0 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet/15 flex items-center justify-center">
              <Shield className="h-5 w-5 text-violet" />
            </div>
            <div>
              <p className="text-2xl font-bold">{xp}</p>
              <p className="text-xs text-muted-foreground">XP Points</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="glass-card glass-card-hover col-span-2 border-0 overflow-hidden sm:col-span-1">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink/15 flex items-center justify-center">
              <Rocket className="h-5 w-5 text-pink" />
            </div>
            <div>
              <p className="text-2xl font-bold">{streak}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const onboardingQuery = trpc.onboarding.get.useQuery();
  const username = user?.email?.split("@")[0] || "there";

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl aurora-gradient flex items-center justify-center shadow-lg aurora-glow-cyan">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              <span className="text-gradient-full">Welcome back</span>
              {`, ${username}`}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Your AI-powered career intelligence dashboard
            </p>
          </div>
        </div>
      </div>

      {onboardingQuery.data && !onboardingQuery.data.completed && (
        <Card className="glass-card border-primary/20 overflow-hidden">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Personalize your cockpit</p>
              <h2 className="mt-1 text-lg font-semibold">Finish your quick setup</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">Choose a target role and your first tools. ResumeIQ Pro will use this context to make your next recommendations more useful.</p>
            </div>
            <Button onClick={() => setLocation("/onboarding")} className="shrink-0 bg-primary text-primary-foreground">Continue setup <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Signal brief */}
      <section className="glass-card panel-sheen relative overflow-hidden border-primary/15 p-5 sm:p-6">
        <div className="intelligence-grid absolute inset-0 opacity-50" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan/15 text-cyan shadow-[0_0_28px_oklch(0.85_0.18_195_/_0.16)]"><Radar className="h-6 w-6" /></div>
            <div>
              <p className="eyebrow">Signal brief</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Build the proof MNC hiring loops can verify.</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Resume quality is only one layer. Connect role fit, project evidence, interview practice, and consistent applications into one focused launch plan.</p>
            </div>
          </div>
          <Button onClick={() => setLocation("/launchpad")} className="btn-glow shrink-0 bg-primary text-primary-foreground"><Rocket className="mr-2 h-4 w-4" />Open Launchpad <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </section>

      {/* Stats Row */}
      <StatsRow />

      {/* Feature Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Career Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <button
              key={feature.path}
              onClick={() => setLocation(feature.path)}
              className="glass-card glass-card-hover p-5 text-left transition-all group"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${iconBgMap[feature.color]}`}>
                  <feature.icon className={`h-5 w-5 ${colorMap[feature.color]}`} />
                </div>
                <ArrowRight className={`h-4 w-4 ${colorMap[feature.color]} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Start Section */}
      <Card className="glass-card glass-card-hover border-0 overflow-hidden">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Start Guide</h2>
          <div className="space-y-3">
            {[
              { step: 1, text: "Upload your resume to the ATS Scanner to identify formatting issues", icon: ScanSearch },
              { step: 2, text: "Paste a job description to see your semantic match score and skill gaps", icon: Target },
              { step: 3, text: "Use the AI Rewriter to improve your bullet points with STAR format", icon: Sparkles },
              { step: 4, text: "Chat with the Career Coach for personalized placement advice", icon: MessageSquare },
              { step: 5, text: "Close skill gaps with the personalized learning roadmap", icon: Map },
              { step: 6, text: "Export your optimized resume and career report as a branded PDF", icon: FileDown },
              { step: 7, text: "Practice interview questions and review AI feedback", icon: Mic },
              { step: 8, text: "Analyze your public GitHub portfolio for improvement signals", icon: Github },
              { step: 9, text: "Map plausible career paths toward your target role", icon: GitBranch },
              { step: 10, text: "Compare saved resume versions before applying", icon: ArrowLeftRight },
              {step: 11, text: "Build momentum with XP, badges, and daily streaks", icon: Trophy },
              {step: 12, text: "Use MNC Launchpad to turn your signals into a focused weekly plan", icon: Rocket },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-accent/40 flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {item.step}
                  </span>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
