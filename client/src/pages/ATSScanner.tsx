import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { extractPowerPointText, getPowerPointUploadHint, MAX_RESUME_FILE_SIZE, MIN_RESUME_TEXT_LENGTH } from "@/lib/resume-upload";
import {
  Upload,
  ScanSearch,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  Copy,
  Trash2,
  Zap,
  Info,
} from "lucide-react";

export default function ATSScanner() {
  const { user } = useAuth();
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [activeTab, setActiveTab] = useState("scanner");
  const [isReadingFile, setIsReadingFile] = useState(false);

  const utils = trpc.useUtils();

  const saveMutation = trpc.pdfExport.saveResumeVersion.useMutation({
    onSuccess: () => toast.success("Saved as resume version. +15 XP"),
    onError: () => toast.error("Failed to save version."),
  });
  const scanMutation = trpc.ats.scan.useMutation({
    onSuccess: () => {
      toast.success("Resume analyzed successfully! +25 XP earned.");
      void utils.ats.history.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to analyze resume.");
    },
  });

  const historyQuery = trpc.ats.history.useQuery();

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pptx") && !file.name.toLowerCase().endsWith(".ppt")) {
      toast.error("Please upload a PowerPoint resume (.pptx or .ppt).");
      return;
    }
    if (file.size > MAX_RESUME_FILE_SIZE) {
      toast.error("Please upload a resume smaller than 10 MB.");
      return;
    }

    setFileName(file.name);
    setIsReadingFile(true);
    try {
      const text = await extractPowerPointText(file);

      if (text.trim().length < MIN_RESUME_TEXT_LENGTH) {
        setResumeText("");
        toast.error("We could not find enough readable text in that PowerPoint resume.");
        return;
      }
      setResumeText(text);
      toast.success("Resume text extracted. Click Scan Resume to continue.");
    } catch (error) {
      setResumeText("");
      toast.error(error instanceof Error ? error.message : "We could not read that PowerPoint resume. Try a text-based .pptx file.");
    } finally {
      setIsReadingFile(false);
    }
  }, []);

  const handleScan = () => {
    if (!resumeText || resumeText.length < 50) {
      toast.error("Please upload a PowerPoint resume with at least 50 readable characters.");
      return;
    }
    scanMutation.mutate({ content: resumeText });
  };

  const result = scanMutation.data;

  const handleCopyResult = () => {
    if (result) {
      const text = `ATS Score: ${result.score}/100\n\nFound Keywords: ${result.foundKeywords.join(", ")}\nMissing Keywords: ${result.missingKeywords.join(", ")}\n\nIssues:\n${result.issues.map(i => "- " + i).join("\n")}`;
      navigator.clipboard.writeText(text);
      toast.success("Results copied to clipboard.");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-rose-400";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-emerald-500 to-green-400";
    if (score >= 60) return "from-amber-500 to-yellow-400";
    return "from-rose-500 to-pink-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-cyan/15 border border-cyan/20 flex items-center justify-center">
          <ScanSearch className="h-6 w-6 text-cyan" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">ATS Keyword Scanner</h1>
          <p className="text-sm text-muted-foreground">
            Analyze your resume for ATS compatibility and keyword optimization
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-card p-1">
          <TabsTrigger value="scanner" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Scanner
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            History
          </TabsTrigger>
        </TabsList>

        {/* Scanner Tab */}
        <TabsContent value="scanner" className="space-y-6">
          {/* Upload / Input */}
          <Card className="glass-card border-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Upload PowerPoint Resume</CardTitle>
              <CardDescription>
                Upload a PowerPoint resume and ResumeIQ Pro will extract the slide text for ATS analysis. Manual text paste is no longer required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="flex-1">
                  <div className="glass-card p-4 flex items-center gap-3 cursor-pointer hover:border-cyan/30 transition-colors">
                    <Upload className="h-5 w-5 text-cyan shrink-0" />
                    <span className="text-sm text-muted-foreground truncate">
                      {isReadingFile ? "Extracting slide text…" : fileName || "Click to upload a PowerPoint resume"}
                    </span>
                  </div>
                  <span className="mt-1 block text-xs text-muted-foreground">{getPowerPointUploadHint()}</span>
                  <input
                    type="file"
                    accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {resumeText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setResumeText(""); setFileName(""); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Your extracted PowerPoint resume text will appear here...\n\nUpload a .pptx resume to begin ATS analysis. You can review the extracted text before scanning."
                className="glass-input min-h-[280px] font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {resumeText.length > 0 ? `${resumeText.length} characters` : "Minimum 50 characters required"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setResumeText(`JOHN DOE\nSoftware Engineer\njohn.doe@email.com | (555) 123-4567 | linkedin.com/in/johndoe\n\nEDUCATION\nBachelor of Science in Computer Science\nStanford University | GPA: 3.8/4.0 | May 2024\n\nEXPERIENCE\nSoftware Engineer Intern | Google | Jun 2023 - Aug 2023\n- Developed a real-time data pipeline processing 10M+ events per day using Apache Kafka and Python\n- Improved API response times by 35% through query optimization and Redis caching\n- Collaborated with cross-functional teams to deliver features ahead of schedule\n- Mentored 2 junior interns on code review best practices\n\nFrontend Developer | StartupXYZ | Jan 2023 - May 2023\n- Built responsive web applications using React, TypeScript, and Tailwind CSS\n- Implemented automated testing with Jest achieving 90%+ code coverage\n- Reduced bundle size by 40% through code splitting and lazy loading\n\nSKILLS\nLanguages: Python, JavaScript, TypeScript, Java, SQL, C++\nFrameworks: React, Node.js, Express, Django, Spring Boot\nTools: Git, Docker, AWS, PostgreSQL, MongoDB, Redis\nConcepts: REST APIs, Microservices, CI/CD, Agile, Test-Driven Development\n\nPROJECTS\nFull-Stack E-Commerce Platform | React, Node.js, PostgreSQL\n- Designed and implemented a complete e-commerce platform with user authentication, payment processing, and admin dashboard\n- Achieved 99.9% uptime with proper error handling and monitoring\n\nReal-Time Chat Application | WebSockets, React, Express\n- Built a scalable chat app supporting 1000+ concurrent users\n- Implemented end-to-end encryption and message persistence`);
                      toast.success("Sample resume loaded. Click 'Scan Resume' to test.");
                    }}
                    className="text-xs text-cyan border-cyan/20 hover:bg-cyan/10"
                  >
                    Load Sample (text preview)
                  </Button>
                </div>
                <Button
                  onClick={handleScan}
                  disabled={isReadingFile || scanMutation.isPending || resumeText.length < 50}
                  className="btn-glow bg-primary text-primary-foreground"
                >
                  {scanMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Scan Resume
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Score Card */}
              <Card className="glass-card border-0 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Your ATS Score</p>
                      <p className={`text-5xl font-bold ${getScoreColor(result.score)}`}>
                        {result.score}
                        <span className="text-2xl text-muted-foreground">/100</span>
                      </p>
                    </div>
                    <div className="relative w-24 h-24">
                      <div className="score-circle w-24 h-24" style={{ "--score": result.score } as React.CSSProperties}>
                        <div className="w-full h-full rounded-full bg-[var(--color-background)] flex items-center justify-center">
                          <Zap className={`h-6 w-6 ${getScoreColor(result.score)}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <Progress value={result.score} className="h-2 mt-4" />
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={handleCopyResult} className="glass-input">
                      <Copy className="mr-2 h-3 w-3" />
                      Copy Results
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Issues & Keywords */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Issues */}
                <Card className="glass-card border-0 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Issues Found ({result.issues.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                    {result.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-accent/20">
                        <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">{issue}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Keywords */}
                <Card className="glass-card border-0 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-cyan" />
                      Keywords
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
                    <div>
                      <p className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Found ({result.foundKeywords.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.foundKeywords.map((kw) => (
                          <Badge key={kw} variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-normal">
                            {kw}
                          </Badge>
                        ))}
                        {result.foundKeywords.length === 0 && (
                          <p className="text-xs text-muted-foreground">No relevant keywords detected</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Missing ({result.missingKeywords.length} shown)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.missingKeywords.map((kw) => (
                          <Badge key={kw} variant="secondary" className="bg-amber-500/15 text-amber-400 border-amber-500/30 font-normal">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {result.buzzwords.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-rose-400 mb-2">Overused Buzzwords</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.buzzwords.map((bw) => (
                            <Badge key={bw} variant="secondary" className="bg-rose-500/15 text-rose-400 border-rose-500/30 font-normal">
                              {bw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Exact Missing Keyword Highlights */}
              <Card className="glass-card border-0 overflow-hidden border-amber-400/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Info className="h-4 w-4 text-amber-400" />
                        Exact missing keyword highlights
                      </CardTitle>
                      <CardDescription className="mt-1">
                        These are the specific ATS terms not detected in this resume. Add them only where they truthfully reflect your experience.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="shrink-0 bg-amber-400/10 text-amber-300 border-amber-400/30">
                      {result.missingKeywords.length} gaps
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {result.missingKeywords.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                      {result.missingKeywords.map((keyword, index) => (
                        <div
                          key={keyword}
                          className="group flex items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-3 transition-colors hover:border-amber-300/50 hover:bg-amber-400/15"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-xs font-semibold text-amber-300">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-amber-100">{keyword}</p>
                            <p className="text-[11px] text-amber-200/60">Not detected in resume</p>
                          </div>
                          <Badge variant="secondary" className="shrink-0 bg-amber-400/15 text-[10px] text-amber-300 border-amber-400/30">
                            Missing
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
                      No missing keywords were found in the active scan.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Save as Resume Version */}
              <Card className="glass-card border-0 overflow-hidden">
                <CardContent className="p-4">
                  <Button
                    variant="outline"
                    onClick={() => saveMutation.mutate({ name: `ATS Scan - ${new Date().toLocaleDateString()}`, content: resumeText, atsScore: result.score })}
                    className="glass-input"
                  >
                    <FileText className="mr-2 h-4 w-4 text-cyan" />
                    Save as Resume Version
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="glass-card border-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Scan History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : historyQuery.data && historyQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {historyQuery.data.map((scan) => (
                    <div key={scan.id} className="glass-card p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                          scan.atsScore >= 80 ? "bg-emerald-500/20 text-emerald-400" :
                          scan.atsScore >= 60 ? "bg-amber-500/20 text-amber-400" :
                          "bg-rose-500/20 text-rose-400"
                        }`}>
                          {scan.atsScore}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            ATS Score: {scan.atsScore}/100
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(scan.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {JSON.parse(scan.foundKeywords || "[]").length} keywords found
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ScanSearch className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No scans yet. Upload your resume to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
