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
  KeyRound,
} from "lucide-react";
import {
  CSSProperties,
  useEffect,
  useRef,
  useState,
} from "react";
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

const menuItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
  },
  {
    icon: Rocket,
    label: "MNC Launchpad",
    path: "/launchpad",
  },
  {
    icon: ScanSearch,
    label: "ATS Scanner",
    path: "/ats-scanner",
  },
  {
    icon: Target,
    label: "Job-Fit Score",
    path: "/job-fit",
  },
  {
    icon: Sparkles,
    label: "Resume Rewriter",
    path: "/resume-rewriter",
  },
  {
    icon: MessageSquare,
    label: "Career Coach",
    path: "/career-coach",
  },
  {
    icon: Map,
    label: "Skill Gap",
    path: "/skill-gap",
  },
  {
    icon: FileDown,
    label: "PDF Export",
    path: "/pdf-export",
  },
  {
    icon: Mic,
    label: "Mock Interview",
    path: "/mock-interview",
  },
  {
    icon: Github,
    label: "GitHub Analyzer",
    path: "/github-analyzer",
  },
  {
    icon: GitBranch,
    label: "Career Paths",
    path: "/career-paths",
  },
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
    if (typeof window === "undefined") {
      return 260;
    }

    const saved =
      localStorage.getItem("sidebar-width");

    const parsed = saved
      ? parseInt(saved, 10)
      : 260;

    if (
      Number.isNaN(parsed) ||
      parsed < 220 ||
      parsed > 420
    ) {
      return 260;
    }

    return parsed;
  });

  const { loading, user } = useAuth();
  const [location, setLocation] =
    useLocation();

  const onboardingQuery =
    trpc.onboarding.get.useQuery(
      undefined,
      {
        enabled: Boolean(user),
      }
    );

  useEffect(() => {
    localStorage.setItem(
      "sidebar-width",
      sidebarWidth.toString()
    );
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
  }, [
    user,
    onboardingQuery.data,
    location,
    setLocation,
  ]);

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
      <DashboardLayoutContent
        setSidebarWidth={setSidebarWidth}
      >
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

  const [location, setLocation] =
    useLocation();

  const {
    state,
    toggleSidebar,
  } = useSidebar();

  const isCollapsed =
    state === "collapsed";

  const isMobile = useIsMobile();

  const [isResizing, setIsResizing] =
    useState(false);

  const [
    passwordDialogOpen,
    setPasswordDialogOpen,
  ] = useState(false);

  const [newPassword, setNewPassword] =
    useState("");

  const [
    confirmNewPassword,
    setConfirmNewPassword,
  ] = useState("");

  const sidebarRef =
    useRef<HTMLDivElement>(null);

  const setPasswordMutation =
    trpc.auth.setPassword.useMutation({
      onSuccess: () => {
        toast.success(
          "Password enabled. You can now sign in with your email and password."
        );

        setPasswordDialogOpen(false);
        setNewPassword("");
        setConfirmNewPassword("");
      },

      onError: (error) => {
        toast.error(
          error.message ||
            "Unable to set your password."
        );
      },
    });

  const activeMenuItem =
    menuItems.find(
      (item) => item.path === location
    );

  const savePassword = () => {
    if (newPassword.length < 8) {
      toast.error(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (
      newPassword !==
      confirmNewPassword
    ) {
      toast.error(
        "Passwords do not match."
      );
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
    const handleMouseMove = (
      event: MouseEvent
    ) => {
      if (!isResizing) {
        return;
      }

      const sidebarLeft =
        sidebarRef.current?.getBoundingClientRect()
          .left ?? 0;

      const newWidth =
        event.clientX - sidebarLeft;

      if (
        newWidth >= 220 &&
        newWidth <= 420
      ) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener(
        "mousemove",
        handleMouseMove
      );

      document.addEventListener(
        "mouseup",
        handleMouseUp
      );

      document.body.style.cursor =
        "col-resize";

      document.body.style.userSelect =
        "none";
    }

    return () => {
      document.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      document.removeEventListener(
        "mouseup",
        handleMouseUp
      );

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [
    isResizing,
    setSidebarWidth,
  ]);

  const firstLetter =
    user?.name
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || "U";

  return (
    <>
      <div
        ref={sidebarRef}
        className="relative"
      >
        <Sidebar
          collapsible="icon"
          disableTransition={
            isResizing
          }
          className="border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl"
        >
          {/* Header */}
          <SidebarHeader className="h-16 border-b border-sidebar-border bg-sidebar/70 px-3">
            <div className="flex h-full items-center gap-3">
              <button
                type="button"
                onClick={toggleSidebar}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4" />
              </button>

              {!isCollapsed && (
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl aurora-gradient shadow-sm">
                    <Zap className="h-4 w-4 text-white" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold tracking-tight text-gradient-full">
                      ResumeIQ Pro
                    </p>

                    <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Career Intelligence
                    </p>
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent className="px-2 py-3">
            <SidebarMenu className="space-y-1">
              {menuItems.map(
                (item) => {
                  const isActive =
                    location ===
                    item.path;

                  const Icon =
                    item.icon;

                  return (
                    <SidebarMenuItem
                      key={item.path}
                    >
                      <SidebarMenuButton
                        isActive={
                          isActive
                        }
                        onClick={() =>
                          setLocation(
                            item.path
                          )
                        }
                        tooltip={
                          item.label
                        }
                        className={[
                          "group relative h-11 rounded-xl",
                          "font-medium transition-all duration-200",
                          "focus-visible:ring-2 focus-visible:ring-ring",
                          isActive
                            ? "bg-primary/12 text-primary shadow-sm"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                        ].join(" ")}
                      >
                        <Icon
                          className={[
                            "h-[18px] w-[18px] shrink-0 transition-transform duration-200",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground",
                            !isActive
                              ? "group-hover:scale-105"
                              : "",
                          ].join(" ")}
                        />

                        <span className="truncate">
                          {item.label}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
              )}
            </SidebarMenu>
          </SidebarContent>

          {/* User */}
          <SidebarFooter className="border-t border-sidebar-border bg-sidebar/60 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger
                asChild
              >
                <button
                  type="button"
                  className={[
                    "group flex w-full items-center gap-3 rounded-xl p-2",
                    "text-left transition-all duration-200",
                    "hover:bg-accent/60",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isCollapsed
                      ? "justify-center"
                      : "",
                  ].join(" ")}
                >
                  <Avatar className="h-9 w-9 shrink-0 border border-border shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {firstLetter}
                    </AvatarFallback>
                  </Avatar>

                  {!isCollapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-5 text-foreground">
                        {user?.name ||
                          "User"}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {user?.email ||
                          ""}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                side={
                  isCollapsed
                    ? "right"
                    : "top"
                }
                className="w-56 rounded-xl p-1.5"
              >
                <DropdownMenuItem
                  onClick={() =>
                    setPasswordDialogOpen(
                      true
                    )
                  }
                  className="cursor-pointer rounded-lg"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>
                    Set email password
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer rounded-lg text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>
                    Sign out
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Password Dialog */}
        <Dialog
          open={passwordDialogOpen}
          onOpenChange={
            setPasswordDialogOpen
          }
        >
          <DialogContent className="border-border bg-card/95 backdrop-blur-xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Enable email sign-in
              </DialogTitle>

              <DialogDescription>
                Create a password for{" "}
                <strong>
                  {user?.email}
                </strong>
                . Your existing sign-in
                will continue to work.
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
                    setNewPassword(
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="h-11 rounded-xl"
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
                  value={
                    confirmNewPassword
                  }
                  onChange={(event) =>
                    setConfirmNewPassword(
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  className="h-11 rounded-xl"
                />
              </div>

              <Button
                onClick={savePassword}
                disabled={
                  setPasswordMutation.isPending ||
                  newPassword.length <
                    8 ||
                  confirmNewPassword.length <
                    8
                }
                className="h-11 w-full rounded-xl"
              >
                {setPasswordMutation.isPending
                  ? "Saving..."
                  : "Enable email sign-in"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Resize handle */}
        {!isCollapsed && (
          <div
            className="absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/20"
            onMouseDown={() =>
              setIsResizing(true)
            }
            aria-hidden="true"
          />
        )}
      </div>

      <SidebarInset>
        {/* Mobile header */}
        {isMobile && (
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/90 px-3 backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-xl bg-accent/40" />

              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg aurora-gradient">
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>

                <span className="truncate text-sm font-semibold text-foreground">
                  {activeMenuItem?.label ||
                    "ResumeIQ Pro"}
                </span>
              </div>
            </div>
          </header>
        )}

        {/* Main content */}
        <main className="min-h-screen flex-1 aurora-bg p-4 lg:p-6">
          <div className="relative z-10 mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
