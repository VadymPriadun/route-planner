'use client';
import { recompute } from '@/lib/schedule';
import { walkingGeometry } from '@/lib/maps';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { CATEGORY_LABELS, INTEREST_LABELS, KIND_LABELS, km } from '@/lib/labels';
import type { NearbyPoi, RouteDto } from '@/lib/types';
import { appleMapsUrl, googleMapsUrl } from '@/lib/maps';

const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => <div className="map" />,
});

export default function RoutePage() {
  const ready = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const [route, setRoute] = useState<RouteDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nearby, setNearby] = useState<NearbyPoi[]>([]);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [line, setLine] = useState<[number, number][] | null>(null);

  useEffect(() => {
    if (!ready) return;
    api<RouteDto>(`/routes/${id}`)
        .then(setRoute)
        .catch((err) => setError(err instanceof Error ? err.message : 'Невідома помилка'));
  }, [ready, id]);
  
  const day = route?.routeDays[dayIdx];

  const computed = useMemo(
      () => (day ? recompute(day, overrides) : null),
      [day, overrides],
  );


  useEffect(() => {
    setLine(null);
    if (!day) return;
    let cancelled = false;
    walkingGeometry(day.points.map((p) => p.poi)).then((g) => { if (!cancelled) setLine(g); });
    return () => { cancelled = true; };
  }, [day]);

  const stops = useMemo(
    () =>
      (day?.points ?? []).map((p) => ({
        id: p.poi.id,
        name: p.poi.name,
        lat: p.poi.lat,
        lon: p.poi.lon,
        kind: p.note ?? 'SIGHT',
      })),
    [day],
  );

  const select = useCallback((poiId: string) => setSelectedId(poiId), []);

  // Пропозиції закладів у радіусі 500 м від обраної точки
  useEffect(() => {
    const point = day?.points.find((p) => p.poi.id === selectedId);
    if (!point) {
      setNearby([]);
      return;
    }
    const q = new URLSearchParams({
      lat: String(point.poi.lat),
      lon: String(point.poi.lon),
      radius: '500',
      categories: 'CAFE,RESTAURANT,PHARMACY',
      limit: '10',
    });
    api<NearbyPoi[]>(`/pois/nearby?${q}`, { auth: false })
      .then((list) => setNearby(list.filter((n) => n.id !== selectedId)))
      .catch(() => setNearby([]));
  }, [day, selectedId]);

  if (!ready) return null;
  if (error) return <main className="container"><div className="error">{error}</div></main>;
  if (!route) return <main className="container"><p>Завантаження…</p></main>;
  if (route.routeDays.length === 0) {
    return <main className="container"><div className="error">У цього маршруту немає днів (статус: {route.status}).</div></main>;
  }

  return (
    <div className="route-layout">
      <aside className="side">
        <h2 style={{ margin: 0 }}>Маршрут: {route.city}</h2>
        <div className="muted">
          {route.days} дн. · {route.hoursPerDay} год/день · {km(route.totalDistanceM)} · {route.algorithm}
        </div>
        <div className="muted">{route.interests.map((i) => INTEREST_LABELS[i] ?? i).join(', ')}</div>
  
        <div className="tabs">
          {route.routeDays.map((d, i) => (
            <button key={d.id} className={`tab ${i === dayIdx ? 'on' : ''}`}
                    onClick={() => { setDayIdx(i); setSelectedId(null); setOverrides({}); }}>
              День {d.dayNumber}
            </button>
          ))}
        </div>
        <div className="muted">
          {km(day?.distanceM ?? null)} пішки ·{' '}
          {Math.floor((day?.durationMin ?? 0) / 60)} год{' '}
          {(day?.durationMin ?? 0) % 60} хв
        </div>

        {(() => {
          const pts = (day?.points ?? []).map((p) => ({
            lat: p.poi.lat,
            lon: p.poi.lon,
            name: p.poi.name,
          }));
          
          const g = googleMapsUrl(pts);
          const a = appleMapsUrl(pts);

          return g && a ? (
              <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
                <a href={g} target="_blank" rel="noopener noreferrer">
                  Відкрити в Google Maps
                </a>
                <span className="muted">·</span>
                <a href={a} target="_blank" rel="noopener noreferrer">
                  Apple Maps (початок → кінець)
                </a>
              </div>
          ) : null;
        })()}

        {day?.points.map((p, i) => {
          const r = computed?.rows[i];
          return (
              <div key={p.id} className={`stop ${p.poi.id === selectedId ? 'sel' : ''}`} onClick={() => select(p.poi.id)}>
                <div className="time">{r?.arrival ?? p.arrivalTime}</div>
                <div>
                  <div><strong>{i + 1}. {p.poi.name}</strong></div>
                  <div className="muted">{KIND_LABELS[p.note ?? 'SIGHT']} · {r?.minutes ?? p.visitMinutes} хв{p.poi.address ? ` · ${p.poi.address}` : ''}</div>
                  {p.note === 'SIGHT' && p.enterable && (
                      <div className="seg" onClick={(e) => e.stopPropagation()}>
                        <button className={!r?.inside ? 'on' : ''} onClick={() => setOverrides({ ...overrides, [p.id]: false })}>Ззовні</button>
                        <button className={r?.inside ? 'on' : ''} onClick={() => setOverrides({ ...overrides, [p.id]: true })}>Всередині</button>
                      </div>
                  )}
                </div>
              </div>
          );
        })}

        {selectedId && (
          <>
            <div className="near-title">Поруч (500 м)</div>
            {nearby.length === 0 && <div className="muted">Закладів не знайдено.</div>}
            {nearby.map((n) => (
              <div key={n.id} className="muted" style={{ padding: '4px 0' }}>
                {CATEGORY_LABELS[n.category] ?? n.category}: <strong>{n.name}</strong> ({n.distanceM} м)
              </div>
            ))}
          </>
        )}
        {!selectedId && <p className="muted">Натисніть на точку, щоб побачити заклади поруч.</p>}
      </aside>
      <RouteMap stops={stops} nearby={nearby} selectedId={selectedId} onSelect={select} fitKey={String(dayIdx)} />
    </div>
  );
}
