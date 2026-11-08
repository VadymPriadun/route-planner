'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { ACTIVITY_LABELS, INTEREST_LABELS } from '@/lib/labels';
import type { Requirements, RouteDto } from '@/lib/types';

export default function PlannerPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const [text, setText] = useState('');
  const [req, setReq] = useState<Requirements>({
    city: 'Florence',
    days: 2,
    hoursPerDay: 6,
    activityLevel: 'MEDIUM',
    interests: ['art'],
  });
  const [source, setSource] = useState<string | null>(null);
  const [grouping, setGrouping] = useState<'kmeans' | 'dbscan'>('kmeans');
  const [ordering, setOrdering] = useState<'nn' | '2opt'>('2opt');
  const [busy, setBusy] = useState<'parse' | 'generate' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return null;

  async function parse() {
    setBusy('parse');
    setError(null);
    try {
      const r = await api<{ requirements: Requirements; source: string }>('/ai/parse', {
        method: 'POST',
        body: { text },
      });
      setReq(r.requirements);
      setSource(r.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Невідома помилка');
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    setBusy('generate');
    setError(null);
    try {
      const route = await api<RouteDto>('/routes', {
        method: 'POST',
        body: { ...req, requestText: text.trim() || undefined, grouping, ordering },
      });
      router.push(`/routes/${route.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Невідома помилка');
      setBusy(null);
    }
  }

  const toggle = (i: string) =>
    setReq((r) => ({
      ...r,
      interests: r.interests.includes(i) ? r.interests.filter((x) => x !== i) : [...r.interests, i],
    }));

  return (
    <main className="container">
      <div className="card">
        <h1>Планувальник маршруту</h1>
        <label>Опишіть подорож своїми словами</label>
        <textarea
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          placeholder="Наприклад: 2 дні у Флоренції, люблю мистецтво, не хочу багато ходити і хочу каву після обіду"
        />
        <div className="muted">{text.length}/1000</div>
        <button className="btn btn-secondary" disabled={busy !== null || text.trim().length < 3} onClick={parse}>
          {busy === 'parse' ? 'Аналізую…' : 'Розібрати запит'}
        </button>
        {source && (
          <div className="info">
            Параметри заповнено ({source === 'openai' ? 'ШІ: OpenAI' : 'запасний розбір за правилами'}).
            Перевірте й за потреби змініть їх нижче.
          </div>
        )}
      </div>

      <div className="card">
        <div className="info" style={{ marginTop: 0, marginBottom: 12 }}>
          Обмеження: підтримується лише <strong>Флоренція</strong> (інші міста буде замінено на Флоренцію);
          запит 3-1000 символів; 1-7 днів; 2-12 годин на день.
        </div>
        <h2>Параметри</h2>
        <div className="row">
          <div>
            <label>Днів (1-7)</label>
            <input type="number" min={1} max={7} value={req.days}
              onChange={(e) => setReq({ ...req, days: Number(e.target.value) })} />
          </div>
          <div>
            <label>Годин на день (2-12)</label>
            <input type="number" min={2} max={12} value={req.hoursPerDay}
              onChange={(e) => setReq({ ...req, hoursPerDay: Number(e.target.value) })} />
          </div>
        </div>
        <label>Темп</label>
        <select value={req.activityLevel}
          onChange={(e) => setReq({ ...req, activityLevel: e.target.value as Requirements['activityLevel'] })}>
          {Object.entries(ACTIVITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label>Інтереси</label>
        <div className="chips">
          {Object.entries(INTEREST_LABELS).map(([v, l]) => (
            <label key={v} className={`chip ${req.interests.includes(v) ? 'on' : ''}`}>
              <input type="checkbox" checked={req.interests.includes(v)} onChange={() => toggle(v)} />
              {l}
            </label>
          ))}
        </div>
        <div className="row">
          <div>
            <label>Групування по днях</label>
            <select value={grouping} onChange={(e) => setGrouping(e.target.value as 'kmeans' | 'dbscan')}>
              <option value="kmeans">K-Means</option>
              <option value="dbscan">DBSCAN</option>
            </select>
          </div>
          <div>
            <label>Порядок обходу</label>
            <select value={ordering} onChange={(e) => setOrdering(e.target.value as 'nn' | '2opt')}>
              <option value="2opt">2-opt (кращий)</option>
              <option value="nn">Nearest Neighbor (базовий)</option>
            </select>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={busy !== null} onClick={generate}>
          {busy === 'generate' ? 'Будую маршрут…' : 'Згенерувати маршрут'}
        </button>
      </div>
    </main>
  );
}
