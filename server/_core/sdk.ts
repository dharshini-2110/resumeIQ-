import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  userId: number;
  name: string;
};

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;

    if (!secret) {
      throw new Error(
        "JWT_SECRET is not configured. Please set JWT_SECRET in the environment."
      );
    }

    return new TextEncoder().encode(secret);
  }

  /**
   * Create a local ResumeIQ session token.
   *
   * This does NOT use Manus OAuth.
   */
  async createSessionToken(
    userId: number,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        userId,
        name: options.name || "",
      },
      options
    );
  }

  /**
   * Sign a local JWT session.
   */
  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor(
      (issuedAt + expiresInMs) / 1000
    );

    const secretKey = this.getSessionSecret();

    return new SignJWT({
      userId: payload.userId,
      name: payload.name,
    })
      .setProtectedHeader({
        alg: "HS256",
        typ: "JWT",
      })
      .setIssuedAt(Math.floor(issuedAt / 1000))
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  /**
   * Verify a local ResumeIQ session token.
   */
  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ userId: number; name: string } | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();

      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });

      const userId = payload.userId;
      const name = payload.name;

      if (
        (typeof userId !== "number" && typeof userId !== "string") ||
        !isNonEmptyString(name)
      ) {
        return null;
      }

      const numericUserId =
        typeof userId === "number" ? userId : Number(userId);

      if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
        return null;
      }

      return {
        userId: numericUserId,
        name,
      };
    } catch {
      return null;
    }
  }

  /**
   * Authenticate a request using our own ResumeIQ session cookie.
   */
  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);

    /*
     * Also allow Authorization: Bearer <token>.
     *
     * This is useful for clients where cookies are blocked.
     */
    if (!sessionToken) {
      const authHeader = req.headers.authorization;

      if (
        typeof authHeader === "string" &&
        authHeader.startsWith("Bearer ")
      ) {
        sessionToken = authHeader.slice(7);
      }
    }

    const session = await this.verifySession(sessionToken);

    if (!session) {
      throw ForbiddenError("Invalid or expired session");
    }

    const user = await db.getUserById(session.userId);

    if (!user) {
      throw ForbiddenError("User not found");
    }

    /*
     * Keep the lastSignedIn timestamp fresh.
     */
    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: new Date(),
    });

    return user;
  }
}

export const sdk = new SDKServer();
