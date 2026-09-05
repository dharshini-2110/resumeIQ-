import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { hashPassword, verifyPassword } from "./localAuth";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicAuthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as TrpcContext["res"],
  };
}

// Mock the db module to avoid real database calls
vi.mock("./db", () => ({
  createResumeVersion: vi.fn().mockResolvedValue({ id: 1, name: "test", content: "test", atsScore: 0 }),
  getResumeVersions: vi.fn().mockResolvedValue([]),
  getResumeVersion: vi.fn().mockResolvedValue(null),
  updateResumeVersion: vi.fn().mockResolvedValue(undefined),
  createAtsScan: vi.fn().mockResolvedValue(undefined),
  getAtsScans: vi.fn().mockResolvedValue([]),
  createJobFitResult: vi.fn().mockResolvedValue(undefined),
  getJobFitResults: vi.fn().mockResolvedValue([]),
  createRewriteSuggestion: vi.fn().mockResolvedValue(undefined),
  getRewriteSuggestions: vi.fn().mockResolvedValue([]),
  addChatMessage: vi.fn().mockResolvedValue(undefined),
  getChatHistory: vi.fn().mockResolvedValue([]),
  clearChatHistory: vi.fn().mockResolvedValue(undefined),
  createSkillGapAnalysis: vi.fn().mockResolvedValue(undefined),
  getSkillGapAnalyses: vi.fn().mockResolvedValue([]),
  refreshUserStreak: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    totalXP: 0,
    level: 1,
    currentStreak: 2,
    longestStreak: 2,
    badges: "[]",
    lastActiveDate: "2026-08-24",
  }),
  getOrCreateUserProgress: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    totalXP: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    badges: "[]",
    lastActiveDate: null,
  }),
  updateUserProgress: vi.fn().mockResolvedValue(undefined),
  awardXP: vi.fn().mockResolvedValue(undefined),
  createInterviewSession: vi.fn().mockResolvedValue({ id: 1 }),
  getInterviewSessions: vi.fn().mockResolvedValue([]),
  updateInterviewSession: vi.fn().mockResolvedValue(undefined),
  createGithubAnalysis: vi.fn().mockResolvedValue(undefined),
  getGithubAnalyses: vi.fn().mockResolvedValue([]),
  createCareerPath: vi.fn().mockResolvedValue({ id: 1 }),
  getCareerPaths: vi.fn().mockResolvedValue([]),
  getOrCreateOnboardingProfile: vi.fn().mockResolvedValue({ id: 1, userId: 1, completed: 0, currentStep: 0, targetRole: null, experienceLevel: null, interests: "[]", selectedTools: "[]" }),
  updateOnboardingProfile: vi.fn().mockImplementation(async (_userId, updates) => ({ id: 1, userId: 1, completed: 0, currentStep: 0, ...updates })),
  createJobApplication: vi.fn().mockResolvedValue({ id: 1, userId: 1, company: "Acme", role: "Engineer", status: "saved" }),
  getJobApplications: vi.fn().mockResolvedValue([]),
  updateJobApplication: vi.fn().mockImplementation(async (id, _userId, updates) => ({ id, userId: 1, company: "Acme", role: "Engineer", status: "saved", ...updates })),
  deleteJobApplication: vi.fn().mockResolvedValue(undefined),
  getUserByEmail: vi.fn().mockResolvedValue(undefined),
  createLocalUser: vi.fn().mockResolvedValue({ id: 2, openId: "local_test", email: "new@example.com", name: null, loginMethod: "email_password", passwordHash: "scrypt:test:test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  setUserPassword: vi.fn().mockResolvedValue(undefined),
}));

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockImplementation(async () => {
    // Return a polymorphic response based on which procedure calls it.
    // The caller distinguishes via the system prompt content, but we can
    // return a union-shape that satisfies all Tier 1 callers.
    return {
      choices: [{ message: { content: JSON.stringify({
        // Job-fit fields
        matchScore: 75,
        summary: "Good match overall.",
        matchedSkills: ["javascript", "react", "typescript"],
        missingSkills: ["graphql", "aws"],
        suggestions: ["Add AWS experience"],
        // Skill-gap fields
        currentSkills: ["HTML", "CSS", "JavaScript"],
        gapSkills: [{ name: "React", priority: "high", reason: "Core frontend framework" }],
        roadmap: [{ step: 1, skill: "React", action: "Learn basics", resources: ["react.dev"], timeline: "2 weeks" }],
        // Rewriter fields
        overallScore: 45,
        weakBullets: [{ original: "Worked on project", improved: "Developed and deployed full-stack platform", reason: "Stronger action verb + quantified result" }],
        generalTips: ["Use action verbs at the start of each bullet"],
        actionVerbs: ["Developed", "Implemented", "Designed"],
        strengths: ["Shows progression"],
        // Career coach
        reply: "Great question! Here's my advice on transitioning to fullstack...",
      }) } }],
    };
  }),
}));

