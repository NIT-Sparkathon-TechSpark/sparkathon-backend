import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Organization sign-in (docs/plan/org-accounts.md), built like the researcher passcode in spec 0001:
 * no auth library, a passcode stored as a scrypt hash, and a signed HttpOnly cookie that names one
 * organization and expires after 12 hours. Server only.
 *
 * Cookie value: "<org id>.<expiry ms>.<HMAC-SHA256 of both, base64url>".
 * Secret: ORG_COOKIE_SECRET, or RESEARCHER_COOKIE_SECRET when that's the only one set.
 */

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const ORG_COOKIE = "centaur_org";
const TWELVE_HOURS = 12 * 60 * 60;
const KEY_LENGTH = 32;

export class OrgAuthNotConfigured extends Error {
  constructor() {
    super("Set ORG_COOKIE_SECRET (or RESEARCHER_COOKIE_SECRET) to a random string of 32+ characters.");
  }
}

function secret(): string {
  const value = process.env.ORG_COOKIE_SECRET || process.env.RESEARCHER_COOKIE_SECRET;
  if (!value || value.length < 16) throw new OrgAuthNotConfigured();
  return value;
}

// ---------------------------------------------------------------------------------------------
// Passcodes

export async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(passcode, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

// Used when no organization matches, so a wrong ID and a wrong passcode take the same time.
const DUMMY_HASH = `scrypt$${"00".repeat(16)}$${"00".repeat(KEY_LENGTH)}`;

export async function verifyPasscode(passcode: string, stored: string | null): Promise<boolean> {
  const [scheme, saltHex, hashHex] = (stored ?? DUMMY_HASH).split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(passcode, Buffer.from(saltHex, "hex"), expected.length || KEY_LENGTH);
  return stored !== null && expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ---------------------------------------------------------------------------------------------
// Cookie

const sign = (payload: string) => createHmac("sha256", secret()).update(`org:${payload}`).digest("base64url");

/** The signed-in organization's id, or null when there's no valid, unexpired cookie. */
export async function readOrgId(): Promise<string | null> {
  const value = (await cookies()).get(ORG_COOKIE)?.value;
  if (!value) return null;
  const [orgId, expires, signature] = value.split(".");
  if (!orgId || !expires || !signature || !/^[0-9a-f-]{36}$/.test(orgId)) return null;
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now()) return null;

  let expected: string;
  try {
    expected = sign(`${orgId}.${expires}`);
  } catch {
    return null; // not configured: nobody is signed in
  }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? orgId : null;
}

/** Server Actions only. Throws OrgAuthNotConfigured when no secret is set. */
export async function setOrgCookie(orgId: string): Promise<void> {
  const expires = Date.now() + TWELVE_HOURS * 1000;
  const value = `${orgId}.${expires}.${sign(`${orgId}.${expires}`)}`;
  (await cookies()).set(ORG_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TWELVE_HOURS,
    path: "/",
  });
}

/** Server Actions only. */
export async function clearOrgCookie(): Promise<void> {
  (await cookies()).delete(ORG_COOKIE);
}

/**
 * For every organization page and action: the signed-in organization, which must be the one in
 * the address. Anyone else is sent to the sign-in page.
 */
export async function requireOrg(slug: string): Promise<{ id: string; slug: string; name: string }> {
  const orgId = await readOrgId();
  if (orgId) {
    const { findOrgById } = await import("@/db/queries/orgs");
    const org = await findOrgById(orgId);
    if (org && org.slug === slug) return org;
  }
  redirect(`/org?signin=${encodeURIComponent(slug)}`);
}
