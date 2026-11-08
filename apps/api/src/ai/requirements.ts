export const ALLOWED_INTERESTS = [
  'art',
  'history',
  'architecture',
  'nature',
  'food',
  'coffee',
  'nightlife',
] as const;

export type ActivityLevelValue = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ParsedRequirements {
  city: string;
  days: number;
  hoursPerDay: number;
  activityLevel: ActivityLevelValue;
  interests: string[];
}

function toInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// Єдина точка перевірки: що б не повернув ШІ, в алгоритм потрапляють лише допустимі значення
export function sanitize(raw: unknown): ParsedRequirements {
  const r = (raw ?? {}) as Record<string, unknown>;
  const level = String(r.activityLevel ?? '').toUpperCase();
  const interests = Array.isArray(r.interests)
    ? [...new Set(r.interests.map((i) => String(i).toLowerCase()))].filter((i) =>
        (ALLOWED_INTERESTS as readonly string[]).includes(i),
      )
    : [];
  return {
    city: 'Florence', // у MVP підтримується лише Флоренція (дані імпортовано лише для неї)
    days: toInt(r.days, 2, 1, 7),
    hoursPerDay: toInt(r.hoursPerDay, 6, 2, 12),
    activityLevel: (['LOW', 'MEDIUM', 'HIGH'].includes(level) ? level : 'MEDIUM') as ActivityLevelValue,
    interests,
  };
}