describe("Tier 1 Server Procedures", () => {
  describe("auth.me", () => {
    it("returns the current user", async () => {
      const ctx = createTestContext();
      (ctx.user as AuthenticatedUser & { passwordHash?: string }).passwordHash = "scrypt:private";
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      expect(result).toBeDefined();
      expect(result?.name).toBe("Test User");
      expect(result?.email).toBe("test@example.com");
      expect(result).not.toHaveProperty("passwordHash");
    });
  });

  describe("auth.logout", () => {
    it("clears the session cookie", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.logout();
      expect(result).toEqual({ success: true });
    });
  });

  describe("ats.scan", () => {
    it("analyzes resume content and returns score", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.ats.scan({
        content: `John Doe - Software Engineer
Experience: Developed full-stack applications using React and Node.js. 
Implemented CI/CD pipelines with Docker and Kubernetes.
Managed a team of 5 engineers. Increased performance by 40%.
Skills: JavaScript, TypeScript, Python, AWS, React, Express
Education: BS Computer Science
Projects: Built a microservices platform serving 10K+ users.`,
      });

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.foundKeywords).toBeDefined();
      expect(result.missingKeywords).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.foundKeywords)).toBe(true);
      expect(Array.isArray(result.missingKeywords)).toBe(true);
      expect(result.missingKeywords).toContain("c++");
      expect(result.missingKeywords).not.toContain("react");
    });

    it("returns exact missing keywords in the bounded advice list", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.ats.scan({ content: "A plain resume summary with experience, education, skills, and projects." });
      expect(result.missingKeywords.slice(0, 3)).toEqual(["python", "java", "javascript"]);
    });

    it("rejects content shorter than 50 characters", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.ats.scan({ content: "too short" })).rejects.toThrow();
    });
  });

  describe("ats.history", () => {
    it("returns scan history", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.ats.history();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("ats score calculation - strong resume", () => {
    it("gives high score for well-written resume with metrics", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.ats.scan({
        content: `Senior Software Engineer

Experience:
- Developed and deployed microservices architecture serving 50K+ daily active users
- Implemented CI/CD pipeline reducing deployment time by 60%
- Designed and built REST APIs using Node.js, Express, and PostgreSQL
- Led a team of 8 engineers using Agile methodology
- Optimized database queries reducing response time by 45%
- Automated testing with 95% code coverage using Jest and Cypress
- Collaborated with cross-functional teams on product launches

Skills: JavaScript, TypeScript, Python, React, Node.js, AWS, Docker, Kubernetes, PostgreSQL, MongoDB, GraphQL, Git, Agile

Education: MS Computer Science

Projects: Built a real-time analytics dashboard processing 1M+ events/day using Apache Kafka and Redis`,
      });

      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.foundKeywords.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe("ats score calculation - weak resume", () => {
    it("gives low score for poorly written resume", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.ats.scan({
        content: `I am looking for a job. I worked at a company for some time.
I did some coding and helped the team.
I know some programming stuff.`,
      });

      expect(result.score).toBeLessThan(60);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe("progress.get", () => {
    it("returns user progress", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.progress.get();
      expect(result).toBeDefined();
      expect(typeof result.totalXP).toBe("number");
      expect(typeof result.level).toBe("number");
    });
  });

  describe("progress.refreshStreak", () => {
    it("uses the centralized streak helper", async () => {
      const { refreshUserStreak } = await import("./db");
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.progress.refreshStreak();
      expect(result.currentStreak).toBe(2);
      expect(refreshUserStreak).toHaveBeenCalledWith(ctx.user?.id);
    });
  });

  describe("Tier 2 happy paths", () => {
    it("starts an interview session with generated questions", async () => {
      vi.mocked(invokeLLM).mockImplementationOnce(async () => ({ choices: [{ message: { content: JSON.stringify({ questions: [
        { question: "Explain a recent systems decision.", type: "domain", category: "domain knowledge", whatItTests: "Role knowledge and judgment", learningDetails: ["Review core concepts", "Practice explaining trade-offs"], answerFramework: "Context, approach, trade-off, outcome", talkingPoints: ["Name the principle used", "Connect the decision to impact"] },
        { question: "Tell me about a team challenge.", type: "behavioral", category: "collaboration", whatItTests: "Communication and ownership", learningDetails: ["Prepare a STAR story"], answerFramework: "Situation, task, action, result", talkingPoints: ["Focus on your contribution"] },
      ] }) } }] }) as any);
      const caller = appRouter.createCaller(createTestContext());
      const result = await caller.interview.startSession({ role: "Software Engineer" });
      expect(result.sessionId).toBe(1);
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]?.type).toBe("domain");
      expect(result.questions[0]?.learningDetails).toContain("Review core concepts");
    });

    it("evaluates an interview answer with structured scores", async () => {
      vi.mocked(invokeLLM).mockImplementationOnce(async () => ({ choices: [{ message: { content: JSON.stringify({
        scores: { clarity: 8, structure: 7, technicalDepth: 9, relevance: 8 },
        overallScore: 8,
        feedback: "Clear and technically grounded.",
        improvements: ["Add a measurable outcome."],
      }) } }] }) as any);
      const caller = appRouter.createCaller(createTestContext());
      const result = await caller.interview.evaluateAnswer({ question: "Describe your API design.", answer: "I designed a versioned API with validation, observability, and tests for reliable client integration.", type: "domain" });
      expect(result.overallScore).toBe(8);
      expect(result.scores.technicalDepth).toBe(9);
      expect(result.improvements).toContain("Add a measurable outcome.");
    });

    it("predicts career paths with nested roadmap steps", async () => {
      vi.mocked(invokeLLM).mockImplementationOnce(async () => ({ choices: [{ message: { content: JSON.stringify({
        paths: [{ name: "Platform Engineer", probability: "High", steps: [{ title: "Build systems depth", timeline: "3 months", skills: ["Linux"], description: "Practice production systems." }] }],
        recommendedPath: 0,
        keyInsights: ["Your backend experience is a strong foundation."],
      }) } }] }) as any);
      const caller = appRouter.createCaller(createTestContext());
      const result = await caller.careerPath.predict({ resumeContent: "Experienced software engineer building APIs, distributed services, and developer tooling across several production projects.", targetRole: "Platform Engineer" });
      expect(result.paths[0]?.steps[0]?.title).toBe("Build systems depth");
      expect(result.recommendedPath).toBe(0);
    });
  });

  describe("Tier 2 input validation", () => {
    it("rejects malformed GitHub usernames before making an external request", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.github.analyze({ username: "not a github user" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("rejects oversized career path resumes", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.careerPath.predict({
        resumeContent: "x".repeat(30_001),
        targetRole: "Software Engineer",
      })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  describe("pdfExport.getVersions", () => {
    it("returns list of resume versions", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.pdfExport.getVersions();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("careerCoach.sendMessage", () => {
    it("responds to career coaching questions", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.careerCoach.sendMessage({
        message: "How do I transition from frontend to fullstack?",
      });
      expect(result).toBeDefined();
      expect(typeof result.reply).toBe("string");
      expect(result.reply.length).toBeGreaterThan(10);
    });
  });

  describe("jobFit.analyze", () => {
    it("analyzes resume against job description", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.jobFit.analyze({
        resumeContent: `Experienced React developer with 3 years of experience building scalable web applications. Skills: JavaScript, TypeScript, React, Node.js, AWS.`,
        jobDescription: `We are looking for a Senior Frontend Engineer with experience in React, TypeScript, and cloud platforms. Must have experience with CI/CD and team leadership.`,
      });
      expect(result).toBeDefined();
      expect(typeof result.matchScore).toBe("number");
      expect(result.matchScore).toBeGreaterThanOrEqual(0);
      expect(result.matchScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.matchedSkills)).toBe(true);
      expect(Array.isArray(result.missingSkills)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  describe("skillGap.analyze", () => {
    it("identifies skill gaps for a target role", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.skillGap.analyze({
        targetRole: "Senior Full Stack Engineer",
        resumeContent: `Junior developer with 1 year experience. Skills: HTML, CSS, basic JavaScript.`,
      });
      expect(result).toBeDefined();
      expect(Array.isArray(result.currentSkills)).toBe(true);
      expect(Array.isArray(result.gapSkills)).toBe(true);
      expect(Array.isArray(result.roadmap)).toBe(true);
      expect(typeof result.summary).toBe("string");
    });
  });

  describe("rewriter.rewrite", () => {
    it("suggests improvements for resume bullet points", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.rewriter.rewrite({
        content: `Worked on a project for the company. Helped improve the website. Responsible for managing a team.`,
      });
      expect(result).toBeDefined();
      expect(typeof result.overallScore).toBe("number");
      expect(Array.isArray(result.weakBullets)).toBe(true);
      expect(Array.isArray(result.generalTips)).toBe(true);
      expect(Array.isArray(result.actionVerbs)).toBe(true);
      expect(Array.isArray(result.strengths)).toBe(true);
    });
  });

  describe("rewriter tone selection", () => {
    it("passes the selected tone through and produces tone-specific suggestions", async () => {
      const responseFor = (improved: string) => ({
        choices: [{ message: { content: JSON.stringify({
          overallScore: 70,
          weakBullets: [{ original: "Worked on dashboards", improved, reason: "Tone-specific rewrite" }],
          generalTips: ["Keep the impact measurable"],
          actionVerbs: ["Led", "Designed"],
          strengths: ["Clear ownership"],
        }) } }],
      }) as any;
      vi.mocked(invokeLLM)
        .mockImplementationOnce(async () => responseFor("Led an executive dashboard initiative that improved decision velocity."))
        .mockImplementationOnce(async () => responseFor("Reimagined a vivid, intuitive dashboard experience that energized stakeholder discovery."));

      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const content = "Worked on dashboards for the product team and helped improve reporting workflows.";
      const executive = await caller.rewriter.rewrite({ content, tone: "Executive" });
      const creative = await caller.rewriter.rewrite({ content, tone: "Creative" });

      expect(executive.tone).toBe("Executive");
      expect(creative.tone).toBe("Creative");
      expect(executive.weakBullets[0]?.improved).not.toBe(creative.weakBullets[0]?.improved);
      expect(vi.mocked(invokeLLM).mock.calls.at(-2)?.[0]?.messages?.[1]?.content).toContain("Executive");
      expect(vi.mocked(invokeLLM).mock.calls.at(-1)?.[0]?.messages?.[1]?.content).toContain("Creative");
    });
  });

  describe("pdfExport.generateReport", () => {
    it("generates career report HTML", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.pdfExport.generateReport({
        type: "career_report",
      });
      expect(result).toBeDefined();
      expect(typeof result.html).toBe("string");
      expect(result.html).toContain("ResumeIQ Pro");
      expect(typeof result.content).toBe("string");
    });

    it("generates resume export HTML", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.pdfExport.generateReport({
        type: "resume",
        resumeContent: "John Doe - Software Engineer with 3 years experience...",
      });
      expect(result).toBeDefined();
      expect(typeof result.html).toBe("string");
      expect(result.html).toContain("John Doe");
    });
  });
});


describe("Onboarding and application tracker procedures", () => {
  it("saves onboarding progress and completes the setup flow", async () => {
    const caller = appRouter.createCaller(createTestContext());
    const saved = await caller.onboarding.save({
      currentStep: 2,
      targetRole: "Frontend Engineer",
      experienceLevel: "student",
      interests: ["web development"],
      selectedTools: ["ATS Scanner", "Mock Interview"],
    });
    expect(saved.currentStep).toBe(2);
    const completed = await caller.onboarding.complete();
    expect(completed.completed).toBe(1);
    expect(completed.currentStep).toBe(5);
  });

  it("creates and updates a user-scoped job application", async () => {
    const caller = appRouter.createCaller(createTestContext());
    const created = await caller.applications.create({
      company: "Acme",
      role: "Software Engineer",
      location: "Remote",
      status: "saved",
      notes: "Tailor resume before applying",
    });
    expect(created.id).toBe(1);
    const updated = await caller.applications.update({ id: 1, status: "applied" });
    expect(updated.status).toBe("applied");
    await expect(caller.applications.delete({ id: 1 })).resolves.toEqual({ success: true });
  });

  it("rejects oversized application notes safely", async () => {
    const caller = appRouter.createCaller(createTestContext());
    await expect(caller.applications.create({
      company: "Acme",
      role: "Engineer",
      notes: "x".repeat(5_001),
      status: "saved",
    })).rejects.toThrow();
  });
});


describe("Email-password authentication", () => {
  it("hashes passwords without storing plaintext and verifies them safely", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^scrypt:[^:]+:[a-f0-9]{128}$/);
    expect(hash).not.toContain("correct horse");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("registers a normalized local account and issues a session cookie", async () => {
    const ctx = createPublicAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.auth.register({ email: "  New@Example.com ", password: "password123" });
    expect(vi.mocked(db.createLocalUser)).toHaveBeenCalledWith(expect.objectContaining({ email: "new@example.com" }));
    expect(vi.mocked(ctx.res.cookie)).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({ httpOnly: true }));
  });

  it("rejects duplicate accounts and invalid credentials without revealing password state", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValueOnce({ id: 2, openId: "local_existing", email: "existing@example.com", name: null, loginMethod: "email_password", passwordHash: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as any);
    const caller = appRouter.createCaller(createPublicAuthContext());
    await expect(caller.auth.register({ email: "existing@example.com", password: "password123" })).rejects.toMatchObject({ code: "CONFLICT" });

    vi.mocked(db.getUserByEmail).mockResolvedValueOnce(undefined);
    await expect(caller.auth.login({ email: "missing@example.com", password: "password123" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("explains how OAuth-only accounts can enable local sign-in", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValueOnce({ id: 1, openId: "oauth_user", email: "oauth@example.com", name: "OAuth User", loginMethod: "google", passwordHash: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as any);
    const caller = appRouter.createCaller(createPublicAuthContext());
    await expect(caller.auth.login({ email: "oauth@example.com", password: "password123" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: expect.stringContaining("Manus OAuth"),
    });
  });

  it("accepts a valid local password and refreshes the signed-in timestamp", async () => {
    const passwordHash = await hashPassword("password123");
    vi.mocked(db.getUserByEmail).mockResolvedValueOnce({ id: 3, openId: "local_valid", email: "valid@example.com", name: null, loginMethod: "email_password", passwordHash, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as any);
    const ctx = createPublicAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.auth.login({ email: "VALID@example.com", password: "password123" });
    expect(vi.mocked(db.upsertUser)).toHaveBeenCalledWith(expect.objectContaining({ openId: "local_valid", lastSignedIn: expect.any(Date) }));
    expect(vi.mocked(ctx.res.cookie)).toHaveBeenCalled();
  });
});


describe("OAuth account password setup", () => {
  it("stores a new password hash for the authenticated user", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    await caller.auth.setPassword({ password: "password123" });
    expect(vi.mocked(db.setUserPassword)).toHaveBeenCalledWith(1, expect.stringMatching(/^scrypt:/));
  });
});
