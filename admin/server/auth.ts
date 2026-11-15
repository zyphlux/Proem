/**
 * Owner authentication: one password (scrypt hash in ADMIN_DATA_DIR/admin.json),
 * in-memory sessions in an HttpOnly SameSite=Strict cookie, a per-session CSRF token,
 * and login rate limiting.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import { promisify } from "node:util";
import { config, paths } from "./config";

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number, opts: crypto.ScryptOptions) => Promise<Buffer>;
const PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

type PasswordFile = { v: 1; salt: string; hash: string; N: number; r: number; p: number };

export async function setPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64, PARAMS);
  const data: PasswordFile = { v: 1, salt: salt.toString("base64"), hash: hash.toString("base64"), N: PARAMS.N, r: PARAMS.r, p: PARAMS.p };
  fs.mkdirSync(config.dataDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(paths.passwordFile, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export function hasPassword(): boolean {
  return fs.existsSync(paths.passwordFile);
}

async function verifyPassword(password: string): Promise<boolean> {
  if (!hasPassword()) return false;
  const f = JSON.parse(fs.readFileSync(paths.passwordFile, "utf8")) as PasswordFile;
  const expected = Buffer.from(f.hash, "base64");
  const actual = await scrypt(password, Buffer.from(f.salt, "base64"), expected.length, { N: f.N, r: f.r, p: f.p, maxmem: PARAMS.maxmem });
  return crypto.timingSafeEqual(expected, actual);
}

/* ------------------------------------------------------------------ sessions */

export const COOKIE = "pa_session";
type Session = { csrf: string; expires: number };
const sessions = new Map<string, Session>();

export function getSession(token: string | undefined): Session | null {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (s.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  s.expires = Date.now() + config.sessionHours * 3600_000; // sliding
  return s;
}

export function endSession(token: string | undefined) {
  if (token) sessions.delete(token);
}

/* ------------------------------------------------------------------ login with rate limit */

const attempts = new Map<string, { count: number; first: number }>();
const WINDOW = 10 * 60_000;
const MAX = 8;

export type LoginResult = { ok: true; token: string; csrf: string } | { ok: false; status: 401 | 429; retryAfter?: number };

export async function login(password: string, ip: string): Promise<LoginResult> {
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && now - a.first < WINDOW && a.count >= MAX) {
    return { ok: false, status: 429, retryAfter: Math.ceil((a.first + WINDOW - now) / 1000) };
  }
  const good = typeof password === "string" && password.length > 0 && password.length < 1024 && (await verifyPassword(password));
  if (!good) {
    if (!a || now - a.first >= WINDOW) attempts.set(ip, { count: 1, first: now });
    else a.count++;
    await new Promise((r) => setTimeout(r, 400)); // slow down guessing
    return { ok: false, status: 401 };
  }
  attempts.delete(ip);
  const token = crypto.randomBytes(32).toString("base64url");
  const csrf = crypto.randomBytes(24).toString("base64url");
  sessions.set(token, { csrf, expires: now + config.sessionHours * 3600_000 });
  return { ok: true, token, csrf };
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
