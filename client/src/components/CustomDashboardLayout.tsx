import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  ScanSearch,
  Target,
  Sparkles,
  MessageSquare,
  Map,
  FileDown,
  Zap,
  Mic,
  Github,
  GitBranch,
  ArrowLeftRight,
  Trophy,
  BriefcaseBusiness,
  Rocket,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { AuthScreen } from "./AuthScreen";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Rocket, label: "MNC Launchpad", path: "/launchpad" },
  { icon: ScanSearch, label: "ATS Scanner", path: "/ats-scanner" },
  { icon: Target, label: "Job-Fit Score", path: "/job-fit" },
  { icon: Sparkles, label: "Resume Rewriter", path: "/resume-rewriter" },
  { icon: MessageSquare, label: "Career Coach", path: "/career-coach" },
  { icon: Map, label: "Skill Gap", path: "/skill-gap" },
  { icon: FileDown, label: "PDF Export", path: "/pdf-export" },
  { icon: Mic, label: "Mock Interview", path: "/mock-interview" },
  { icon: Github, label: "GitHub Analyzer", path: "/github-analyzer" },
  { icon: GitBranch, label: "Career Paths", path: "/career-paths" },
  {
    icon: ArrowLeftRight,
    label: "Resume Versions",
    path: "/resume-versions",
  },
  {
    icon: Trophy,
    label: "Career Momentum",
    path: "/gamification",
  },
  {
    icon: BriefcaseBusiness,
    label: "Applications",
    path: "/applications",
  },
];

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("sidebar-width");
    return saved ? parseInt(saved, 10) : 260;
  });

  const { loading, user } = useAuth();
  const [location, setLocation] = useLocation();

  const onboardingQuery = trpc.onboarding.get.useQuery(undefined, {
    enabled: Boolean(user),
  });

  useEffect(() => {
    localStorage.setItem("sidebar-width", sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    if (
      user &&
      onboardingQuery.data &&
      !onboardingQuery.data.completed &&
      location !== "/onboarding"
    ) {
      setLocation("/onboarding");
    }
  }, [user, onboardingQuery.data, location, setLocation]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();

  const isCollapsed = state === "collapsed";

  const [isResizing, setIsResizing] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const sidebarRef = useRef<HTMLDivElement>(null);

  const setPasswordMutation = trpc.auth.setPassword.useMutation({
    onSuccess: () => {
      toast.success(
        "Password enabled. You can now sign in with your email and password."
      );

      setPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmNewPassword("");
    },

    onError: (error) =>
      toast.error(error.message || "Unable to set your password."),
  });

  const activeMenuItem = menuItems.find(
    (item) => item.path === location
  );

  const isMobile = useIsMobile();

  const savePassword = () => {
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setPasswordMutation.mutate({
      password: newPassword,
    });
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft =
        sidebarRef.current?.getBoundingClientRect().left ?? 0;

      const newWidth = e.clientX - sidebarLeft;

      if (newWidth >= 200 && newWidth <= 480) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border bg-sidebar/90 backdrop-blur-xl"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border bg-sidebar/60">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent/50 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>

              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg aurora-gradient flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 text-white" />
                  </div>

                  <span className="font-bold tracking-tight truncate text-sm text-gradient-full">
                    ResumeIQ Pro
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 p-2">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location === item.path;

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 rounded-xl transition-all font-normal ${
                        isActive
                          ? "bg-primary/15 text-primary shadow-[inset_3px_0_0_var(--primary),0_8px_24px_oklch(0.72_0.22_340_/_0.08)]"
                          : "hover:bg-accent/30"
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />

                      <span className="truncate">
                        {item.label}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/30 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 border border-border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/20 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-foreground">
                      {user?.name || "User"}
                    </p>

                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user?.email || ""}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setPasswordDialogOpen(true)}
                  className="cursor-pointer"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>Set email password</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <Dialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
        >
          <DialogContent className="border-white/10 bg-card/95 backdrop-blur-xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Enable email sign-in
              </DialogTitle>

              <DialogDescription>
                Create a password for{" "}
                <strong>{user?.email}</strong>. Your Manus OAuth
                sign-in will continue to work too.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="new-account-password">
                  New password
                </Label>

                <Input
                  id="new-account-password"
                  type="password"
                  minLength={8}
                  maxLength={128}
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-account-password">
                  Confirm password
                </Label>

                <Input
                  id="confirm-account-password"
                  type="password"
                  minLength={8}
                  maxLength={128}
                  value={confirmNewPassword}
                  onChange={(event) =>
                    setConfirmNewPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                />
              </div>

              <Button
                onClick={savePassword}
                disabled={
                  setPasswordMutation.isPending ||
                  newPassword.length < 8 ||
                  confirmNewPassword.length < 8
                }
                className="w-full"
              >
                {setPasswordMutation.isPending
                  ? "Saving…"
                  : "Enable email sign-in"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b border-border h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-accent/30" />

              <span className="tracking-tight text-foreground text-sm font-semibold">
                {activeMenuItem?.label ?? "ResumeIQ Pro"}
              </span>
            </div>
          </div>
        )}

        {/* IMPORTANT:
            Removed "intelligence-grid" from this main element.
            It was causing the bottom of the page to fade out.
        */}
        <main className="flex-1 p-4 lg:p-6 aurora-bg min-h-screen">
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
