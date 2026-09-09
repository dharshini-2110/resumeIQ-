import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM, type InvokeResult } from "./_core/llm";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { createLocalUser, getUserByEmail, setUserPassword } from "./db";
import { hashPassword, normalizeEmail, verifyPassword } from "./localAuth";

function extractTextContent(response: InvokeResult): string {
  const content = response.choices[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(c => c.type === 'text')
      .map(c => ('text' in c ? c.text : ''))
      .join('\n');
  }
  return '';
}

const GITHUB_REQUEST_TIMEOUT_MS = 8_000;

async function fetchGithubJson(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "ResumeIQ-Pro",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}
import {
  createResumeVersion,
  getResumeVersions,
  getResumeVersion,
  updateResumeVersion,
  createAtsScan,
  getAtsScans,
  createJobFitResult,
  getJobFitResults,
  createRewriteSuggestion,
  getRewriteSuggestions,
  addChatMessage,
  getChatHistory,
  clearChatHistory,
  createSkillGapAnalysis,
  getSkillGapAnalyses,
  getOrCreateUserProgress,
  refreshUserStreak,
  updateUserProgress,
  awardXP,
  createInterviewSession,
  getInterviewSessions,
  updateInterviewSession,
  createGithubAnalysis,
  getGithubAnalyses,
  createCareerPath,
  getCareerPaths,
  getLeaderboard,
  getOrCreateOnboardingProfile,
  updateOnboardingProfile,
  createJobApplication,
  getJobApplications,
  updateJobApplication,
  deleteJobApplication,
} from "./db";

const ATS_KEYWORDS = [
  // Programming languages
  "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "swift", "kotlin",
  "ruby", "php", "scala", "r", "matlab", "sql", "html", "css", "dart",
  // Frameworks & libraries
  "react", "node.js", "express", "django", "flask", "spring", "angular", "vue",
  "next.js", "fastapi", "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn",
  // Cloud & DevOps
  "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "ci/cd", "terraform",
  "ansible", "nginx", "redis", "mongodb", "postgresql", "mysql",
  // Concepts & methodologies
  "agile", "scrum", "git", "github", "rest api", "graphql", "microservices",
  "machine learning", "deep learning", "nlp", "computer vision", "data analysis",
  "test-driven", "unit testing", "ci/cd", "devops", "object-oriented",
  // Soft skills
  "leadership", "team", "communication", "problem-solving", "analytical",
  // Action verbs
  "developed", "implemented", "designed", "built", "created", "managed",
  "optimized", "reduced", "increased", "led", "collaborated", "deployed",
  "architected", "maintained", "refactored", "automated", "scaled",
];

const ATS_ISSUES_PATTERN = [
  { pattern: /\t/g, description: "Tab characters detected (use spaces instead)", severity: "warning" },
  { pattern: /[^\x20-\x7E\n\r\t]/g, description: "Non-standard characters detected", severity: "warning" },
  { pattern: /skill|skills|experience|education|project|work|summary|objective/i, description: "Standard section headers found", severity: "info" },
  { pattern: /bullet|•|·|▸|→/g, description: "Bullet points found", severity: "info" },
  { pattern: /\d+%|\d+ months|\d+ years/g, description: "Quantified metrics found (good!)", severity: "success" },
  { pattern: /\b(I|me|my)\b/g, description: "First-person pronouns detected (reduce usage)", severity: "warning" },
];

