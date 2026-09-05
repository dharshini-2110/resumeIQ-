import { eq, desc, sql, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  InsertResumeVersion,
  ResumeVersion,
  resumeVersions,
  InsertAtsScan,
  atsScans,
  InsertJobFitResult,
  jobFitResults,
  InsertRewriteSuggestion,
  rewriteSuggestions,
  InsertChatMessage,
  chatMessages,
  InsertSkillGapAnalysis,
  skillGapAnalyses,
  InsertUserProgress,
  userProgress,
  InsertInterviewSession,
  interviewSessions,
  InsertGithubAnalysis,
  githubAnalyses,
  InsertCareerPath,
  careerPaths,
  InterviewSession,
  UserProgress,
  InsertOnboardingProfile,
  onboardingProfiles,
  OnboardingProfile,
  InsertJobApplication,
  jobApplications,
  JobApplication,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(data: {
  email: string;
  passwordHash: string;
}): Promise<NonNullable<Awaited<ReturnType<typeof getUserByOpenId>>>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const openId = `local_${randomUUID()}`;
  const [result] = await db.insert(users).values({
    openId,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "email_password",
    lastSignedIn: new Date(),
  });
  const created = await db.select().from(users).where(eq(users.id, Number(result.insertId))).limit(1);
  if (!created[0]) throw new Error("Local account could not be created");
  return created[0];
}

export async function setUserPassword(userId: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash, loginMethod: "email_password" }).where(eq(users.id, userId));
}

// ─── Resume Versions ───────────────────────────────────────────────────────
export async function createResumeVersion(data: InsertResumeVersion): Promise<ResumeVersion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(resumeVersions).values(data);
  const created = await db.select().from(resumeVersions).where(eq(resumeVersions.id, Number(result.insertId))).limit(1);
  if (!created[0]) throw new Error("Resume version could not be created");
  return created[0];
}

export async function getResumeVersions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(resumeVersions).where(eq(resumeVersions.userId, userId)).orderBy(desc(resumeVersions.createdAt));
}

export async function getResumeVersion(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(resumeVersions).where(eq(resumeVersions.id, id)).limit(1);
  if (result.length === 0 || result[0].userId !== userId) return null;
  return result[0];
}

export async function updateResumeVersion(id: number, updates: Partial<InsertResumeVersion>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(resumeVersions).set(updates).where(eq(resumeVersions.id, id));
}

// ─── ATS Scans ─────────────────────────────────────────────────────────────
export async function createAtsScan(data: InsertAtsScan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(atsScans).values(data);
  return row;
}

export async function getAtsScans(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(atsScans).where(eq(atsScans.userId, userId)).orderBy(desc(atsScans.createdAt));
}

// ─── Job-Fit Results ──────────────────────────────────────────────────────
export async function createJobFitResult(data: InsertJobFitResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(jobFitResults).values(data);
  return row;
}

export async function getJobFitResults(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobFitResults).where(eq(jobFitResults.userId, userId)).orderBy(desc(jobFitResults.createdAt));
}

// ─── Rewrite Suggestions ──────────────────────────────────────────────────
export async function createRewriteSuggestion(data: InsertRewriteSuggestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(rewriteSuggestions).values(data);
  return row;
}

export async function getRewriteSuggestions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rewriteSuggestions).where(eq(rewriteSuggestions.userId, userId)).orderBy(desc(rewriteSuggestions.createdAt));
}

// ─── Chat Messages ────────────────────────────────────────────────────────
export async function addChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(chatMessages).values(data);
  return row;
}

export async function getChatHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(desc(chatMessages.createdAt)).limit(limit);
}

export async function clearChatHistory(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
}

// ─── Skill Gap Analysis ───────────────────────────────────────────────────
export async function createSkillGapAnalysis(data: InsertSkillGapAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(skillGapAnalyses).values(data);
  return row;
}

