import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowRight, BookOpen, BrainCircuit, CheckCircle2, ChevronLeft, Loader2, Mic, RotateCcw, Sparkles, Target } from "lucide-react";
import { ReportActions } from "@/components/ReportActions";

type InterviewQuestion = { question: string; type: "behavioral" | "situational" | "domain" | "role_specific"; category: string; whatItTests: string; learningDetails: string[]; answerFramework: string; talkingPoints: string[] };
type Evaluation = {
  scores: { clarity: number; structure: number; technicalDepth: number; relevance: number };
  overallScore: number;
  feedback: string;
  improvements: string[];
};

function questionCount(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : null;
  } catch {
    return null;
  }
}

export default function MockInterview() {
  const [role, setRole] = useState("");
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [activeTab, setActiveTab] = useState("simulator");
  const roleExamples = ["Marketing Manager", "Product Designer", "Data Analyst", "Customer Success", "Finance Associate", "Teacher"];

  const historyQuery = trpc.interview.getSessions.useQuery();
  const startMutation = trpc.interview.startSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setQuestions(data.questions as InterviewQuestion[]);
      setCurrentIndex(0);
      setAnswer("");
      setEvaluation(null);
      toast.success("Interview session ready. Take your time with the first question.");
    },
    onError: (error) => toast.error(error.message || "Could not start the interview."),
  });
  const evaluateMutation = trpc.interview.evaluateAnswer.useMutation({
    onSuccess: (data) => {
      setEvaluation(data as Evaluation);
      toast.success("Answer evaluated. Review the coaching notes below.");
    },
    onError: (error) => toast.error(error.message || "Could not evaluate this answer."),
  });

  const currentQuestion = questions[currentIndex];

  const startInterview = () => {
    const trimmedRole = role.trim();
    if (trimmedRole.length < 2) {
      toast.error("Enter a target role, such as Product Designer or Software Engineer.");
      return;
    }
    startMutation.mutate({ role: trimmedRole });
  };

  const evaluateAnswer = () => {
    if (!currentQuestion) return;
    if (answer.trim().length < 10) {
      toast.error("Write at least a sentence so the coach can give useful feedback.");
      return;
    }
    evaluateMutation.mutate({
      question: currentQuestion.question,
      answer: answer.trim(),
      type: currentQuestion.type,
    });
  };

  const nextQuestion = () => {
    if (currentIndex >= questions.length - 1) {
      toast.success("Interview complete. Start another session whenever you are ready.");
      setSessionId(null);
      setQuestions([]);
      setEvaluation(null);
      setAnswer("");
      return;
    }
    setCurrentIndex((index) => index + 1);
    setAnswer("");
    setEvaluation(null);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-violet/20 bg-violet/5 p-5 sm:p-6">
        <div className="aurora-orb aurora-orb-violet -right-16 -top-20" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet/30 bg-violet/15 shadow-[0_0_28px_rgba(139,92,246,0.18)]">
            <Mic className="h-6 w-6 text-violet" />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2"><Badge className="border-violet/30 bg-violet/15 text-violet">Practice lab</Badge><span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">AI coaching</span></div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Mock Interview Simulator</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Practice realistic questions, then get structured feedback on every answer.</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-card p-1">
          <TabsTrigger value="simulator">Simulator</TabsTrigger>
          <TabsTrigger value="history">Session history</TabsTrigger>
        </TabsList>

        <TabsContent value="simulator" className="space-y-4">
          {!sessionId ? (
            <Card className="glass-card glass-card-hover border-0 shadow-[0_16px_60px_rgba(99,102,241,0.08)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-violet" />Start a focused practice session</CardTitle>
                <CardDescription>Generate a balanced practice set for any role: behavioral, situational, domain, and role-specific questions with learning guidance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    placeholder="Target role — e.g. Senior Product Designer"
                    className="glass-input"
                    onKeyDown={(event) => { if (event.key === "Enter") startInterview(); }}
                  />
                  <Button onClick={startInterview} disabled={startMutation.isPending} className="btn-glow shrink-0 bg-primary text-primary-foreground">
                    {startMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate questions
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">Try a role:</span>
                  {roleExamples.map((example) => <button key={example} type="button" onClick={() => setRole(example)} className="rounded-full border border-border/60 bg-accent/10 px-3 py-1 text-xs text-muted-foreground transition hover:border-violet/40 hover:text-foreground">{example}</button>)}
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {["Role expertise", "Behavioral clarity", "Actionable coaching"].map((item) => (
                    <div key={item} className="group rounded-xl border border-border/60 bg-accent/10 p-3 text-sm text-muted-foreground transition-colors hover:border-violet/30 hover:bg-violet/5"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-violet align-middle shadow-[0_0_8px_rgba(139,92,246,0.7)]" />{item}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : currentQuestion ? (
            <div className="space-y-4">
              <Card className="glass-card glass-card-hover border-0">
                <CardContent className="p-5 sm:p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge className="border-violet/30 bg-violet/15 text-violet">Question {currentIndex + 1} of {questions.length}</Badge>
                      <Badge variant="outline" className="capitalize">{currentQuestion.type}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{currentQuestion.category}</span>
                  </div>
                  <Progress value={((currentIndex + 1) / questions.length) * 100} className="mb-5 h-2 bg-violet/10" />
                  <h2 className="text-xl font-semibold leading-relaxed text-foreground">{currentQuestion.question}</h2>
                </CardContent>
              </Card>

              <Card className="glass-card border-violet/20 bg-violet/[0.03]">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4 text-violet" />How to prepare for this question</CardTitle><CardDescription>{currentQuestion.whatItTests}</CardDescription></CardHeader>
                <CardContent className="grid gap-4 text-sm md:grid-cols-3">
                  <div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet">Learning details</p><ul className="space-y-2 text-muted-foreground">{currentQuestion.learningDetails.map((item) => <li key={item} className="flex gap-2"><BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-violet" />{item}</li>)}</ul></div>
                  <div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet">Answer framework</p><p className="leading-relaxed text-muted-foreground">{currentQuestion.answerFramework}</p></div>
                  <div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet">Talking points</p><ul className="space-y-2 text-muted-foreground">{currentQuestion.talkingPoints.map((item) => <li key={item} className="flex gap-2"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-violet" />{item}</li>)}</ul></div>
                </CardContent>
              </Card>

              <Card className="glass-card glass-card-hover border-0">
                <CardHeader>
                  <CardTitle className="text-base">Your answer</CardTitle>
                  <CardDescription>For behavioral questions, use Situation → Task → Action → Result. For domain or role-specific questions, explain your reasoning and trade-offs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Write your answer as if you were speaking to the interviewer..." className="glass-input min-h-[190px]" />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">{answer.length} characters</span>
                    <div className="flex gap-2">
                      <Button variant="outline" className="glass-input" onClick={() => { setAnswer(""); setEvaluation(null); }}><RotateCcw className="mr-2 h-4 w-4" />Reset answer</Button>
                      <Button onClick={evaluateAnswer} disabled={evaluateMutation.isPending} className="btn-glow bg-primary text-primary-foreground">
                        {evaluateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Evaluate answer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {evaluation && (
                <Card className="glass-card glass-card-hover border-emerald-400/20 bg-emerald-400/[0.03]">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-5 w-5 text-emerald-400" />Coach feedback</CardTitle>
                        <CardDescription className="mt-1">Overall answer score</CardDescription>
                      </div>
                      <span className="text-3xl font-bold text-emerald-400">{evaluation.overallScore}/10</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={evaluation.overallScore * 10} className="h-2" />
                    <p className="rounded-xl bg-emerald-400/10 p-4 text-sm leading-relaxed text-foreground">{evaluation.feedback}</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {Object.entries(evaluation.scores).map(([label, score]) => (
                        <div key={label} className="rounded-xl border border-border/60 bg-accent/10 p-3">
                          <p className="text-xs capitalize text-muted-foreground">{label === "technicalDepth" ? "Role knowledge" : label.replace(/([A-Z])/g, " $1")}</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">{score}/10</p>
                        </div>
                      ))}
                    </div>
                    {evaluation.improvements.length > 0 && <div><p className="mb-2 text-sm font-medium text-violet">Next improvements</p><ul className="space-y-2">{evaluation.improvements.map((item) => <li key={item} className="flex gap-2 text-sm text-muted-foreground"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-violet" />{item}</li>)}</ul></div>}
                    <div className="flex flex-wrap items-center justify-between gap-3"><ReportActions title="ResumeIQ Interview Feedback" filename="resumeiq-interview-feedback.txt" content={`Interview question: ${currentQuestion.question}\n\nOverall score: ${evaluation.overallScore}/10\n\nFeedback: ${evaluation.feedback}\n\nScores:\n${Object.entries(evaluation.scores).map(([label, score]) => `- ${label}: ${score}/10`).join("\n")}\n\nImprovements:\n${evaluation.improvements.map((item) => `- ${item}`).join("\n")}`} /><Button onClick={nextQuestion} className="bg-primary text-primary-foreground">{currentIndex >= questions.length - 1 ? "Finish session" : "Next question"}<ChevronLeft className="ml-2 h-4 w-4 rotate-180" /></Button></div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="history">
          <Card className="glass-card border-0">
            <CardHeader><CardTitle className="text-lg">Past practice sessions</CardTitle><CardDescription>Your generated question sets remain private to your account.</CardDescription></CardHeader>
            <CardContent>
              {historyQuery.isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-violet" /></div> : historyQuery.isError ? <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-300">Unable to load session history right now. You can still start a new interview.</div> : historyQuery.data && historyQuery.data.length > 0 ? <div className="space-y-3">{historyQuery.data.map((item) => <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-border/60 bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-foreground">{item.role}</p><p className="text-xs text-muted-foreground">{questionCount(item.questions) ? `${questionCount(item.questions)} generated questions` : "Question set unavailable"}</p></div><Badge variant="outline" className="w-fit">{item.sessionState}</Badge></div>)}</div> : <div className="py-10 text-center text-sm text-muted-foreground"><Mic className="mx-auto mb-3 h-10 w-10 opacity-40" /><p>No interview sessions yet. Start with a target role in the Simulator tab.</p></div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

