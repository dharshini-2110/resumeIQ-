import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ExternalLink, Github, History, Languages, Lightbulb, Loader2, Star, TrendingUp } from "lucide-react";
import { ReportActions } from "@/components/ReportActions";

type Repository = { name: string; description: string; stars: number; language: string; url: string };
type GitHubResult = { username: string; score: number; summary: string; topRepos: Repository[]; techStack: string[]; repositoriesReviewed: number; recentActivityCount: number | null; suggestions: string[] };

function parseStoredAnalysis(raw: string | null) {
  if (!raw) return null;
  try { return JSON.parse(raw) as GitHubResult; } catch { return null; }
}

export default function GitHubAnalyzer() {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<GitHubResult | null>(null);
  const [activeTab, setActiveTab] = useState("analyzer");
  const historyQuery = trpc.github.history.useQuery();
  const analyzeMutation = trpc.github.analyze.useMutation({
    onSuccess: (data) => { setResult(data as GitHubResult); toast.success("GitHub portfolio analyzed."); void historyQuery.refetch(); },
    onError: (error) => toast.error(error.message || "Unable to analyze this GitHub profile."),
  });

  const analyze = () => {
    const value = username.trim().replace(/^@/, "");
    if (value.length < 1) { toast.error("Enter a GitHub username first."); return; }
    if (!/^[a-zA-Z0-9-]+$/.test(value)) { toast.error("Use a valid GitHub username without a URL or spaces."); return; }
    setUsername(value);
    analyzeMutation.mutate({ username: value });
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-cyan/20 bg-cyan/5 p-5 sm:p-6"><div className="aurora-orb aurora-orb-cyan -right-16 -top-20" /><div className="relative flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/15 shadow-[0_0_28px_rgba(34,211,238,0.16)]"><Github className="h-6 w-6 text-cyan" /></div><div><div className="mb-1 flex flex-wrap items-center gap-2"><Badge className="border-cyan/30 bg-cyan/15 text-cyan">Portfolio signal</Badge><span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Public data</span></div><h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">GitHub Portfolio Analyzer</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Turn public project signals into a practical portfolio improvement plan.</p></div></div></div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-card flex max-w-full overflow-x-auto p-1"><TabsTrigger value="analyzer">Analyzer</TabsTrigger><TabsTrigger value="history"><History className="mr-2 h-4 w-4" />History</TabsTrigger></TabsList>
        <TabsContent value="analyzer" className="space-y-4">
          <Card className="glass-card glass-card-hover border-0 shadow-[0_16px_60px_rgba(34,211,238,0.07)]"><CardHeader><CardTitle>Analyze a public profile</CardTitle><CardDescription>Read-only analysis of public repositories. The scanner never modifies GitHub data.</CardDescription></CardHeader><CardContent><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Github className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={username} onChange={(event) => setUsername(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") analyze(); }} placeholder="github-username" className="glass-input pl-10" /></div><Button onClick={analyze} disabled={analyzeMutation.isPending} className="btn-glow bg-primary text-primary-foreground">{analyzeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}Analyze portfolio</Button></div></CardContent></Card>

          {result && <div className="space-y-4">
            <Card className="glass-card glass-card-hover border-cyan/20 bg-cyan/[0.03]"><CardContent className="p-6"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><p className="text-sm text-muted-foreground">Portfolio signal score</p><p className="mt-1 text-5xl font-bold text-cyan">{result.score}<span className="text-2xl text-muted-foreground">/100</span></p><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{result.summary}</p></div><div className="w-full max-w-xs"><Progress value={result.score} className="h-3" /><p className="mt-2 text-right text-xs text-muted-foreground">Based on public repository signals</p></div></div></CardContent></Card>
            <div className="grid gap-4 md:grid-cols-3"><Card className="glass-card border-0"><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Repositories reviewed</p><p className="mt-2 text-2xl font-semibold text-foreground">{result.repositoriesReviewed}</p><p className="mt-1 text-xs text-muted-foreground">Public repositories fetched</p></CardContent></Card><Card className="glass-card border-0"><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Languages detected</p><p className="mt-2 text-2xl font-semibold text-foreground">{result.techStack.length}</p></CardContent></Card><Card className="glass-card border-0"><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Recent public activity</p><p className="mt-2 text-2xl font-semibold text-foreground">{result.recentActivityCount ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">Latest events endpoint, when available</p><p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Profile</p><a href={`https://github.com/${encodeURIComponent(result.username)}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-cyan hover:underline">@{result.username}<ExternalLink className="h-3.5 w-3.5" /></a></CardContent></Card></div>
            <div className="flex justify-end"><ReportActions title="ResumeIQ GitHub Portfolio Report" filename="resumeiq-github-portfolio-report.txt" content={`GitHub profile: @${result.username}\n\nPortfolio score: ${result.score}/100\n${result.summary}\n\nRepositories reviewed: ${result.repositoriesReviewed}\nLanguages detected: ${result.techStack.join(", ") || "None reported"}\nRecent public activity: ${result.recentActivityCount ?? "Unavailable"}\n\nSuggestions:\n${result.suggestions.map((suggestion) => `- ${suggestion}`).join("\n")}`} /></div>
            <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]"><Card className="glass-card border-0"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Star className="h-4 w-4 text-amber-400" />Featured repositories</CardTitle></CardHeader><CardContent className="space-y-3">{result.topRepos.length > 0 ? result.topRepos.map((repo) => <div key={repo.url} className="rounded-xl border border-border/60 bg-accent/10 p-4 transition-colors hover:border-cyan/25 hover:bg-cyan/5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><a href={repo.url} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:text-cyan">{repo.name}</a><p className="mt-1 text-sm text-muted-foreground">{repo.description}</p></div><Badge variant="outline" className="shrink-0"><Star className="mr-1 h-3 w-3 text-amber-400" />{repo.stars}</Badge></div><Badge variant="secondary" className="mt-3 text-xs">{repo.language}</Badge></div>) : <p className="text-sm text-muted-foreground">No public repositories were found for this profile.</p>}</CardContent></Card><div className="space-y-4"><Card className="glass-card border-0"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Languages className="h-4 w-4 text-violet" />Tech stack breadth</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-2">{result.techStack.length > 0 ? result.techStack.map((language) => <Badge key={language} variant="secondary" className="border-violet/30 text-violet">{language}</Badge>) : <p className="text-sm text-muted-foreground">No languages reported.</p>}</div></CardContent></Card><Card className="glass-card border-0"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4 text-amber-400" />Next improvements</CardTitle></CardHeader><CardContent><ul className="space-y-3">{result.suggestions.map((suggestion) => <li key={suggestion} className="flex gap-2 text-sm text-muted-foreground"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />{suggestion}</li>)}</ul></CardContent></Card></div></div>
          </div>}
          {!result && !analyzeMutation.isPending && <div className="rounded-xl border border-dashed border-border/70 bg-accent/5 p-10 text-center"><Github className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">Enter a public GitHub username to see portfolio signals.</p></div>}
        </TabsContent>
        <TabsContent value="history"><Card className="glass-card border-0"><CardHeader><CardTitle>Analysis history</CardTitle><CardDescription>Only your saved portfolio analyses appear here.</CardDescription></CardHeader><CardContent>{historyQuery.isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-cyan" /></div> : historyQuery.isError ? <p className="rounded-xl bg-rose-400/10 p-4 text-sm text-rose-300">History is temporarily unavailable.</p> : historyQuery.data && historyQuery.data.length > 0 ? <div className="space-y-3">{historyQuery.data.map((item) => { const stored = parseStoredAnalysis(item.analysis); return <button key={item.id} type="button" onClick={() => { setResult(stored); setUsername(item.githubUsername); setActiveTab("analyzer"); }} className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-accent/10 p-4 text-left hover:border-cyan/30"><div><p className="font-medium text-foreground">@{item.githubUsername}</p><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p></div><Badge variant="secondary" className="text-cyan">{item.score ?? 0}/100</Badge></button>; })}</div> : <div className="py-10 text-center text-sm text-muted-foreground"><p>No GitHub analyses yet.</p></div>}</CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