function calculateATSScore(content: string): { score: number; issues: string[]; foundKeywords: string[]; missingKeywords: string[]; buzzwords: string[] } {
  const lower = content.toLowerCase();
  let score = 50;
  const issues: string[] = [];
  
  // Check for action verbs
  const actionVerbs = ["developed", "implemented", "designed", "built", "created", "managed", "optimized", "reduced", "increased", "led", "collaborated", "deployed", "architected", "maintained", "refactored", "automated", "scaled"];
  const foundVerbs = actionVerbs.filter(v => lower.includes(v));
  if (foundVerbs.length >= 3) {
    score += 10;
  } else if (foundVerbs.length >= 1) {
    score += 5;
    issues.push("Only found " + foundVerbs.length + " action verb(s). Use more: developed, implemented, designed, built, optimized.");
  } else {
    issues.push("No strong action verbs found. Start bullet points with verbs like: Developed, Implemented, Designed, Built, Optimized.");
  }

  // Check for quantified metrics
  const metrics = lower.match(/\d+%|\d+ months?|\d+ years?|\d+\+\?/g) || [];
  if (metrics.length >= 2) {
    score += 10;
  } else if (metrics.length >= 1) {
    score += 5;
    issues.push("Only " + metrics.length + " quantified metric(s) found. Add more numbers (% improvement, time saved, scale).");
  } else {
    issues.push("No quantified metrics found. Add numbers: percentages, timeframes, team sizes, scale.");
  }

  // Check for section headers
  const sections = ["education", "experience", "skills", "projects", "summary", "objective"];
  const foundSections = sections.filter(s => lower.includes(s));
  if (foundSections.length >= 3) {
    score += 10;
  } else if (foundSections.length >= 1) {
    score += 5;
    issues.push("Only " + foundSections.length + " standard section(s) found. Include: Education, Experience, Skills, Projects.");
  } else {
    issues.push("Missing standard resume sections. Include clear headers: Education, Experience, Skills, Projects.");
  }

  // Check length
  if (content.length > 500) {
    score += 5;
  } else {
    issues.push("Resume seems too short. Aim for at least 1-2 pages of content.");
  }

  // Check for keywords
  const foundKeywords = ATS_KEYWORDS.filter(k => lower.includes(k));
  const missingKeywords = ATS_KEYWORDS.filter(k => !lower.includes(k));

  if (foundKeywords.length >= 10) {
    score += 10;
  } else if (foundKeywords.length >= 5) {
    score += 5;
    issues.push("Limited technical keywords detected (" + foundKeywords.length + "). Add relevant skills and technologies.");
  } else {
    issues.push("Very few technical keywords (" + foundKeywords.length + "). This will hurt ATS matching.");
  }

  // Check for first-person overuse
  const firstPerson = (lower.match(/\b(i|me|my)\b/g) || []).length;
  if (firstPerson > 5) {
    score -= 5;
    issues.push("Excessive first-person pronouns (" + firstPerson + " occurrences). Use action-verb-first format instead.");
  }

  // Check for buzzwords
  const buzzwords = ["synergy", "leverage", "paradigm", "disrupt", "rockstar", "ninja", "guru", "wizard", "thought leader"];
  const foundBuzzwords = buzzwords.filter(b => lower.includes(b));
  if (foundBuzzwords.length > 0) {
    issues.push("Overused buzzwords detected: " + foundBuzzwords.join(", ") + ". Replace with specific, concrete language.");
    score -= 3;
  }

  score = Math.max(0, Math.min(100, score));
  
  // Add top missing keywords as advice
  const topMissing = missingKeywords.slice(0, 10);

  return { score, issues, foundKeywords, missingKeywords: topMissing, buzzwords: foundBuzzwords };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      const { passwordHash: _passwordHash, ...safeUser } = ctx.user;
      return safeUser;
    }),
    register: publicProcedure
      .input(z.object({
        email: z.string().trim().email().max(320),
        password: z.string().min(8).max(128),
      }))
      .mutation(async ({ input, ctx }) => {
        const email = normalizeEmail(input.email);
        const existing = await getUserByEmail(email);
        if (existing) {
          const message = existing.passwordHash
            ? "An account with this email already exists. Sign in with its local password."
            : "This email belongs to an existing account with a different sign-in method. Use that account’s sign-in method, or create a separate account with another email address.";
          throw new TRPCError({ code: "CONFLICT", message });
        }

        const user = await createLocalUser({
          email,
          passwordHash: await hashPassword(input.password),
        });
        const sessionToken = await sdk.createSessionToken(user.openId, { name: email.split("@")[0] || email });
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: 1000 * 60 * 60 * 24 * 365,
        });
        return { success: true } as const;
      }),
    setPassword: protectedProcedure
      .input(z.object({ password: z.string().min(8).max(128) }))
      .mutation(async ({ input, ctx }) => {
        await setUserPassword(ctx.user.id, await hashPassword(input.password));
        return { success: true } as const;
      }),
    login: publicProcedure
      .input(z.object({
        email: z.string().trim().email().max(320),
        password: z.string().min(1).max(128),
      }))
      .mutation(async ({ input, ctx }) => {
        const email = normalizeEmail(input.email);
        const user = await getUserByEmail(email);
        if (user && !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "This email uses Manus OAuth. Sign in with Manus OAuth first, then choose Set email password from your profile menu." });
        }
        const valid = Boolean(user?.passwordHash && await verifyPassword(input.password, user.passwordHash));
        if (!user || !valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }

        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        const sessionToken = await sdk.createSessionToken(user.openId, { name: email.split("@")[0] || email });
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: 1000 * 60 * 60 * 24 * 365,
        });
        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── ATS Scanner ────────────────────────────────────────────────────────
  ats: router({
    scan: protectedProcedure.input(z.object({
      content: z.string().min(50, "Resume content must be at least 50 characters"),
    })).mutation(async ({ ctx, input }) => {
      try {
        const result = calculateATSScore(input.content);
        await createAtsScan({
          userId: ctx.user.id,
          resumeContent: input.content,
          atsScore: result.score,
          issues: JSON.stringify(result.issues),
          foundKeywords: JSON.stringify(result.foundKeywords),
          missingKeywords: JSON.stringify(result.missingKeywords),
          buzzwords: JSON.stringify(result.buzzwords),
        });
        await awardXP(ctx.user.id, 25, "ats_scan");
        return result;
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to analyze resume. Please try again." });
      }
    }),
    history: protectedProcedure.query(async ({ ctx }) => {
      return getAtsScans(ctx.user.id);
    }),
  }),

  // ─── Job-Fit Analyzer ───────────────────────────────────────────────────
  jobFit: router({
    analyze: protectedProcedure.input(z.object({
      resumeContent: z.string().min(50, "Resume content required"),
      jobDescription: z.string().min(20, "Job description required"),
    })).mutation(async ({ ctx, input }) => {
      try {
        const response = await invokeLLM({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: `You are an expert career advisor and recruiter. Analyze the resume against the job description and provide:
1. A match score (0-100) representing how well the resume fits the job
2. A gap analysis listing specific skills/qualifications missing from the resume
3. Specific suggestions for improvement

Return JSON with this exact structure:
{"matchScore": number, "summary": "string", "matchedSkills": ["string"], "missingSkills": ["string"], "suggestions": ["string"]}`
            },
            {
              role: "user",
              content: `Resume:\n${input.resumeContent}\n\nJob Description:\n${input.jobDescription}`
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "job_fit_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  matchScore: { type: "integer", description: "Match score 0-100" },
                  summary: { type: "string", description: "Brief summary of fit" },
                  matchedSkills: { type: "array", items: { type: "string" }, description: "Skills that match" },
                  missingSkills: { type: "array", items: { type: "string" }, description: "Missing skills/qualifications" },
                  suggestions: { type: "array", items: { type: "string" }, description: "Improvement suggestions" },
                },
                required: ["matchScore", "summary", "matchedSkills", "missingSkills", "suggestions"],
                additionalProperties: false,
              },
            },
          },
        });
        const result = JSON.parse(extractTextContent(response));
        await createJobFitResult({
          userId: ctx.user.id,
          resumeContent: input.resumeContent,
          jobDescription: input.jobDescription,
          matchScore: result.matchScore,
          gapAnalysis: JSON.stringify(result),
        });
        await awardXP(ctx.user.id, 30, "job_fit_analysis");
        return result;
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to analyze job fit. Please try again." });
      }
    }),
    history: protectedProcedure.query(async ({ ctx }) => {
      return getJobFitResults(ctx.user.id);
    }),
  }),

  // ─── Resume Rewriter ────────────────────────────────────────────────────
  rewriter: router({
    rewrite: protectedProcedure.input(z.object({
      content: z.string().min(50, "Resume content required"),
      tone: z.enum(["Executive", "Creative", "Technical", "Conversational"]).default("Executive"),
    })).mutation(async ({ ctx, input }) => {
      try {
        const response = await invokeLLM({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: `You are an expert resume coach. Analyze the resume and suggest improvements focused on:
1. Stronger action verbs (replacing weak language like "helped with", "worked on")
2. Quantifiable impact (adding numbers, percentages, scale)
3. STAR format restructuring (Situation, Task, Action, Result)
4. Removing buzzwords and filler language
5. Better phrasing and professional tone
6. Match the selected output tone exactly: ${input.tone}. Executive should sound concise and strategic; Creative should be vivid but professional; Technical should emphasize systems, methods, and precision; Conversational should be warm and natural while remaining polished.

Return JSON with this exact structure:
{"overallScore": number, "weakBullets": [{"original": "string", "improved": "string", "reason": "string"}], "generalTips": ["string"], "actionVerbs": ["string"], "strengths": ["string"]}`
            },
            {
              role: "user",
              content: `Please analyze and improve this resume in a ${input.tone} tone. Preserve factual accuracy and do not invent achievements.\n\nResume:\n${input.content}`
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "rewrite_suggestions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  overallScore: { type: "integer", description: "Overall resume quality score 0-100" },
                  weakBullets: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        original: { type: "string" },
                        improved: { type: "string" },
                        reason: { type: "string" },
                      },
                      required: ["original", "improved", "reason"],
                      additionalProperties: false,
                    },
                  },
                  generalTips: { type: "array", items: { type: "string" } },
                  actionVerbs: { type: "array", items: { type: "string" } },
                  strengths: { type: "array", items: { type: "string" } },
                },
                required: ["overallScore", "weakBullets", "generalTips", "actionVerbs", "strengths"],
                additionalProperties: false,
              },
            },
          },
        });
        const result = JSON.parse(extractTextContent(response));
        result.tone = input.tone;
        await createRewriteSuggestion({
          userId: ctx.user.id,
          resumeContent: input.content,
          suggestions: JSON.stringify(result),
        });
        await awardXP(ctx.user.id, 25, "resume_rewrite");
        return result;
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate rewrite suggestions. Please try again." });
      }
    }),
    history: protectedProcedure.query(async ({ ctx }) => {
      return getRewriteSuggestions(ctx.user.id);
    }),
  }),

  // ─── Career Coach Chat ──────────────────────────────────────────────────
  careerCoach: router({
    sendMessage: protectedProcedure.input(z.object({
      message: z.string().min(1, "Message required"),
      resumeContent: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      try {
        // Save user message
        await addChatMessage({
          userId: ctx.user.id,
          role: "user",
          content: input.message,
          context: input.resumeContent ? JSON.stringify({ resumeContent: input.resumeContent }) : null,
        });

        // Get chat history for context
        const history = await getChatHistory(ctx.user.id, 20);
        const messages = history.reverse().map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        // Get user's resume context if available
        const versions = await getResumeVersions(ctx.user.id);
        const latestResume = versions.length > 0 ? versions[0].content : input.resumeContent || "";

        const response = await invokeLLM({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: `You are ResumeIQ Pro's Career Coach — an expert placement advisor for engineering/CS students. You help with:
- Resume optimization and ATS preparation
- Interview preparation (technical and behavioral)
- Career path planning and skill development
- Salary negotiation strategies
- Job search strategies

Your current client's resume context:
${latestResume ? latestResume.slice(0, 3000) : "No resume uploaded yet."}

Be specific, actionable, and encouraging. Reference their actual resume content when relevant. Keep responses concise (under 300 words) unless deep analysis is needed. Use markdown formatting when helpful.`
            },
            ...messages,
          ],
        });
        const assistantReply = extractTextContent(response) || "I'm here to help with your career questions!";

        await addChatMessage({
          userId: ctx.user.id,
          role: "assistant",
          content: assistantReply,
        });

        await awardXP(ctx.user.id, 10, "career_coach_chat");
        return { reply: assistantReply };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to get AI response. Please try again." });
      }
    }),
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      return getChatHistory(ctx.user.id, 50);
    }),
    clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
      await clearChatHistory(ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Skill Gap Analyzer ─────────────────────────────────────────────────
  skillGap: router({
    analyze: protectedProcedure.input(z.object({
      resumeContent: z.string().min(50, "Resume content required"),
      targetRole: z.string().min(2, "Target role required"),
    })).mutation(async ({ ctx, input }) => {
      try {
        const response = await invokeLLM({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: `You are an expert career development advisor. Given a resume and a target role, identify:
1. Current skills (already demonstrated)
2. Gap skills (needed but missing)
3. A detailed learning roadmap with specific resources

Return JSON with this exact structure:
{"currentSkills": ["string"], "gapSkills": [{"name": "string", "priority": "high|medium|low", "reason": "string"}], "roadmap": [{"step": number, "skill": "string", "action": "string", "resources": ["string"], "timeline": "string"}], "summary": "string"}`
            },
            {
              role: "user",
              content: `Resume:\n${input.resumeContent}\n\nTarget Role: ${input.targetRole}`
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "skill_gap_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  currentSkills: { type: "array", items: { type: "string" } },
                  gapSkills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        reason: { type: "string" },
                      },
                      required: ["name", "priority", "reason"],
                      additionalProperties: false,
                    },
                  },
                  roadmap: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        step: { type: "integer" },
                        skill: { type: "string" },
                        action: { type: "string" },
                        resources: { type: "array", items: { type: "string" } },
                        timeline: { type: "string" },
                      },
                      required: ["step", "skill", "action", "resources", "timeline"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string" },
                },
                required: ["currentSkills", "gapSkills", "roadmap", "summary"],
                additionalProperties: false,
              },
            },
          },
        });
        const result = JSON.parse(extractTextContent(response));
        await createSkillGapAnalysis({
          userId: ctx.user.id,
          targetRole: input.targetRole,
          resumeContent: input.resumeContent,
          currentSkills: JSON.stringify(result.currentSkills),
          gapSkills: JSON.stringify(result.gapSkills),
          roadmap: JSON.stringify(result),
        });
        await awardXP(ctx.user.id, 35, "skill_gap_analysis");
        return result;
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to analyze skill gaps. Please try again." });
      }
    }),
    history: protectedProcedure.query(async ({ ctx }) => {
      return getSkillGapAnalyses(ctx.user.id);
    }),
  }),

  // ─── PDF Export ─────────────────────────────────────────────────────────
  pdfExport: router({
    generateReport: protectedProcedure.input(z.object({
      type: z.enum(["resume", "career_report"]),
      resumeContent: z.string().optional(),
      analysisData: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      try {
        let content = "";
        if (input.type === "resume" && input.resumeContent) {
          content = input.resumeContent;
        } else if (input.type === "career_report") {
          // Gather all analysis data
          const atsScans = await getAtsScans(ctx.user.id);
          const jobFits = await getJobFitResults(ctx.user.id);
          const rewrites = await getRewriteSuggestions(ctx.user.id);
          const skillGaps = await getSkillGapAnalyses(ctx.user.id);
          const progress = await getOrCreateUserProgress(ctx.user.id);

          content = `# ResumeIQ Pro — Career Intelligence Report\n\n`;
          content += `Generated for: ${ctx.user.name || "User"}\nDate: ${new Date().toLocaleDateString()}\n\n`;
          content += `## Profile Summary\n`;
          content += `XP: ${progress.totalXP} | Level: ${progress.level} | Streak: ${progress.currentStreak} days\n\n`;
          
          if (atsScans.length > 0) {
            content += `## ATS Score History\n`;
            content += `Latest ATS Score: ${atsScans[0].atsScore}/100\n`;
            content += `Total Scans: ${atsScans.length}\n\n`;
          }
          
          if (jobFits.length > 0) {
            content += `## Job-Fit Analyses\n`;
            content += `Total Analyses: ${jobFits.length}\n`;
            content += `Best Match Score: ${Math.max(...jobFits.map(j => j.matchScore))}%\n\n`;
          }
          
          if (rewrites.length > 0) {
            content += `## Resume Improvements\n`;
            content += `Total Rewrites: ${rewrites.length}\n\n`;
          }
          
          if (skillGaps.length > 0) {
            content += `## Skill Gap Analyses\n`;
            content += `Total Analyses: ${skillGaps.length}\n\n`;
          }

          content += `## Recommendations\n`;
          content += `Continue using ResumeIQ Pro tools regularly to improve your career readiness.\n`;
          content += `Focus on closing skill gaps identified in your analyses.\n`;
          content += `Maintain your daily streak to earn more XP and badges.\n`;
        }

        await awardXP(ctx.user.id, 20, "pdf_export");

        // Generate HTML for PDF conversion
        const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 40px; color: #1a1a2e; background: #fff; }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
  .header h1 { margin: 0; font-size: 28px; }
  .header p { margin: 8px 0 0; opacity: 0.9; }
  .section { margin-bottom: 24px; }
  .section h2 { color: #667eea; border-bottom: 2px solid #e8e8f0; padding-bottom: 8px; font-size: 20px; }
  .resume-content { background: #f8f9fa; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; font-size: 13px; }
  .stats { display: flex; gap: 20px; margin: 20px 0; }
  .stat { background: #f0f0ff; padding: 15px; border-radius: 8px; flex: 1; text-align: center; }
  .stat .value { font-size: 24px; font-weight: bold; color: #667eea; }
  .stat .label { font-size: 12px; color: #666; margin-top: 4px; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8e8f0; color: #999; font-size: 12px; }
  pre { white-space: pre-wrap; font-family: 'Inter', system-ui, sans-serif; font-size: 14px; line-height: 1.6; }
</style>
</head>
<body>
  <div class="header">
    <h1>ResumeIQ Pro</h1>
    <p>AI-Powered Career Intelligence Report</p>
  </div>
  ${input.type === "career_report" ? `<pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>` : `<div class="resume-content">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`}
  <div class="footer">
    Generated by ResumeIQ Pro — AI-Powered Career Intelligence Platform
  </div>
</body>
</html>`;

        return { html, content };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate export. Please try again." });
      }
    }),
    saveResumeVersion: protectedProcedure.input(z.object({
      name: z.string().min(1, "Version name required"),
      content: z.string().min(50, "Resume content required"),
      atsScore: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const version = await createResumeVersion({
        userId: ctx.user.id,
        name: input.name,
        content: input.content,
        atsScore: input.atsScore || 0,
      });
      await awardXP(ctx.user.id, 15, "save_resume_version");
      return version;
    }),
    getVersions: protectedProcedure.query(async ({ ctx }) => {
      return getResumeVersions(ctx.user.id);
    }),
    getVersion: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      return getResumeVersion(input.id, ctx.user.id);
    }),
  }),

  // ─── Resume Version Manager (Tier 2) ────────────────────────────────────
  resumeVersions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getResumeVersions(ctx.user.id);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { resumeVersions: rv } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      await db.delete(rv).where(and(eq(rv.id, input.id), eq(rv.userId, ctx.user.id)));
      return { success: true };
    }),
  }),

  // ─── Mock Interview Simulator (Tier 2) ──────────────────────────────────
  interview: router({
    startSession: protectedProcedure.input(z.object({
      role: z.string().trim().min(2, "Target role required").max(256, "Target role is too long"),
    })).mutation(async ({ ctx, input }) => {
      try {
        const response = await invokeLLM({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: `Generate 5 interview questions for a ${input.role} position. Make the set useful for any profession, not only software engineering. Mix behavioral, situational, domain, and role-specific questions as appropriate. For each question include what the interviewer is evaluating, preparation topics, an answer framework, and neutral talking-point guidance that does not invent the candidate’s experience. Return JSON: {"questions": [{"question": "string", "type": "behavioral|situational|domain|role_specific", "category": "string", "whatItTests": "string", "learningDetails": ["string"], "answerFramework": "string", "talkingPoints": ["string"]}]}`
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "interview_questions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        type: { type: "string", enum: ["behavioral", "situational", "domain", "role_specific"] },
                        category: { type: "string" },
                        whatItTests: { type: "string" },
                        learningDetails: { type: "array", items: { type: "string" } },
                        answerFramework: { type: "string" },
                        talkingPoints: { type: "array", items: { type: "string" } },
                      },
                      required: ["question", "type", "category", "whatItTests", "learningDetails", "answerFramework", "talkingPoints"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        });
        const result = JSON.parse(extractTextContent(response));
        const session = await createInterviewSession({
          userId: ctx.user.id,
          role: input.role,
          questions: JSON.stringify(result.questions),
          sessionState: "active",
        });
        await awardXP(ctx.user.id, 20, "start_interview");
        return { sessionId: session.id, questions: result.questions };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to start interview session." });
      }
    }),
    evaluateAnswer: protectedProcedure.input(z.object({
      question: z.string().trim().min(1, "Question required").max(2_000, "Question is too long"),
      answer: z.string().trim().min(10, "Answer required").max(12_000, "Answer is too long"),
      type: z.enum(["behavioral", "situational", "domain", "role_specific"]),
    })).mutation(async ({ ctx, input }) => {
      try {
        const response = await invokeLLM({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: `Evaluate this interview answer. Score it 1-10 on: clarity, structure, role knowledge (adapt this to the question type), and relevance. Return JSON: {"scores": {"clarity": number, "structure": number, "technicalDepth": number, "relevance": number}, "overallScore": number, "feedback": "string", "improvements": ["string"]}`
            },
            {
              role: "user",
              content: `Question type (${input.type}): ${input.question}\n\nAnswer: ${input.answer}`
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "answer_evaluation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  scores: {
                    type: "object",
                    properties: {
                      clarity: { type: "integer" },
                      structure: { type: "integer" },
                      technicalDepth: { type: "integer" },
                      relevance: { type: "integer" },
                    },
                    required: ["clarity", "structure", "technicalDepth", "relevance"],
                    additionalProperties: false,
                  },
                  overallScore: { type: "integer" },
                  feedback: { type: "string" },
                  improvements: { type: "array", items: { type: "string" } },
                },
                required: ["scores", "overallScore", "feedback", "improvements"],
                additionalProperties: false,
              },
            },
          },
        });
        const result = JSON.parse(extractTextContent(response));
        await awardXP(ctx.user.id, 15, "answer_evaluation");
        return result;
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to evaluate answer." });
      }
    }),
    getSessions: protectedProcedure.query(async ({ ctx }) => {
      return getInterviewSessions(ctx.user.id);
    }),
  }),

  // ─── GitHub Portfolio Analyzer (Tier 2) ─────────────────────────────────
  github: router({
    analyze: protectedProcedure.input(z.object({
      username: z.string().trim().min(1, "GitHub username required").max(39, "GitHub username is too long").regex(/^[A-Za-z0-9-]+$/, "Enter a valid GitHub username"),
    })).mutation(async ({ ctx, input }) => {
      try {
        // Fetch public repos via GitHub API (no auth needed)
        const reposRes = await fetchGithubJson(`https://api.github.com/users/${encodeURIComponent(input.username)}/repos?per_page=30&sort=updated`);
        if (!reposRes.ok) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "GitHub user not found or rate limited. Please try again later." });
        }
        const repos = await reposRes.json() as any[];
        const eventsRes = await fetchGithubJson(`https://api.github.com/users/${encodeURIComponent(input.username)}/events/public?per_page=100`);
        const recentActivityCount = eventsRes.ok ? (await eventsRes.json() as unknown[]).length : null;

        if (repos.length === 0) {
          const result = {
            username: input.username,
            score: 10,
            summary: "No public repositories found. Start by creating and pushing some projects!",
            topRepos: [],
            techStack: [],
            repositoriesReviewed: 0,
            recentActivityCount,
            suggestions: ["Create public repositories for your projects", "Add README files to all repos", "Include a portfolio project"],
          };
          await createGithubAnalysis({ userId: ctx.user.id, githubUsername: input.username, analysis: JSON.stringify(result), score: result.score });
          await awardXP(ctx.user.id, 10, "github_analysis");
          return result;
        }

        // Analyze repos
        const techStack = new Set<string>();
        repos.forEach(r => { if (r.language) techStack.add(r.language); });
        const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
        const totalForks = repos.reduce((s, r) => s + (r.forks_count || 0), 0);

        let score = 30;
        if (repos.length >= 5) score += 10;
        if (repos.length >= 10) score += 10;
        if (techStack.size >= 3) score += 10;
        if (techStack.size >= 5) score += 10;
        if (totalStars >= 5) score += 5;
        if (totalStars >= 20) score += 5;
        if (recentActivityCount && recentActivityCount > 0) score += 5;
        if (repos.some(r => r.description)) score += 10;
        if (repos.some(r => r.readme)) score += 5;

        score = Math.min(100, Math.max(0, score));

        const topRepos = repos
          .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
          .slice(0, 5)
          .map(r => ({
            name: r.name,
            description: r.description || "No description",
            stars: r.stargazers_count,
            language: r.language || "Unknown",
            url: r.html_url,
          }));

        const result = {
          username: input.username,
          score,
          summary: `Found ${repos.length} repositories with ${techStack.size} languages. ${totalStars} total stars.`,
          topRepos,
          techStack: Array.from(techStack),
          repositoriesReviewed: repos.length,
          recentActivityCount,
          suggestions: [
            repos.length < 5 ? "Create more public repositories to showcase your work" : null,
            techStack.size < 3 ? "Diversify your tech stack across projects" : null,
            !repos.some(r => r.description) ? "Add descriptions to your repositories" : null,
            "Pin your best 3 repositories on your GitHub profile",
            "Ensure all repos have proper README files",
          ].filter(Boolean),
        };

        await createGithubAnalysis({ userId: ctx.user.id, githubUsername: input.username, analysis: JSON.stringify(result), score: result.score });
        await awardXP(ctx.user.id, 25, "github_analysis");
        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to analyze GitHub profile. Please try again." });
      }
    }),
    history: protectedProcedure.query(async ({ ctx }) => {
      return getGithubAnalyses(ctx.user.id);
    }),
  }),

  // ─── Career Path Prediction (Tier 2) ────────────────────────────────────
  careerPath: router({
    predict: protectedProcedure.input(z.object({
      resumeContent: z.string().trim().min(50, "Resume content required").max(30_000, "Resume content is too long"),
      targetRole: z.string().trim().min(2, "Target role required").max(256, "Target role is too long"),
    })).mutation(async ({ ctx, input }) => {
      try {
        const response = await invokeLLM({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: `Given a resume and target role, predict 3 plausible career paths and generate a visual roadmap for each. Return JSON:
{"paths": [{"name": "string", "steps": [{"title": "string", "timeline": "string", "skills": ["string"], "description": "string"}], "probability": "string"}], "recommendedPath": number, "keyInsights": ["string"]}`
            },
            {
              role: "user",
              content: `Resume:\n${input.resumeContent}\n\nTarget Role: ${input.targetRole}`
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "career_path_prediction",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  paths: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        steps: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string" },
                              timeline: { type: "string" },
                              skills: { type: "array", items: { type: "string" } },
                              description: { type: "string" },
                            },
                            required: ["title", "timeline", "skills", "description"],
                            additionalProperties: false,
                          },
                        },
                        probability: { type: "string" },
                      },
                      required: ["name", "steps", "probability"],
                      additionalProperties: false,
                    },
                  },
                  recommendedPath: { type: "integer" },
                  keyInsights: { type: "array", items: { type: "string" } },
                },
                required: ["paths", "recommendedPath", "keyInsights"],
                additionalProperties: false,
              },
            },
          },
        });
        const result = JSON.parse(extractTextContent(response));
        await createCareerPath({
          userId: ctx.user.id,
          targetRole: input.targetRole,
          currentSkills: JSON.stringify([]),
          predictedPaths: JSON.stringify(result),
          roadmap: JSON.stringify(result),
        });
        await awardXP(ctx.user.id, 30, "career_path_prediction");
        return result;
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to predict career paths." });
      }
    }),
    history: protectedProcedure.query(async ({ ctx }) => {
      return getCareerPaths(ctx.user.id);
    }),
  }),

  // ─── Guided Onboarding ───────────────────────────────────────────────────
  onboarding: router({
    get: protectedProcedure.query(async ({ ctx }) => getOrCreateOnboardingProfile(ctx.user.id)),
    save: protectedProcedure.input(z.object({
      currentStep: z.number().int().min(0).max(5),
      targetRole: z.string().trim().max(256).optional(),
      experienceLevel: z.string().trim().max(64).optional(),
      interests: z.array(z.string().trim().min(1).max(80)).max(12),
      selectedTools: z.array(z.string().trim().min(1).max(80)).max(12),
    })).mutation(async ({ ctx, input }) => {
      await getOrCreateOnboardingProfile(ctx.user.id);
      return updateOnboardingProfile(ctx.user.id, {
        currentStep: input.currentStep,
        targetRole: input.targetRole || null,
        experienceLevel: input.experienceLevel || null,
        interests: JSON.stringify(input.interests),
        selectedTools: JSON.stringify(input.selectedTools),
      });
    }),
    complete: protectedProcedure.mutation(async ({ ctx }) => {
      await getOrCreateOnboardingProfile(ctx.user.id);
      const profile = await updateOnboardingProfile(ctx.user.id, { completed: 1, currentStep: 5 });
      await awardXP(ctx.user.id, 20, "onboarding_complete");
      return profile;
    }),
  }),

  // ─── Job Application Tracker ─────────────────────────────────────────────
  applications: router({
    list: protectedProcedure.query(async ({ ctx }) => getJobApplications(ctx.user.id)),
    create: protectedProcedure.input(z.object({
      company: z.string().trim().min(1, "Company is required").max(256),
      role: z.string().trim().min(1, "Role is required").max(256),
      location: z.string().trim().max(256).optional(),
      jobUrl: z.string().trim().max(1024).optional(),
      salary: z.string().trim().max(128).optional(),
      status: z.enum(["saved", "applied", "interview", "offer", "rejected"]).default("saved"),
      notes: z.string().trim().max(5_000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const application = await createJobApplication({
        userId: ctx.user.id,
        company: input.company,
        role: input.role,
        location: input.location || null,
        jobUrl: input.jobUrl || null,
        salary: input.salary || null,
        status: input.status,
        notes: input.notes || null,
        appliedAt: input.status === "applied" ? new Date() : null,
      });
      await awardXP(ctx.user.id, 5, "save_job_application");
      return application;
    }),
    update: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      company: z.string().trim().min(1).max(256).optional(),
      role: z.string().trim().min(1).max(256).optional(),
      location: z.string().trim().max(256).optional(),
      jobUrl: z.string().trim().max(1024).optional(),
      salary: z.string().trim().max(128).optional(),
      status: z.enum(["saved", "applied", "interview", "offer", "rejected"]).optional(),
      notes: z.string().trim().max(5_000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const updated = await updateJobApplication(id, ctx.user.id, {
        ...updates,
        ...(updates.status === "applied" ? { appliedAt: new Date() } : {}),
      });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      return updated;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await deleteJobApplication(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── User Progress / Gamification ───────────────────────────────────────
  progress: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getOrCreateUserProgress(ctx.user.id);
    }),
    refreshStreak: protectedProcedure.mutation(async ({ ctx }) => {
      return refreshUserStreak(ctx.user.id);
    }),
    leaderboard: protectedProcedure.query(async () => {
      return getLeaderboard(10);
    }),
  }),
});

export type AppRouter = typeof appRouter;