export async function getSkillGapAnalyses(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skillGapAnalyses).where(eq(skillGapAnalyses.userId, userId)).orderBy(desc(skillGapAnalyses.createdAt));
}

// ─── User Progress / Gamification ─────────────────────────────────────────
export async function getOrCreateUserProgress(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(userProgress).values({
    userId,
    totalXP: 0,
    level: 1,
    badges: JSON.stringify([]),
    currentStreak: 0,
    longestStreak: 0,
    tasksCompleted: 0,
    lastActiveDate: new Date().toISOString().split("T")[0],
  });
  const created = await db.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1);
  return created[0] as UserProgress;
}

export async function updateUserProgress(userId: number, updates: Partial<InsertUserProgress>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userProgress).set(updates).where(eq(userProgress.userId, userId));
}

export async function refreshUserStreak(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const progress = await getOrCreateUserProgress(userId);
  const today = new Date().toISOString().split("T")[0];
  if (progress.lastActiveDate === today) return progress;

  let currentStreak = progress.currentStreak || 0;
  if (progress.lastActiveDate) {
    const lastDate = new Date(progress.lastActiveDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    currentStreak = diffDays === 1 ? currentStreak + 1 : 1;
  } else {
    currentStreak = 1;
  }

  let badges: string[] = [];
  try {
    badges = progress.badges ? JSON.parse(progress.badges) : [];
    if (!Array.isArray(badges)) badges = [];
  } catch {
    badges = [];
  }
  const newBadges = Array.from(new Set(badges));
  if (currentStreak >= 3 && !newBadges.includes("streak_3")) newBadges.push("streak_3");
  if (currentStreak >= 7 && !newBadges.includes("streak_7")) newBadges.push("streak_7");
  if (newBadges.length >= 3 && !newBadges.includes("badge_collector")) newBadges.push("badge_collector");

  await db.update(userProgress).set({
    badges: JSON.stringify(newBadges),
    currentStreak,
    longestStreak: Math.max(progress.longestStreak || 0, currentStreak),
    lastActiveDate: today,
  }).where(eq(userProgress.userId, userId));
  const updated = await db.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1);
  return updated[0] as UserProgress;
}

export async function awardXP(userId: number, amount: number, taskType: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let progress = await getOrCreateUserProgress(userId);
  const newXP = (progress.totalXP || 0) + amount;
  const newLevel = Math.floor(newXP / 100) + 1;
  const today = new Date().toISOString().split("T")[0];
  const lastActive = progress.lastActiveDate;
  let newStreak = progress.currentStreak || 0;
  if (lastActive && lastActive !== today) {
    const lastDate = new Date(lastActive);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
  } else if (!lastActive) {
    newStreak = 1;
  }
  const badges = progress.badges ? JSON.parse(progress.badges) : [];
  const newBadges = Array.from(new Set([...badges]));
  if (newLevel >= 2 && !newBadges.includes("rising_star")) newBadges.push("rising_star");
  if (newStreak >= 3 && !newBadges.includes("streak_3")) newBadges.push("streak_3");
  if (newStreak >= 7 && !newBadges.includes("streak_7")) newBadges.push("streak_7");
  if (newBadges.length >= 3 && !newBadges.includes("badge_collector")) newBadges.push("badge_collector");
  if (newXP >= 200 && !newBadges.includes("power_user")) newBadges.push("power_user");
  if (newXP >= 500 && !newBadges.includes("career_master")) newBadges.push("career_master");
  await db.update(userProgress).set({
    totalXP: newXP,
    level: newLevel,
    badges: JSON.stringify(newBadges),
    currentStreak: newStreak,
    longestStreak: Math.max(progress.longestStreak || 0, newStreak),
    tasksCompleted: (progress.tasksCompleted || 0) + 1,
    lastActiveDate: today,
  }).where(eq(userProgress.userId, userId));
  return { xp: newXP, level: newLevel, badges: newBadges, streak: newStreak };
}

