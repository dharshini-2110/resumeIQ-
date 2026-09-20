import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  FileText,
  Target,
  Lightbulb,
  RefreshCw,
} from "lucide-react";

export default function ResumeRewriter() {
  const [resumeText, setResumeText] = useState("");
  const [tone, setTone] = useState("Executive");
  const [activeTab, setActiveTab] = useState("rewrite");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const rewriteMutation =
    trpc.rewriter.rewrite.useMutation({
      onSuccess: () => {
        toast.success(
          "Analysis complete! +20 XP earned."
        );

        void utils.rewriter.history.invalidate();
      },

      onError: (err: any) => {
        toast.error(
          err.message ||
            "Failed to analyze resume bullets."
        );
      },
    });

  const historyQuery =
    trpc.rewriter.history.useQuery();

  const resumeVersionsQuery =
    trpc.resumeVersions.list.useQuery();

  useEffect(() => {
    const latestResume =
      resumeVersionsQuery.data?.[0];

    if (
      latestResume?.content &&
      !resumeText
    ) {
      setResumeText(
        latestResume.content
      );
    }
  }, [
    resumeVersionsQuery.data,
    resumeText,
  ]);

  const result = rewriteMutation.data;

  const resumeName =
    resumeVersionsQuery.data?.[0]?.name;

  const resumeLength =
    resumeText.length;

  const resumeWordCount =
    useMemo(() => {
      return resumeText.trim()
        ? resumeText
            .trim()
            .split(/\s+/).length
        : 0;
    }, [resumeText]);

  const score =
    typeof result?.overallScore ===
    "number"
      ? Math.max(
          0,
          Math.min(
            100,
            result.overallScore
          )
        )
      : 0;

  const handleAnalyze = () => {
    if (
      !resumeText ||
      resumeText.length < 50
    ) {
      toast.error(
        "Your resume text is too short. Complete onboarding or load a resume before using the rewriter."
      );

      return;
    }

    rewriteMutation.mutate({
      content: resumeText,
      tone: tone as
        | "Executive"
        | "Creative"
        | "Technical"
        | "Conversational",
    });
  };

  const handleCopySuggestion = async (
    original: string,
    improved: string,
    index: number
  ) => {
    try {
      await navigator.clipboard.writeText(
        improved
      );

      setCopiedIndex(index);

      toast.success(
        "Improved bullet copied."
      );

      window.setTimeout(() => {
        setCopiedIndex(null);
      }, 1800);
    } catch {
      toast.error(
        "Could not copy the suggestion."
      );
    }
  };

  const getCategoryIcon = (
    category: string
  ) => {
    switch (category) {
      case "action_verbs":
        return (
          <PenLine className="h-4 w-4" />
        );

      case "quantification":
        return (
          <TrendingUp className="h-4 w-4" />
        );

      case "phrasing":
        return (
          <MessageSquareQuote className="h-4 w-4" />
        );

      default:
        return (
          <Zap className="h-4 w-4" />
        );
    }
  };

  const getCategoryColor = (
    category: string
  ) => {
    switch (category) {
      case "action_verbs":
        return "text-cyan";

      case "quantification":
        return "text-emerald-400";

      case "phrasing":
        return "text-violet";

      default:
        return "text-amber-400";
    }
  };

  const getScoreLabel = (
    value: number
  ) => {
    if (value >= 85) {
      return "Excellent";
    }

    if (value >= 70) {
      return "Strong";
    }

    if (value >= 50) {
      return "Needs improvement";
    }

    return "Needs attention";
  };

  const getScoreDescription = (
    value: number
  ) => {
    if (value >= 85) {
      return "Your bullets already communicate strong impact.";
    }

    if (value >= 70) {
      return "A few targeted changes can make your bullets stronger.";
    }

    if (value >= 50) {
      return "There are several opportunities to improve clarity and impact.";
    }

    return "Your bullets need stronger action, evidence, and measurable impact.";
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 shadow-sm backdrop-blur-xl sm:p-6">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
              <Sparkles className="h-6 w-6 text-emerald-400" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                AI Resume Rewriter
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Strengthen your resume bullets with
                stronger action verbs, measurable
                impact, and clearer professional
                language.
              </p>
            </div>
          </div>

          {resumeName && (
            <Badge
              variant="secondary"
              className="w-fit gap-2 rounded-lg px-3 py-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              {resumeName}
            </Badge>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-5"
      >
        <TabsList className="h-auto w-full justify-start gap-1 rounded-xl border border-border bg-card/70 p-1 backdrop-blur-xl sm:w-fit">
          <TabsTrigger
            value="rewrite"
            className="rounded-lg px-4 py-2.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Rewrite
          </TabsTrigger>

          <TabsTrigger
            value="history"
            className="rounded-lg px-4 py-2.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
          >
            <History className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Rewrite */}
        <TabsContent
          value="rewrite"
          className="space-y-5"
        >
          <Card className="overflow-hidden rounded-2xl border-border bg-card/70 shadow-sm backdrop-blur-xl">
            <CardHeader className="border-b border-border/70">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <PenLine className="h-5 w-5 text-primary" />
                </div>

                <div>
                  <CardTitle className="text-lg">
                    Resume content
                  </CardTitle>

                  <CardDescription className="mt-1">
                    Your latest resume content is
                    loaded automatically from your
                    workspace.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                {/* Resume text */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="rewrite-resume"
                      className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      Resume text
                    </label>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {resumeWordCount} words
                      </span>

                      <span className="text-border">
                        •
                      </span>

                      <span>
                        {resumeLength} characters
                      </span>
                    </div>
                  </div>

                  <Textarea
                    id="rewrite-resume"
                    value={resumeText}
                    readOnly
                    placeholder="Complete onboarding and upload your resume to load its extracted text here."
                    className="min-h-[260px] resize-y rounded-xl border-border bg-background/50 font-mono text-sm leading-6 shadow-inner"
                  />

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />

                    <span>
                      Resume content is loaded from
                      your saved workspace version.
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="space-y-5">
                  <div className="rounded-xl border border-border bg-background/40 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <MessageSquareQuote className="h-4 w-4 text-primary" />

                      <label
                        htmlFor="rewrite-tone"
                        className="text-sm font-semibold text-foreground"
                      >
                        Output tone
                      </label>
                    </div>

                    <Select
                      value={tone}
                      onValueChange={setTone}
                    >
                      <SelectTrigger
                        id="rewrite-tone"
                        className="h-11 rounded-xl bg-background/60"
                      >
                        <SelectValue placeholder="Choose a tone" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="Executive">
                          Executive
                        </SelectItem>

                        <SelectItem value="Creative">
                          Creative
                        </SelectItem>

                        <SelectItem value="Technical">
                          Technical
                        </SelectItem>

                        <SelectItem value="Conversational">
                          Conversational
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      The selected tone changes
                      phrasing while preserving
                      truthful and measurable impact.
                    </p>
                  </div>

                  <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          What AI checks
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Action verbs, measurable
                          achievements, clarity,
                          phrasing, and professional
                          impact.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleAnalyze}
                    disabled={
                      rewriteMutation.isPending ||
                      resumeText.length < 50
                    }
                    className="h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:shadow-md"
                  >
                    {rewriteMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing resume...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Get AI suggestions
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading state */}
          {rewriteMutation.isPending && (
            <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground">
                    AI is reviewing your resume
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Checking bullet strength,
                    measurable impact, and phrasing.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {result && !rewriteMutation.isPending && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Score */}
              <Card className="overflow-hidden rounded-2xl border-border bg-card/70 shadow-sm backdrop-blur-xl">
                <CardContent className="p-5 sm:p-6">
                  <div className="grid gap-6 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background/40 p-5">
                      <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-8 border-primary/15">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-foreground">
                            {score}
                          </p>

                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            / 100
                          </p>
                        </div>
                      </div>

                      <Badge className="mt-3 rounded-lg">
                        {getScoreLabel(score)}
                      </Badge>
                    </div>

                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan/10">
                          <Target className="h-5 w-5 text-cyan" />
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">
                            Resume bullet assessment
                          </p>

                          <h2 className="text-xl font-bold text-foreground">
                            {result.weakBullets.length}{" "}
                            improvement
                            {result.weakBullets.length ===
                            1
                              ? ""
                              : "s"}{" "}
                            found
                          </h2>
                        </div>
                      </div>

                      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        {getScoreDescription(
                          score
                        )}
                      </p>

                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="font-medium text-muted-foreground">
                            Overall strength
                          </span>

                          <span className="font-semibold text-foreground">
                            {score}%
                          </span>
                        </div>

                        <Progress
                          value={score}
                          className="h-2"
                        />
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {result.generalTips.map(
                          (
                            tip: string,
                            i: number
                          ) => (
                            <Badge
                              key={`tip-${i}`}
                              variant="secondary"
                              className="rounded-lg border-cyan/20 px-2.5 py-1 text-xs font-normal text-cyan"
                            >
                              {tip}
                            </Badge>
                          )
                        )}

                        {result.actionVerbs.map(
                          (
                            verb: string,
                            i: number
                          ) => (
                            <Badge
                              key={`verb-${i}`}
                              variant="secondary"
                              className="rounded-lg border-emerald-400/20 px-2.5 py-1 text-xs font-normal text-emerald-400"
                            >
                              {verb}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Suggestions */}
              <Card className="overflow-hidden rounded-2xl border-border bg-card/70 shadow-sm backdrop-blur-xl">
                <CardHeader className="border-b border-border/70">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        Detailed suggestions
                      </CardTitle>

                      <CardDescription className="mt-1">
                        Review each suggested
                        improvement and copy the
                        stronger version.
                      </CardDescription>
                    </div>

                    <Badge
                      variant="secondary"
                      className="hidden rounded-lg sm:inline-flex"
                    >
                      {result.weakBullets.length}{" "}
                      items
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-5 sm:p-6">
                  {result.weakBullets.map(
                    (
                      bullet: any,
                      i: number
                    ) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-border bg-background/30 p-4 transition-colors hover:bg-background/50 sm:p-5"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              <PenLine className="h-4 w-4 text-primary" />
                            </div>

                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Improvement{" "}
                              {i + 1}
                            </span>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleCopySuggestion(
                                bullet.original,
                                bullet.improved,
                                i
                              )
                            }
                            className="h-9 rounded-lg px-3 text-xs"
                          >
                            {copiedIndex === i ? (
                              <>
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="mr-1.5 h-3.5 w-3.5" />
                                Copy improved
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                          <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 p-4">
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-rose-400">
                              Original
                            </p>

                            <p className="text-sm leading-6 text-muted-foreground">
                              {bullet.original}
                            </p>
                          </div>

                          <div className="flex justify-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card">
                              <ArrowRight className="h-4 w-4 text-primary" />
                            </div>
                          </div>

                          <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                              Improved
                            </p>

                            <p className="text-sm leading-6 text-foreground">
                              {bullet.improved}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-background/40 p-3">
                          <Lightbulb
                            className={`mt-0.5 h-4 w-4 shrink-0 ${getCategoryColor(
                              bullet.category
                            )}`}
                          />

                          <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-2">
                              <span
                                className={`text-xs font-semibold capitalize ${getCategoryColor(
                                  bullet.category
                                )}`}
                              >
                                {String(
                                  bullet.category ||
                                    "improvement"
                                ).replace(
                                  /_/g,
                                  " "
                                )}
                              </span>

                              {getCategoryIcon(
                                bullet.category
                              )}
                            </div>

                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {bullet.reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>

              {/* Run again */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleAnalyze}
                  disabled={
                    rewriteMutation.isPending
                  }
                  className="rounded-xl"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Analyze again
                </Button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!result &&
            !rewriteMutation.isPending && (
              <Card className="rounded-2xl border-dashed border-border bg-card/50">
                <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>

                  <h3 className="text-base font-semibold text-foreground">
                    Ready to strengthen your
                    resume
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Your saved resume is loaded
                    above. Choose a tone and run the
                    AI analysis to receive targeted
                    bullet improvements.
                  </p>
                </CardContent>
              </Card>
            )}
        </TabsContent>

        {/* History */}
        <TabsContent
          value="history"
          className="space-y-5"
        >
          <Card className="overflow-hidden rounded-2xl border-border bg-card/70 shadow-sm backdrop-blur-xl">
            <CardHeader className="border-b border-border/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <History className="h-5 w-5 text-primary" />
                </div>

                <div>
                  <CardTitle className="text-lg">
                    Rewrite history
                  </CardTitle>

                  <CardDescription>
                    Previous AI resume analyses from
                    your workspace.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              {historyQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading your history...
                  </div>
                </div>
              ) : historyQuery.data &&
                historyQuery.data.length >
                  0 ? (
                <div className="space-y-3">
                  {historyQuery.data.map(
                    (item: any) => {
                      let suggestions: any = {};

                      try {
                        suggestions =
                          JSON.parse(
                            item.suggestions
                          );
                      } catch {
                        suggestions = {};
                      }

                      return (
                        <div
                          key={item.id}
                          className="group flex flex-col gap-4 rounded-xl border border-border bg-background/30 p-4 transition-colors hover:bg-background/60 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10">
                              <Sparkles className="h-5 w-5 text-emerald-400" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {suggestions
                                  ?.weakBullets
                                  ?.length ||
                                  0}{" "}
                                improvement
                                {(
                                  suggestions
                                    ?.weakBullets
                                    ?.length ||
                                  0
                                ) === 1
                                  ? ""
                                  : "s"}{" "}
                                found
                              </p>

                              <p className="mt-1 text-xs text-muted-foreground">
                                {new Date(
                                  item.createdAt
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <Badge
                            variant="secondary"
                            className="w-fit rounded-lg text-xs"
                          >
                            {new Date(
                              item.createdAt
                            ).toLocaleDateString()}
                          </Badge>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
                    <History className="h-7 w-7 text-muted-foreground" />
                  </div>

                  <h3 className="text-sm font-semibold text-foreground">
                    No rewrites yet
                  </h3>

                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Run your first AI resume analysis
                    and your results will appear here.
                  </p>

                  <Button
                    variant="outline"
                    className="mt-5 rounded-xl"
                    onClick={() =>
                      setActiveTab(
                        "rewrite"
                      )
                    }
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start rewriting
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
