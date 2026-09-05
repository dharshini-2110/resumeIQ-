import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ReportActions } from "@/components/ReportActions";
import {
  GitBranch,
  Loader2,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Clock,
  Zap,
  Target,
  History,
  GraduationCap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function SkillGapAnalyzer() {
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [activeTab, setActiveTab] = useState("analyzer");
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const utils = trpc.useUtils();

  const analyzeMutation = trpc.skillGap.analyze.useMutation({
    onSuccess: () => {
      toast.success("Skill gap analysis complete! +25 XP earned.");
      void utils.skillGap.history.invalidate();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to analyze skill gaps.");
    },
  });

  const historyQuery = trpc.skillGap.history.useQuery();
  const resumeVersionsQuery = trpc.resumeVersions.list.useQuery();

  useEffect(() => {
    const latestResume = resumeVersionsQuery.data?.[0];
    if (latestResume?.content && !resumeText) setResumeText(latestResume.content);
  }, [resumeVersionsQuery.data, resumeText]);

  const result = analyzeMutation.data;

  const handleAnalyze = () => {
    if (!resumeText || resumeText.length < 50) {
      toast.error("Upload a PowerPoint resume in onboarding before analyzing skill gaps.");
      return;
    }
    if (!targetRole || targetRole.length < 3) {
      toast.error("Please enter a target role.");
      return;
    }
    analyzeMutation.mutate({ resumeContent: resumeText, targetRole });
  };

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
      case "intermediate": return "text-amber-400 bg-amber-500/15 border-amber-500/30";
      case "advanced": return "text-rose-400 bg-rose-500/15 border-rose-500/30";
      default: return "text-muted-foreground bg-accent/30 border-accent/50";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber/15 border border-amber/20 flex items-center justify-center">
          <GitBranch className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Skill Gap Analyzer</h1>
          <p className="text-sm text-muted-foreground">
            Identify skill gaps and get a personalized learning roadmap
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-card p-1">
          <TabsTrigger value="analyzer" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <GitBranch className="mr-2 h-4 w-4" />
            Analyzer
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <History className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Analyzer Tab */}
        <TabsContent value="analyzer" className="space-y-4">
          {/* Input */}
          <Card className="glass-card border-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Build your target-role skill map</CardTitle>
              <CardDescription>
                Choose a target role and use the latest uploaded PowerPoint resume to identify the skills that move you closer to competitive MNC roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Target Role</label>
                  <Input
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g., Senior Frontend Developer, ML Engineer, Product Manager"
                    className="glass-input"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Uploaded PowerPoint resume {resumeVersionsQuery.data?.[0]?.name ? `• ${resumeVersionsQuery.data[0].name}` : ""}</label>
                <Textarea
                  value={resumeText}
                  readOnly
                  placeholder="Upload a PowerPoint resume in onboarding to load its extracted text here."
                  className="glass-input min-h-[180px] font-mono text-sm opacity-90"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending || resumeText.length < 50 || !targetRole}
                  className="btn-glow bg-primary text-primary-foreground"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Target className="mr-2 h-4 w-4" />
                      Analyze Skill Gaps
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Skills Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="glass-card border-0 overflow-hidden">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Current Skills</p>
                    <p className="text-2xl font-bold text-cyan">{result.currentSkills.length}</p>
                    <p className="text-xs text-muted-foreground">identified</p>
                  </CardContent>
                </Card>
                <Card className="glass-card border-0 overflow-hidden">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Gap Skills</p>
                    <p className="text-2xl font-bold text-rose-400">{result.gapSkills.length}</p>
                    <p className="text-xs text-muted-foreground">to develop</p>
                  </CardContent>
                </Card>
                <Card className="glass-card border-0 overflow-hidden">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Roadmap Steps</p>
                    <p className="text-2xl font-bold text-emerald-400">{result.roadmap.length}</p>
                    <p className="text-xs text-muted-foreground">learning steps</p>
                  </CardContent>
                </Card>
              </div>

              {/* Current Skills */}
              <Card className="glass-card border-0 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Your Current Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.currentSkills.map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Gap Skills */}
              <Card className="glass-card border-0 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-rose-400" />
                    Skills to Develop
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.gapSkills.map((skill: any) => (
                      <Badge key={skill.name} variant="secondary" className="bg-rose-500/15 text-rose-400 border-rose-500/30">
                        {skill.name}
                        <span className="ml-1 text-xs opacity-70">({skill.priority || "high"})</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Learning Roadmap */}
              <Card className="glass-card border-0 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-violet" />
                    Learning Roadmap
                  </CardTitle>
                  <CardDescription>
                    Step-by-step plan to close your skill gaps
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.roadmap.map((step: any, i: number) => (
                    <div key={i} className="border border-accent/20 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleStep(i)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/10 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-violet/15 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-violet">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{step.skill || step.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {step.timeline || "2-4 weeks"}
                          </p>
                        </div>
                        {step.action && (
                          <Badge variant="secondary" className="text-xs bg-violet/10 text-violet border-violet/20">
                            {step.action.length > 30 ? step.action.slice(0, 30) + '...' : step.action}
                          </Badge>
                        )}
                        {expandedSteps.has(i) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {expandedSteps.has(i) && (
                        <div className="p-4 pt-0 space-y-2 animate-in fade-in duration-200">
                          {step.action && (
                            <p className="text-sm text-muted-foreground">{step.action}</p>
                          )}
                          {step.resources && Array.isArray(step.resources) && step.resources.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-foreground mb-1">Recommended Resources:</p>
                              <ul className="space-y-1">
                                {step.resources.map((resource: string, ri: number) => (
                                  <li key={ri} className="text-xs text-muted-foreground flex items-center gap-2">
                                    <ArrowRight className="h-3 w-3 text-violet shrink-0" />
                                    {resource}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {step.milestones && Array.isArray(step.milestones) && step.milestones.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-foreground mb-1">Milestones:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {step.milestones.map((milestone: string, mi: number) => (
                                  <Badge key={mi} variant="secondary" className="text-xs bg-cyan/10 text-cyan border-cyan/20">
                                    {milestone}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <ReportActions
                  title="ResumeIQ Skill Gap Report"
                  filename="resumeiq-skill-gap-report.txt"
                  content={`Target role: ${targetRole}\n\nCurrent skills: ${result.currentSkills.join(", ") || "None detected"}\n\nSkills to develop:\n${result.gapSkills.map((skill: any) => `- ${skill.name} (${skill.priority || "high"})`).join("\n")}\n\nLearning roadmap:\n${result.roadmap.map((step: any, index: number) => `${index + 1}. ${step.skill || step.title}: ${step.action || "Practice and build evidence"}`).join("\n")}`}
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="glass-card border-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Analysis History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : historyQuery.data && historyQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {historyQuery.data.map((item: any) => (
                    <div key={item.id} className="glass-card p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet/20 flex items-center justify-center">
                          <GraduationCap className="h-5 w-5 text-violet" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.targetRole}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {JSON.parse(item.gapSkills || "[]").length} gaps found
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No analyses yet. Define a target role to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
