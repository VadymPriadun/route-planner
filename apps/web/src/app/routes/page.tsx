'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { km, STATUS_LABELS } from '@/lib/labels';
import type { RouteSummary } from '@/lib/types';

export default function RoutesPage() {
  const ready = useRequireAuth();
  const [routes, setRoutes] = useState<RouteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRoutes(await api<RouteSummary[]>('/routes'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Невідома помилка');
    }
  }, []);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  async function remove(id: string) {
    if (!confirm('Видалити цей маршрут?')) return;
    try {
      await api<void>(`/routes/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Невідома помилка');
    }
  }

  if (!ready) return null;
  return (
    <main className="container">
      <div className="card">
        <h1>Мої маршрути</h1>
        {error && <div className="error">{error}</div>}
        {routes === null && !error && <p>Завантаження…</p>}
        {routes?.length === 0 && (
          <p>Маршрутів поки немає. <Link href="/planner">Створити перший</Link></p>
        )}
        {routes && routes.length > 0 && (
          <table>
            <thead>
              <tr><th>Дата</th><th>Днів</th><th>Алгоритм</th><th>Відстань</th><th>Статус</th><th></th></tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/routes/${r.id}`}>{new Date(r.createdAt).toLocaleString('uk-UA')}</Link></td>
                  <td>{r.days}</td>
                  <td>{r.algorithm ?? '—'}</td>
                  <td>{km(r.totalDistanceM)}</td>
                  <td>
                    <span className={`badge ${r.status === 'COMPLETED' ? 'badge-ok' : r.status === 'FAILED' ? 'badge-fail' : ''}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td><button className="btn btn-danger" onClick={() => remove(r.id)}>Видалити</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
