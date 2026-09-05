import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ReportActions } from "@/components/ReportActions";
import {
  Target,
  Loader2,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ClipboardList,
  ArrowRight,
} from "lucide-react";

export default function JobFitAnalyzer() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [activeTab, setActiveTab] = useState("analyzer");

  const utils = trpc.useUtils();

  const analyzeMutation = trpc.jobFit.analyze.useMutation({
    onSuccess: () => {
      toast.success("Job-fit analysis complete! +30 XP earned.");
      void utils.jobFit.history.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to analyze job fit.");
    },
  });

  const historyQuery = trpc.jobFit.history.useQuery();

  const result = analyzeMutation.data;

  const handleAnalyze = () => {
    if (!resumeText || resumeText.length < 50) {
      toast.error("Please paste your resume content (at least 50 characters).");
      return;
    }
    if (!jobDescription || jobDescription.length < 20) {
      toast.error("Please paste the job description (at least 20 characters).");
      return;
    }
    analyzeMutation.mutate({ resumeContent: resumeText, jobDescription });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    if (score >= 40) return "text-orange-400";
    return "text-rose-400";
  };

  const getMatchLabel = (score: number) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    if (score >= 40) return "Partial Match";
    return "Low Match";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-violet/15 border border-violet/20 flex items-center justify-center">
          <Target className="h-6 w-6 text-violet" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Semantic Job-Fit Analyzer</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered match scoring with detailed gap analysis
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-card p-1">
          <TabsTrigger value="analyzer" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Analyzer
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            History
          </TabsTrigger>
        </TabsList>

        {/* Analyzer Tab */}
        <TabsContent value="analyzer" className="space-y-4">
          {/* Input Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="glass-card border-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-cyan" />
                  Your Resume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume content here..."
                  className="glass-input min-h-[250px] font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Card className="glass-card border-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-violet" />
                  Job Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  className="glass-input min-h-[250px] font-mono text-sm"
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending || resumeText.length < 50 || jobDescription.length < 20}
              className="btn-glow bg-primary text-primary-foreground"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Match...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  Analyze Job Fit
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Score */}
              <Card className="glass-card border-0 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Match Score</p>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-bold ${getScoreColor(result.matchScore)}`}>
                          {result.matchScore}%
                        </span>
                        <Badge variant="secondary" className={`text-xs ${getScoreColor(result.matchScore)}`}>
                          {getMatchLabel(result.matchScore)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right max-w-xs">
                      <p className="text-sm text-muted-foreground mb-1">Summary</p>
                      <p className="text-sm text-foreground">{result.summary}</p>
                    </div>
                  </div>
                  <Progress value={result.matchScore} className="h-2 mt-4" />
                  <div className="mt-5 flex justify-end">
                    <ReportActions
                      title="ResumeIQ Job-Fit Report"
                      filename="resumeiq-job-fit-report.txt"
                      content={`Job-Fit Score: ${result.matchScore}%\n\nSummary: ${result.summary}\n\nMatched skills: ${result.matchedSkills.join(", ") || "None detected"}\n\nMissing skills: ${result.missingSkills.join(", ") || "None detected"}\n\nSuggestions:\n${result.suggestions.map((suggestion: string) => `- ${suggestion}`).join("\n")}`}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Skills Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="glass-card border-0 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Matched Skills ({result.matchedSkills.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.matchedSkills.map((skill: string) => (
                        <Badge key={skill} variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          {skill}
                        </Badge>
                      ))}
                      {result.matchedSkills.length === 0 && (
                        <p className="text-sm text-muted-foreground">No matching skills detected</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-0 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-rose-400" />
                      Missing Skills ({result.missingSkills.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.missingSkills.map((skill: string) => (
                        <Badge key={skill} variant="secondary" className="bg-rose-500/15 text-rose-400 border-rose-500/30">
                          {skill}
                        </Badge>
                      ))}
                      {result.missingSkills.length === 0 && (
                        <p className="text-sm text-emerald-400">No major gaps detected!</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Suggestions */}
              <Card className="glass-card border-0 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    Improvement Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.suggestions.map((suggestion: string, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-accent/20">
                        <ArrowRight className="h-4 w-4 text-violet shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
                  {historyQuery.data.map((item) => (
                    <div key={item.id} className="glass-card p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold ${
                          item.matchScore >= 80 ? "bg-emerald-500/20 text-emerald-400" :
                          item.matchScore >= 60 ? "bg-amber-500/20 text-amber-400" :
                          "bg-rose-500/20 text-rose-400"
                        }`}>
                          {item.matchScore}%
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Match Score: {item.matchScore}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getMatchLabel(item.matchScore)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No analyses yet. Compare your resume to a job description.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
