import { eq, desc, and, sql } from "drizzle-orm";
import { getDb } from "./_core/db";
import {
  users,
  onboardingProfiles,
  resumes,
  resumeVersions,
  applications,
  interviewSessions,
  skillGaps,
  githubAnalyses,
  careerPaths,
  gamification,
  xpEvents,
} from "../drizzle/schema";
import { randomUUID } from "node:crypto";

/**
 * ============================================================
 * USER HELPERS
 * ============================================================
 */

export async function getUserByOpenId(openId: string) {
  const db = await getDb();

  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();

  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();

  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(data: {
  email: string;
  passwordHash: string;
}) {
  const db = await getDb();

  if (!db) {
    throw new Error("Database not available");
  }

  const openId = `local_${randomUUID()}`;

  const [result] = await db.insert(users).values({
    openId,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "email_password",
    lastSignedIn: new Date(),
  });

  const created = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(result.insertId)))
    .limit(1);

  if (!created[0]) {
    throw new Error("Local account could not be created");
  }

  return created[0];
}

export async function setUserPassword(
  userId: number,
  passwordHash: string
): Promise<void> {
  const db = await getDb();

  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({
      passwordHash,
      loginMethod: "email_password",
    })
    .where(eq(users.id, userId));
}

export async function upsertUser(data: {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
}) {
  const db = await getDb();

  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await getUserByOpenId(data.openId);

  if (existing) {
    await db
      .update(users)
      .set({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.loginMethod !== undefined
          ? { loginMethod: data.loginMethod }
          : {}),
        ...(data.lastSignedIn !== undefined
          ? { lastSignedIn: data.lastSignedIn }
          : {}),
      })
      .where(eq(users.openId, data.openId));

    return getUserByOpenId(data.openId);
  }

  await db.insert(users).values({
    openId: data.openId,
    name: data.name ?? null,
    email: data.email ?? null,
    loginMethod: data.loginMethod ?? "email_password",
    lastSignedIn: data.lastSignedIn ?? new Date(),
  });

  return getUserByOpenId(data.openId);
}

/**
 * ============================================================
 * ONBOARDING
 * ============================================================
 */

export async function getOnboardingProfile(userId: number) {
  const db = await getDb();

  if (!db) return undefined;

  const result = await db
    .select()
    .from(onboardingProfiles)
    .where(eq(onboardingProfiles.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getOrCreateOnboardingProfile(userId: number) {
  const existing = await getOnboardingProfile(userId);

  if (existing) {
    return existing;
  }

  const db = await getDb();

  if (!db) {
    throw new Error("Database not available");
  }

  await db.insert(onboardingProfiles).values({
    userId,
    currentStep: 0,
    targetRole: null,
    experienceLevel: null,
    interests: JSON.stringify([]),
    selectedTools: JSON.stringify([]),
    completed: 0,
  });

  return getOnboardingProfile(userId);
}

export async function updateOnboardingProfile(
  userId: number,
  data: Partial<{
    currentStep: number;
    targetRole: string | null;
    experienceLevel: string | null;
    interests: string;
    selectedTools: string;
    completed: number;
  }>
) {
  const db = await getDb();

  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(onboardingProfiles)
    .set(data)
    .where(eq(onboardingProfiles.userId, userId));

  return getOnboardingProfile(userId);
}

/**
 * ============================================================
 * RESUMES
 * ============================================================
 */

export async function getResumes(userId: number) {
  const db = await getDb();

  if (!db) return [];

  return db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.createdAt));
}

export async function getResumeById(
  userId: number,
  resumeId: number
) {
  const db = await getDb();

  if (!db) return undefined;

  const result = await db
    .select()
    .from(resumes)
    .where(
      and(
        eq(resumes.id, resumeId),
        eq(resumes.userId, userId)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * ============================================================
 * RESUME VERSIONS
 * ============================================================
 */

export async function getResumeVersions(userId: number) {
  const db = await getDb();

  if (!db) return [];

  return db
    .select()
    .from(resumeVersions)
    .where(eq(resumeVersions.userId, userId))
    .orderBy(desc(resumeVersions.createdAt));
}

/**
 * ============================================================
 * JOB APPLICATIONS
 * ============================================================
 */

export async function getApplications(userId: number) {
  const db = await getDb();

  if (!db) return [];

  return db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.createdAt));
}

export async function getApplicationById(
  userId: number,
  applicationId: number
) {
  const db = await getDb();

  if (!db) return undefined;

  const result = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.userId, userId)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * ============================================================
 * INTERVIEW SESSIONS
 * ============================================================
 */

export async function getInterviewSessions(userId: number) {
  const db = await getDb();

  if (!db) return [];

  return db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.userId, userId))
    .orderBy(desc(interviewSessions.createdAt));
}

/**
 * ============================================================
 * SKILL GAPS
 * ============================================================
 */

export async function getSkillGaps(userId: number) {
  const db = await getDb();

  if (!db) return [];

  return db
    .select()
    .from(skillGaps)
    .where(eq(skillGaps.userId, userId))
    .orderBy(desc(skillGaps.createdAt));
}

/**
 * ============================================================
 * GITHUB ANALYSES
 * ============================================================
 */

export async function getGithubAnalyses(userId: number) {
  const db = await getDb();

  if (!db) return [];

  return db
    .select()
    .from(githubAnalyses)
    .where(eq(githubAnalyses.userId, userId))
    .orderBy(desc(githubAnalyses.createdAt));
}

/**
 * ============================================================
 * CAREER PATHS
 * ============================================================
 */

export async function getCareerPaths(userId: number) {
  const db = await getDb();

  if (!db) return [];

  return db
    .select()
    .from(careerPaths)
    .where(eq(careerPaths.userId, userId))
    .orderBy(desc(careerPaths.createdAt));
}

/**
 * ============================================================
 * GAMIFICATION
 * ============================================================
 */

export async function getGamification(userId: number) {
  const db = await getDb();

  if (!db) return undefined;

  const result = await db
    .select()
    .from(gamification)
    .where(eq(gamification.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getOrCreateGamification(userId: number) {
  const existing = await getGamification(userId);

  if (existing) {
    return existing;
  }

  const db = await getDb();

  if (!db) {
    throw new Error("Database not available");
  }

  await db.insert(gamification).values({
    userId,
    xp: 0,
    level: 1,
    streak: 0,
  });

  return getGamification(userId);
}

export async function awardXP(
  userId: number,
  amount: number,
  reason: string
) {
  const db = await getDb();

  if (!db) {
    throw new Error("Database not available");
  }

  const current = await getOrCreateGamification(userId);

  if (!current) {
    throw new Error("Gamification profile could not be created");
  }

  const newXP = current.xp + amount;
  const newLevel = Math.max(
    1,
    Math.floor(newXP / 100) + 1
  );

  await db
    .update(gamification)
    .set({
      xp: newXP,
      level: newLevel,
    })
    .where(eq(gamification.userId, userId));

  await db.insert(xpEvents).values({
    userId,
    amount,
    reason,
  });

  return getGamification(userId);
}

export async function getXPEvents(userId: number) {
  const db = await getDb();

  if (!db) return [];

  return db
    .select()
    .from(xpEvents)
    .where(eq(xpEvents.userId, userId))
    .orderBy(desc(xpEvents.createdAt));
}
