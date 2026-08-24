import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);

export async function hashSecret(secret: string, salt = randomBytes(16).toString("hex")) {
  const derived = (await scrypt(secret, salt, 64)) as Buffer;
  return { salt, hash: derived.toString("hex") };
}

export async function verifySecret(secret: string, salt: string, expectedHash: string) {
  const derived = (await scrypt(secret, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function makeVerificationCode() {
  return `OU-${randomBytes(4).toString("hex").toUpperCase()}-${new Date().getFullYear()}`;
}
