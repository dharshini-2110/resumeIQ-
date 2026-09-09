import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ATSScanner from "./pages/ATSScanner";
import JobFitAnalyzer from "./pages/JobFitAnalyzer";
import ResumeRewriter from "./pages/ResumeRewriter";
import CareerCoach from "./pages/CareerCoach";
import SkillGapAnalyzer from "./pages/SkillGapAnalyzer";
import PDFExport from "./pages/PDFExport";
import { DashboardLayout } from "./components/CustomDashboardLayout";
import MockInterview from "./pages/MockInterview";
import GitHubAnalyzer from "./pages/GitHubAnalyzer";
import CareerPathPlanner from "./pages/CareerPathPlanner";
import ResumeVersionManager from "./pages/ResumeVersionManager";
import Gamification from "./pages/Gamification";
import Onboarding from "./pages/Onboarding";
import JobTracker from "./pages/JobTracker";
import MNCCareerLaunch from "./pages/MNCCareerLaunch";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/launchpad" component={MNCCareerLaunch} />
      <Route path="/ats-scanner" component={ATSScanner} />
      <Route path="/job-fit" component={JobFitAnalyzer} />
      <Route path="/resume-rewriter" component={ResumeRewriter} />
      <Route path="/career-coach" component={CareerCoach} />
      <Route path="/skill-gap" component={SkillGapAnalyzer} />
      <Route path="/pdf-export" component={PDFExport} />
      <Route path="/mock-interview" component={MockInterview} />
      <Route path="/github-analyzer" component={GitHubAnalyzer} />
      <Route path="/career-paths" component={CareerPathPlanner} />
      <Route path="/resume-versions" component={ResumeVersionManager} />
      <Route path="/gamification" component={Gamification} />
      <Route path="/career-momentum" component={Gamification} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/applications" component={JobTracker} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster
            theme="light"
            position="top-right"
            richColors
            closeButton
          />

          <DashboardLayout>
            <Router />
          </DashboardLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
