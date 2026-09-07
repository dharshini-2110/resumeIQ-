import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check, Compass, FileUp, Sparkles, Target, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { extractResumeText, getPowerPointUploadHint, isSupportedResumeFile, MAX_RESUME_FILE_SIZE, MIN_RESUME_TEXT_LENGTH, RESUME_UPLOAD_ACCEPT } from "@/lib/resume-upload";

const steps = [
  { title: "Start with your resume", description: "Upload your resume first so ResumeIQ Pro can personalize every recommendation.", icon: FileUp },
  { title: "Choose your north star", description: "Tell ResumeIQ Pro which role you are working toward.", icon: Target },
  { title: "Set your starting point", description: "We’ll use this to pace recommendations and practice.", icon: Compass },
  { title: "Pick your next moves", description: "Select the tools you want to try first.", icon: Sparkles },
  { title: "You’re ready to move", description: "Your career cockpit is configured.", icon: Trophy },
];

const toolOptions = ["ATS Scanner", "Job-Fit Score", "Mock Interview", "GitHub Analyzer", "Career Paths", "Career Momentum"];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const profileQuery = trpc.onboarding.get.useQuery();
  const saveMutation = trpc.onboarding.save.useMutation();
  const saveResumeMutation = trpc.pdfExport.saveResumeVersion.useMutation();
  const completeMutation = trpc.onboarding.complete.useMutation();
  const utils = trpc.useUtils();
  const profile = profileQuery.data;
  const [step, setStep] = useState(0);
  const [targetRole, setTargetRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [isReadingResume, setIsReadingResume] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setStep(Math.min(profile.completed ? 4 : (profile.currentStep || 0), steps.length - 1));
    setTargetRole(profile.targetRole || "");
    setExperienceLevel(profile.experienceLevel || "");
    try {
      setSelectedTools(profile.selectedTools ? JSON.parse(profile.selectedTools) : []);
    } catch {
      setSelectedTools([]);
    }
  }, [profile]);

  const current = steps[step];
  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  const persist = async (nextStep: number) => {
    await saveMutation.mutateAsync({ currentStep: nextStep, targetRole, experienceLevel, interests: [], selectedTools });
    await utils.onboarding.get.invalidate();
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isSupportedResumeFile(file)) return toast.error("Please upload a PDF, Word (.docx), or PowerPoint (.pptx) resume.");
    if (file.size > MAX_RESUME_FILE_SIZE) return toast.error("Please upload a resume smaller than 10 MB.");
    setResumeFileName(file.name);
    setIsReadingResume(true);
    try {
      const text = await extractResumeText(file);
      if (text.trim().length < MIN_RESUME_TEXT_LENGTH) {
        setResumeText("");
        return toast.error("We could not find enough readable text in that resume.");
      }
      setResumeText(text);
      toast.success("Resume ready. Continue to personalize your workspace.");
    } catch (error) {
      setResumeText("");
      toast.error(error instanceof Error ? error.message : "We could not read that resume. Try a text-based PDF, .docx, or .pptx file.");
    } finally {
      setIsReadingResume(false);
    }
  };

  const next = async () => {
    if (step === 0 && resumeText.trim().length < MIN_RESUME_TEXT_LENGTH) return toast.error("Upload a readable resume before continuing.");
    if (step === 1 && targetRole.trim().length < 2) return toast.error("Add a target role to continue.");
    if (step === 2 && !experienceLevel) return toast.error("Choose your current experience level.");
    if (step < steps.length - 1) {
      try {
        if (step === 0) {
          await saveResumeMutation.mutateAsync({ name: "My first resume", content: resumeText });
          toast.success("Resume saved to your workspace.");
        }
        await persist(step + 1);
        setStep(step + 1);
      } catch { toast.error("Could not save your progress. Try again."); }
    } else {
      try {
        await completeMutation.mutateAsync();
        await utils.onboarding.get.invalidate();
        toast.success("Your ResumeIQ workspace is ready.");
        setLocation("/");
      } catch { toast.error("Could not finish onboarding. Try again."); }
    }
  };

  const skip = async () => {
    try {
        await saveMutation.mutateAsync({ currentStep: 5, targetRole, experienceLevel, interests: [], selectedTools });
      await utils.onboarding.get.invalidate();
      toast.success("You can revisit onboarding any time.");
      setLocation("/");
    } catch { toast.error("Could not save this choice."); }
  };

  const toggleTool = (tool: string) => setSelectedTools((currentTools) => currentTools.includes(tool) ? currentTools.filter((item) => item !== tool) : [...currentTools, tool]);
  const Icon = current.icon;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-background to-violet/10 p-6 sm:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div><Badge className="mb-3 border-primary/20 bg-primary/10 text-primary">First-time setup</Badge><h1 className="text-3xl font-bold tracking-tight"><span className="text-gradient-full">Build your career cockpit</span></h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">A quick setup makes every AI recommendation feel more relevant to you.</p></div>
          {step > 0 && <span className="text-xs text-muted-foreground">Resume uploaded — you can revisit this setup later.</span>}
        </div>
        <div className="mt-7 h-2 overflow-hidden rounded-full bg-accent/40"><div className="h-full rounded-full bg-gradient-to-r from-primary via-violet to-pink transition-all" style={{ width: `${progress}%` }} /></div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>Step {step + 1} of {steps.length}</span><span>{Math.round(progress)}% configured</span></div>
      </div>

      <Card className="glass-card border-0">
        <CardHeader><div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Icon className="h-6 w-6" /></div><CardTitle>{current.title}</CardTitle><p className="text-sm text-muted-foreground">{current.description}</p></CardHeader>
        <CardContent className="space-y-6">
          {step === 0 && <div className="space-y-4"><label htmlFor="first-resume" className="group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary/60 bg-primary/10 p-8 text-center transition hover:border-primary hover:bg-primary/15"><span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/25 text-primary"><FileUp className="h-7 w-7" /></span><span className="font-semibold text-white">{isReadingResume ? "Reading your resume…" : resumeFileName || "Upload your resume"}</span><span className="mt-1 text-xs text-gray-300">{getPowerPointUploadHint()}</span><input id="first-resume" type="file" accept={RESUME_UPLOAD_ACCEPT} onChange={handleResumeUpload} disabled={isReadingResume} className="sr-only" /></label>{isReadingResume && <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" />Extracting readable text…</div>}{resumeText && <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-200"><strong>Ready to personalize.</strong> Your resume will be saved as your first version and used across ATS Scanner, Job-Fit, and the AI career tools.</div>}</div>}
          {step === 1 && <div className="space-y-2"><Label htmlFor="target-role">Target role</Label><Input id="target-role" value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="e.g. Frontend Engineer" className="bg-background/40" /></div>}
          {step === 2 && <div className="grid gap-3 sm:grid-cols-3">{["Student / beginner", "Early career", "Career switcher"].map((level) => <button key={level} onClick={() => setExperienceLevel(level)} className={`rounded-2xl border p-4 text-left transition ${experienceLevel === level ? "border-primary bg-primary/10 shadow-[0_0_24px_rgba(34,211,238,0.12)]" : "border-border bg-background/20 hover:border-primary/40"}`}><span className="text-sm font-medium">{level}</span><span className="mt-1 block text-xs text-muted-foreground">{level === "Student / beginner" ? "Build strong foundations" : level === "Early career" ? "Sharpen your signal" : "Translate your experience"}</span></button>)}</div>}
          {step === 2 && <div className="grid gap-3 sm:grid-cols-2">{toolOptions.map((tool) => <button key={tool} onClick={() => toggleTool(tool)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${selectedTools.includes(tool) ? "border-primary bg-primary/10" : "border-border bg-background/20 hover:border-primary/40"}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full ${selectedTools.includes(tool) ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground"}`}>{selectedTools.includes(tool) && <Check className="h-4 w-4" />}</span><span className="text-sm font-medium">{tool}</span></button>)}</div>}
          {step === 3 && <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5"><p className="text-sm leading-relaxed text-muted-foreground">Your workspace is tuned for <strong className="text-foreground">{targetRole || "your target role"}</strong>. Start with the tools you selected, then build momentum with saved applications and daily practice.</p><div className="mt-4 flex flex-wrap gap-2">{selectedTools.length ? selectedTools.map((tool) => <Badge key={tool} variant="outline" className="border-primary/20">{tool}</Badge>) : <Badge variant="outline">Explore the full toolkit</Badge>}</div></div>}
          <div className="flex items-center justify-between gap-3"><Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button><Button onClick={next} disabled={saveMutation.isPending || completeMutation.isPending || saveResumeMutation.isPending || isReadingResume} className="bg-primary text-primary-foreground">{step === steps.length - 1 ? "Open my dashboard" : "Continue"}<ArrowRight className="ml-2 h-4 w-4" /></Button></div>
        </CardContent>
      </Card>
    </div>
  );
}

export const onboardingSteps = steps;
