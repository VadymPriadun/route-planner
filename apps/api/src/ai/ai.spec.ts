import { describe, expect, it } from 'vitest';
import { parseWithRules } from './rule-parser';
import { sanitize } from './requirements';

describe('rule-based parser', () => {
  it('parses the Ukrainian example from the project plan', () => {
    const r = parseWithRules(
      'Я хочу провести 2 дні у Флоренції, люблю мистецтво, не хочу багато ходити і хочу нормальну каву після обіду',
    );
    expect(r.days).toBe(2);
    expect(r.activityLevel).toBe('LOW');
    expect(r.interests).toEqual(expect.arrayContaining(['art', 'coffee']));
    expect(r.hoursPerDay).toBe(6);
  });

  it('parses an English request with a number word', () => {
    const r = parseWithRules("Three days in Florence: history and architecture, I'm an active person");
    expect(r.days).toBe(3);
    expect(r.activityLevel).toBe('HIGH');
    expect(r.interests).toEqual(expect.arrayContaining(['history', 'architecture']));
  });

  it('uses defaults when nothing is specified', () => {
    const r = parseWithRules('хочу музеї');
    expect(r.days).toBe(2);
    expect(r.activityLevel).toBe('MEDIUM');
    expect(r.interests).toContain('art');
  });
});

describe('sanitize', () => {
  it('clamps numbers and drops unknown values', () => {
    const r = sanitize({ days: 99, hoursPerDay: 1, activityLevel: 'X', interests: ['art', 'skydiving'] });
    expect(r).toEqual({
      city: 'Florence',
      days: 7,
      hoursPerDay: 2,
      activityLevel: 'MEDIUM',
      interests: ['art'],
    });
  });
});
