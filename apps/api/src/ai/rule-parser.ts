import { ParsedRequirements, sanitize } from './requirements';

const NUMBER_WORDS: Record<string, number> = {
  один: 1, одного: 1, one: 1,
  два: 2, дві: 2, two: 2,
  три: 3, three: 3,
  чотири: 4, four: 4,
  "п'ять": 5, five: 5,
  шість: 6, six: 6,
  сім: 7, seven: 7,
};

const INTEREST_PATTERNS: Record<string, RegExp> = {
  art: /мистецтв|(?<!\p{L})art(?!\p{L})|музе|museum|галере|gallery|картин/iu,
  history: /істор|histor|середньовіч|ренесанс|renaissance/iu,
  architecture: /архітектур|architect|собор|церкв|церкви|cathedral|church/iu,
  nature: /природ|парк|nature|park|garden|краєвид|viewpoint/iu,
  coffee: /кав[аиуі]|кафе|coffee|espresso|капучіно/iu,
  food: /ресторан|їжа|їжі|їжу|food|restaurant|кухн/iu,
  nightlife: /(?<!\p{L})бар(?!\p{L})|бари|нічн|nightlife|вечірк|cocktail|коктейл/iu,
};

const LOW_PATTERN =
  /не\s+хоч\p{L}*\s+багато\s+ходити|мало\s+ходити|небагато\s+ходити|спокійн|неквап|relax|not\s+(?:too\s+)?much\s+walking|little\s+walking/iu;
const HIGH_PATTERN = /активн|насичен|багато\s+ходити|intense|active|energetic|lots\s+of\s+walking/iu;

function findDays(text: string): number | undefined {
  const re = /(\d+|[\p{L}']+)\s*(?:дн\p{L}*|день|days?)/giu;
  for (const m of text.matchAll(re)) {
    const word = m[1].toLowerCase();
    const n = /^\d+$/.test(word) ? Number(word) : NUMBER_WORDS[word];
    if (n) return n;
  }
  return undefined;
}

function findHours(text: string): number | undefined {
  const m = text.match(/(\d+)\s*(?:год\p{L}*|hours?)/iu);
  return m ? Number(m[1]) : undefined;
}

export function parseWithRules(text: string): ParsedRequirements {
  const interests = Object.entries(INTEREST_PATTERNS)
    .filter(([, re]) => re.test(text))
    .map(([name]) => name);

  // Спочатку перевіряємо «не хочу багато ходити», бо воно містить «багато ходити»
  const activityLevel = LOW_PATTERN.test(text) ? 'LOW' : HIGH_PATTERN.test(text) ? 'HIGH' : 'MEDIUM';

  return sanitize({
    days: findDays(text),
    hoursPerDay: findHours(text),
    activityLevel,
    interests,
  });
}
