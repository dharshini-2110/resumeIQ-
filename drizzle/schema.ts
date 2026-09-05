import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, mediumtext, datetime, uniqueIndex } from "drizzle-orm/mysql-core";

// ─── Core User Table ───────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Resume Versions ───────────────────────────────────────────────────────────
export const resumeVersions = mysqlTable("resumeVersions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  content: mediumtext("content").notNull(),
  atsScore: int("atsScore").default(0).notNull(),
  jobFitScore: int("jobFitScore").default(0),
  jobDescription: text("jobDescription"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ResumeVersion = typeof resumeVersions.$inferSelect;
export type InsertResumeVersion = typeof resumeVersions.$inferInsert;

// ─── ATS Scan Results ──────────────────────────────────────────────────────────
export const atsScans = mysqlTable("atsScans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  resumeVersionId: int("resumeVersionId"),
  resumeContent: mediumtext("resumeContent").notNull(),
  atsScore: int("atsScore").default(0).notNull(),
  issues: mediumtext("issues"),
  foundKeywords: mediumtext("foundKeywords"),
  missingKeywords: mediumtext("missingKeywords"),
  buzzwords: mediumtext("buzzwords"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AtsScan = typeof atsScans.$inferSelect;
export type InsertAtsScan = typeof atsScans.$inferInsert;

// ─── Job-Fit Analysis Results ──────────────────────────────────────────────────
export const jobFitResults = mysqlTable("jobFitResults", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  resumeContent: mediumtext("resumeContent").notNull(),
  jobDescription: mediumtext("jobDescription").notNull(),
  matchScore: int("matchScore").default(0).notNull(),
  gapAnalysis: mediumtext("gapAnalysis"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type JobFitResult = typeof jobFitResults.$inferSelect;
export type InsertJobFitResult = typeof jobFitResults.$inferInsert;

// ─── Resume Rewrite Suggestions ────────────────────────────────────────────────
export const rewriteSuggestions = mysqlTable("rewriteSuggestions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  resumeContent: mediumtext("resumeContent").notNull(),
  suggestions: mediumtext("suggestions").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RewriteSuggestion = typeof rewriteSuggestions.$inferSelect;
export type InsertRewriteSuggestion = typeof rewriteSuggestions.$inferInsert;

// ─── AI Career Coach Chat Messages ─────────────────────────────────────────────
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: mediumtext("content").notNull(),
  context: mediumtext("context"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ─── Skill Gap Analysis ────────────────────────────────────────────────────────
export const skillGapAnalyses = mysqlTable("skillGapAnalyses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  targetRole: varchar("targetRole", { length: 256 }).notNull(),
  resumeContent: mediumtext("resumeContent").notNull(),
  currentSkills: mediumtext("currentSkills"),
  gapSkills: mediumtext("gapSkills"),
  roadmap: mediumtext("roadmap"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SkillGapAnalysis = typeof skillGapAnalyses.$inferSelect;
export type InsertSkillGapAnalysis = typeof skillGapAnalyses.$inferInsert;

// ─── XP / Badges / Streaks (Gamification) ─────────────────────────────────────
export const userProgress = mysqlTable("userProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  totalXP: int("totalXP").default(0).notNull(),
  level: int("level").default(1).notNull(),
  badges: mediumtext("badges"),
  currentStreak: int("currentStreak").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
  lastActiveDate: varchar("lastActiveDate", { length: 10 }),
  tasksCompleted: int("tasksCompleted").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = typeof userProgress.$inferInsert;

// ─── Mock Interview Sessions ───────────────────────────────────────────────────
export const interviewSessions = mysqlTable("interviewSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: varchar("role", { length: 256 }).notNull(),
  questions: mediumtext("questions"),
  sessionState: mysqlEnum("sessionState", ["active", "completed"]).default("active").notNull(),
  feedback: mediumtext("feedback"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type InterviewSession = typeof interviewSessions.$inferSelect;
export type InsertInterviewSession = typeof interviewSessions.$inferInsert;

// ─── GitHub Portfolio Analysis ─────────────────────────────────────────────────
export const githubAnalyses = mysqlTable("githubAnalyses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  githubUsername: varchar("githubUsername", { length: 128 }).notNull(),
  analysis: mediumtext("analysis"),
  score: int("score").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GithubAnalysis = typeof githubAnalyses.$inferSelect;
export type InsertGithubAnalysis = typeof githubAnalyses.$inferInsert;

// ─── Career Path Predictions ───────────────────────────────────────────────────
export const careerPaths = mysqlTable("careerPaths", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  targetRole: varchar("targetRole", { length: 256 }).notNull(),
  currentSkills: mediumtext("currentSkills"),
  predictedPaths: mediumtext("predictedPaths"),
  roadmap: mediumtext("roadmap"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CareerPath = typeof careerPaths.$inferSelect;
export type InsertCareerPath = typeof careerPaths.$inferInsert;

// ─── Guided Onboarding ───────────────────────────────────────────────────────
export const onboardingProfiles = mysqlTable("onboardingProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  currentStep: int("currentStep").default(0).notNull(),
  completed: int("completed").default(0).notNull(),
  targetRole: varchar("targetRole", { length: 256 }),
  experienceLevel: varchar("experienceLevel", { length: 64 }),
  interests: mediumtext("interests"),
  selectedTools: mediumtext("selectedTools"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdUnique: uniqueIndex("onboardingProfiles_userId_unique").on(table.userId),
}));
export type OnboardingProfile = typeof onboardingProfiles.$inferSelect;
export type InsertOnboardingProfile = typeof onboardingProfiles.$inferInsert;

// ─── Job Application Tracker ─────────────────────────────────────────────────
export const jobApplications = mysqlTable("jobApplications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  company: varchar("company", { length: 256 }).notNull(),
  role: varchar("role", { length: 256 }).notNull(),
  location: varchar("location", { length: 256 }),
  jobUrl: varchar("jobUrl", { length: 1024 }),
  salary: varchar("salary", { length: 128 }),
  status: mysqlEnum("status", ["saved", "applied", "interview", "offer", "rejected"]).default("saved").notNull(),
  notes: text("notes"),
  appliedAt: timestamp("appliedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = typeof jobApplications.$inferInsert;
