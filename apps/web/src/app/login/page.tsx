'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = mode === 'login' ? { email, password } : { email, password, name: name || undefined };
      const res = await api<{ accessToken: string }>(`/auth/${mode}`, { method: 'POST', body, auth: false });
      setToken(res.accessToken);
      router.push('/planner');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Невідома помилка');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <form className="card" onSubmit={submit}>
        <h1>{mode === 'login' ? 'Вхід' : 'Реєстрація'}</h1>
        {mode === 'register' && (
          <>
            <label>Ім’я (необов’язково)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </>
        )}
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Пароль (мінімум 8 символів)</label>
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={busy}>{mode === 'login' ? 'Увійти' : 'Створити акаунт'}</button>
        <p className="muted">
          {mode === 'login' ? 'Немає акаунта? ' : 'Уже є акаунт? '}
          <button type="button" className="link-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Зареєструватися' : 'Увійти'}
          </button>
        </p>
      </form>
    </main>
  );
}
