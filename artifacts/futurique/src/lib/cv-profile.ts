import { getSessionEmail } from './session-email.ts';

export type Level = 'unspecified' | 'beginner' | 'intermediate' | 'advanced';
export type ProfileSkill = { name: string; level: Level };
export type ConfirmedProfile = { skills: ProfileSkill[]; experienceYears: number | null };
export type SkillDef = { name: string; aliases: string[] };

export const LEVELS: Level[] = ['unspecified', 'beginner', 'intermediate', 'advanced'];
export const LEVEL_LABEL: Record<Level, string> = { unspecified: 'Not specified', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
export const MAX_SKILLS = 40;
export const MAX_NAME = 80;

export const keyFor = (email: string) => `futurique-cv-profile:v1:${email.trim().toLowerCase() || 'temp@gmail.com'}`;
const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

export function buildDictionary(defs: SkillDef[] | undefined): Map<string, string> {
  const m = new Map<string, string>();
  for (const d of defs ?? []) { m.set(norm(d.name), d.name); for (const a of d.aliases) if (!m.has(norm(a))) m.set(norm(a), d.name); }
  return m;
}
export function canonicalName(raw: string, dict: Map<string, string>): { name: string; inDictionary: boolean } | null {
  const clean = raw.trim().replace(/\s+/g, ' ');
  if (!clean || clean.length > MAX_NAME) return null;
  const hit = dict.get(norm(clean));
  return hit ? { name: hit, inDictionary: true } : { name: clean, inDictionary: false };
}
export function normalizeSkills(list: unknown, dict: Map<string, string>): ProfileSkill[] {
  const out: ProfileSkill[] = []; const seen = new Set<string>();
  if (!Array.isArray(list)) return out;
  for (const it of list) {
    if (!it || typeof it !== 'object') continue;
    const { name, level } = it as { name?: unknown; level?: unknown };
    if (typeof name !== 'string') continue;
    const c = canonicalName(name, dict); if (!c) continue;
    const k = norm(c.name); if (seen.has(k)) continue;
    seen.add(k);
    out.push({ name: c.name, level: LEVELS.includes(level as Level) ? (level as Level) : 'unspecified' });
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
}
export function normalizeYears(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 80 ? Math.round(v * 10) / 10 : null;
}
export function normalizeProfile(raw: unknown, dict: Map<string, string> = new Map()): ConfirmedProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as { skills?: unknown; experienceYears?: unknown };
  const skills = normalizeSkills(p.skills, dict);
  return { skills, experienceYears: normalizeYears(p.experienceYears) };
}
export function loadCvProfile(email = getSessionEmail()): ConfirmedProfile | null {
  try {
    const s = window.localStorage.getItem(keyFor(email));
    if (!s) return null;
    const p = normalizeProfile(JSON.parse(s));
    return p && p.skills.length ? p : null;
  } catch { return null; }
}
export function saveCvProfile(p: ConfirmedProfile, email = getSessionEmail()): boolean {
  try { window.localStorage.setItem(keyFor(email), JSON.stringify({ skills: p.skills, experienceYears: p.experienceYears })); return true; } catch { return false; }
}
export function clearCvProfile(email = getSessionEmail()): boolean {
  try { window.localStorage.removeItem(keyFor(email)); return true; } catch { return false; }
}
