import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  ArrowRight,
  Copy,
  CheckCircle2,
  PenLine,
  Zap,
  TrendingUp,
  MessageSquareQuote,
  History,
} from "lucide-react";

export default function ResumeRewriter() {
  const [resumeText, setResumeText] = useState("");
  const [tone, setTone] = useState("Executive");
  const [activeTab, setActiveTab] = useState("rewrite");

  const utils = trpc.useUtils();

  const rewriteMutation = trpc.rewriter.rewrite.useMutation({
    onSuccess: () => {
      toast.success("Analysis complete! +20 XP earned.");
      void utils.rewriter.history.invalidate();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to analyze resume bullets.");
    },
  });

  const historyQuery = trpc.rewriter.history.useQuery();
  const resumeVersionsQuery = trpc.resumeVersions.list.useQuery();

  useEffect(() => {
    const latestResume = resumeVersionsQuery.data?.[0];
    if (latestResume?.content && !resumeText) setResumeText(latestResume.content);
  }, [resumeVersionsQuery.data, resumeText]);

  const result = rewriteMutation.data;

  const handleAnalyze = () => {
    if (!resumeText || resumeText.length < 50) {
      toast.error("Upload a PowerPoint resume in onboarding before using the rewriter.");
      return;
    }
    rewriteMutation.mutate({ content: resumeText, tone: tone as "Executive" | "Creative" | "Technical" | "Conversational" });
  };

  const handleCopySuggestion = (original: string, improved: string) => {
    navigator.clipboard.writeText(`Original: ${original}\nImproved: ${improved}`);
    toast.success("Suggestion copied to clipboard.");
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "action_verbs": return <PenLine className="h-4 w-4 text-cyan" />;
      case "quantification": return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      case "phrasing": return <MessageSquareQuote className="h-4 w-4 text-violet" />;
      default: return <Zap className="h-4 w-4 text-amber-400" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "action_verbs": return "text-cyan";
      case "quantification": return "text-emerald-400";
      case "phrasing": return "text-violet";
      default: return "text-amber-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald/15 border border-emerald/20 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Resume Rewriter</h1>
          <p className="text-sm text-muted-foreground">
            Strengthen your bullet points with action verbs, quantification, and impact
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-card p-1">
          <TabsTrigger value="rewrite" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Sparkles className="mr-2 h-4 w-4" />
            Rewrite
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <History className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Rewrite Tab */}
        <TabsContent value="rewrite" className="space-y-4">
          <Card className="glass-card border-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Rewrite your uploaded PowerPoint resume</CardTitle>
              <CardDescription>
                ResumeIQ Pro uses the latest .pptx resume from your workspace. Extracted slide text stays available for review before suggestions are generated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <label htmlFor="rewrite-resume" className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Uploaded resume text {resumeVersionsQuery.data?.[0]?.name ? `• ${resumeVersionsQuery.data[0].name}` : ""}
                  </label>
                  <Textarea
                    id="rewrite-resume"
                    value={resumeText}
                    readOnly
                    placeholder="Upload a PowerPoint resume in onboarding to load its extracted text here."
                    className="glass-input min-h-[200px] font-mono text-sm opacity-90"
                  />
                </div>
                <div>
                  <label htmlFor="rewrite-tone" className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Output tone
                  </label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger id="rewrite-tone" className="glass-input h-11">
                      <SelectValue placeholder="Choose a tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Executive">Executive</SelectItem>
                      <SelectItem value="Creative">Creative</SelectItem>
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Conversational">Conversational</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    The selected tone guides phrasing while preserving truthful, measurable impact.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">Selected: <span className="font-medium text-cyan">{tone}</span></span>
                <div className="flex justify-end">
                <Button
                  onClick={handleAnalyze}
                  disabled={rewriteMutation.isPending || resumeText.length < 50}
                  className="btn-glow bg-primary text-primary-foreground"
                >
                  {rewriteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Get Suggestions
                    </>
                  )}
                </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Overall Summary */}
              <Card className="glass-card border-0 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-cyan/15 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-cyan" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Assessment</p>
                      <p className="text-lg font-semibold text-foreground">
                        Score: {result.overallScore}/100 • {result.weakBullets.length} improvements

                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {result.generalTips.map((tip: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-cyan border-cyan/30 font-normal">
                        {tip}
                      </Badge>
                    ))}
                    {result.actionVerbs.map((verb: string, i: number) => (
                      <Badge key={`v-${i}`} variant="secondary" className="text-emerald-400 border-emerald-400/30 font-normal">
                        {verb}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Individual Suggestions */}
              <Card className="glass-card border-0 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base">Detailed Suggestions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.weakBullets.map((bullet: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl bg-accent/10 border border-accent/20 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <PenLine className="h-4 w-4 text-cyan" />
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Improvement {i + 1}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                          <p className="text-xs text-rose-400 mb-1 font-medium">Original</p>
                          <p className="text-sm text-muted-foreground">{bullet.original}</p>
                        </div>
                        <div className="flex justify-center">
                          <ArrowRight className="h-4 w-4 text-violet" />
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                          <p className="text-xs text-emerald-400 mb-1 font-medium">Improved</p>
                          <p className="text-sm text-foreground">{bullet.improved}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{bullet.reason}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySuggestion(bullet.original, bullet.improved)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="glass-card border-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Rewrite History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : historyQuery.data && historyQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {historyQuery.data.map((item: any) => {
                    const suggestions = JSON.parse(item.suggestions);
                    return (
                      <div key={item.id} className="glass-card p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {suggestions?.weakBullets?.length || 0} suggestions
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No rewrites yet. Upload a PowerPoint resume to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
