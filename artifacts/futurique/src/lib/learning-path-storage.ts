import { getSessionEmail } from './session-email.ts';
import { learningPaths, type LearningSelection } from './learning-paths.ts';

const storageKeyFor = (email: string) =>
  `futurique-learning-paths:v1:${email.trim().toLowerCase() || 'temp@gmail.com'}`;

export function loadLearningSelections(email = getSessionEmail()): LearningSelection[] {
  try {
    const stored = window.localStorage.getItem(storageKeyFor(email));
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const validIds = new Set(learningPaths.map(path => path.id));
    const seen = new Set<string>();
    const selections: LearningSelection[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const candidate = item as Partial<LearningSelection>;
      if (
        typeof candidate.pathId !== 'string' ||
        !validIds.has(candidate.pathId) ||
        seen.has(candidate.pathId) ||
        typeof candidate.addedAt !== 'string' ||
        !Number.isFinite(Date.parse(candidate.addedAt)) ||
        typeof candidate.startedAt !== 'string' ||
        !Number.isFinite(Date.parse(candidate.startedAt)) ||
        (candidate.stoppedAt !== null &&
          (typeof candidate.stoppedAt !== 'string' || !Number.isFinite(Date.parse(candidate.stoppedAt)))) ||
        typeof candidate.active !== 'boolean'
      ) continue;
      seen.add(candidate.pathId);
      selections.push(candidate as LearningSelection);
    }
    return selections;
  } catch {
    return [];
  }
}

export function saveLearningSelections(selections: LearningSelection[], email = getSessionEmail()): void {
  try {
    window.localStorage.setItem(storageKeyFor(email), JSON.stringify(selections));
  } catch {
    // Keep the in-memory roadmap usable when browser storage is unavailable or full.
  }
}
