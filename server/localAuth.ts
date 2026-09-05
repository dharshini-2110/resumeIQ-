import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, encodedKey] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !encodedKey || encodedKey.length !== KEY_LENGTH * 2) {
    return false;
  }

  try {
    const expectedKey = Buffer.from(encodedKey, "hex");
    const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
    return expectedKey.length === derivedKey.length && timingSafeEqual(expectedKey, derivedKey);
  } catch {
    return false;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