// ─── Interview Sessions ───────────────────────────────────────────────────
export async function createInterviewSession(data: InsertInterviewSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(interviewSessions).values(data);
  const created = await db.select().from(interviewSessions).where(eq(interviewSessions.id, Number(result.insertId))).limit(1);
  if (!created[0]) throw new Error("Interview session could not be created");
  return created[0];
}

export async function getInterviewSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(interviewSessions).where(eq(interviewSessions.userId, userId)).orderBy(desc(interviewSessions.createdAt));
}

export async function updateInterviewSession(id: number, updates: Partial<InsertInterviewSession>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(interviewSessions).set(updates).where(eq(interviewSessions.id, id));
}

// ─── GitHub Analyses ──────────────────────────────────────────────────────
export async function createGithubAnalysis(data: InsertGithubAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(githubAnalyses).values(data);
  return row;
}

export async function getGithubAnalyses(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(githubAnalyses).where(eq(githubAnalyses.userId, userId)).orderBy(desc(githubAnalyses.createdAt));
}

// ─── Career Paths ─────────────────────────────────────────────────────────
export async function createCareerPath(data: InsertCareerPath) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(careerPaths).values(data);
  return row;
}

export async function getCareerPaths(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(careerPaths).where(eq(careerPaths.userId, userId)).orderBy(desc(careerPaths.createdAt));
}


// ─── Guided Onboarding ───────────────────────────────────────────────────────
export async function getOrCreateOnboardingProfile(userId: number): Promise<OnboardingProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(onboardingProfiles).where(eq(onboardingProfiles.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(onboardingProfiles).values({ userId, currentStep: 0, completed: 0, interests: JSON.stringify([]), selectedTools: JSON.stringify([]) });
  const created = await db.select().from(onboardingProfiles).where(eq(onboardingProfiles.userId, userId)).limit(1);
  if (!created[0]) throw new Error("Onboarding profile could not be created");
  return created[0];
}

export async function updateOnboardingProfile(userId: number, updates: Partial<InsertOnboardingProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(onboardingProfiles).set(updates).where(eq(onboardingProfiles.userId, userId));
  const updated = await db.select().from(onboardingProfiles).where(eq(onboardingProfiles.userId, userId)).limit(1);
  return updated[0] ?? null;
}

// ─── Job Application Tracker ─────────────────────────────────────────────────
export async function createJobApplication(data: InsertJobApplication): Promise<JobApplication> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(jobApplications).values(data);
  const created = await db.select().from(jobApplications).where(eq(jobApplications.id, Number(result.insertId))).limit(1);
  if (!created[0]) throw new Error("Job application could not be created");
  return created[0];
}

export async function getJobApplications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobApplications).where(eq(jobApplications.userId, userId)).orderBy(desc(jobApplications.updatedAt));
}

export async function updateJobApplication(id: number, userId: number, updates: Partial<InsertJobApplication>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobApplications).set(updates).where(and(eq(jobApplications.id, id), eq(jobApplications.userId, userId)));
  const updated = await db.select().from(jobApplications).where(and(eq(jobApplications.id, id), eq(jobApplications.userId, userId))).limit(1);
  return updated[0] ?? null;
}

export async function deleteJobApplication(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(jobApplications).where(and(eq(jobApplications.id, id), eq(jobApplications.userId, userId)));
}

export async function getLeaderboard(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
  const rows = await db
    .select({
      userId: userProgress.userId,
      displayName: users.name,
      totalXP: userProgress.totalXP,
      level: userProgress.level,
      currentStreak: userProgress.currentStreak,
      tasksCompleted: userProgress.tasksCompleted,
    })
    .from(userProgress)
    .leftJoin(users, eq(userProgress.userId, users.id))
    .orderBy(desc(userProgress.totalXP))
    .limit(safeLimit);

  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    displayName: row.displayName || "Career builder",
    totalXP: row.totalXP || 0,
    level: row.level || 1,
    currentStreak: row.currentStreak || 0,
    tasksCompleted: row.tasksCompleted || 0,
  }));
}
