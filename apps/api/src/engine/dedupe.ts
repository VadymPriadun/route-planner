import { haversineM } from './geo';

const STOP = new Set(['di', 'del', 'della', 'dello', 'dei', 'delle', 'degli', 'il', 'la', 'lo', 'le', 'i', 'gli', 'da', 'e', 'the']);

export function nameTokens(s: string): string[] {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t && !STOP.has(t));
}

export function levenshtein(a: string, b: string): number {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
    }
    return dp[a.length][b.length];
}

// Схожі назви: збіг, входження підрядка, підмножина слів або мала відстань Левенштейна.
// Короткі назви (менше 5 символів) не зливаємо, щоб "M1" і "M10" не вважались дублями.
export function similarNames(a: string, b: string): boolean {
    const ta = nameTokens(a);
    const tb = nameTokens(b);
    const sa = ta.join(' ');
    const sb = tb.join(' ');
    if (!sa || !sb) return false;
    if (sa === sb) return true;
    const short = sa.length <= sb.length ? sa : sb;
    const long = sa.length <= sb.length ? sb : sa;
    if (short.length >= 5 && long.includes(short)) return true;
    const ts = ta.length <= tb.length ? ta : tb;
    const tl = ta.length <= tb.length ? tb : ta;
    if (short.length >= 5 && ts.every((t) => tl.includes(t))) return true;
    return long.length >= 6 && levenshtein(sa, sb) / Math.max(sa.length, sb.length) <= 0.25;
}

// items мають бути відсортовані за пріоритетом: з групи дублів лишається перший
export function dedupeByName<T extends { name: string; lat: number; lon: number }>(items: T[], radiusM = 150): T[] {
    const kept: T[] = [];
    for (const it of items) {
        const dup = kept.some(
            (k) => Math.abs(k.lat - it.lat) < 0.003 && haversineM(k, it) <= radiusM && similarNames(k.name, it.name),
        );
        if (!dup) kept.push(it);
    }
    return kept;
}