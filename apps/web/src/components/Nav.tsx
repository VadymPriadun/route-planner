'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearToken, getToken } from '@/lib/api';

export default function Nav() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  useEffect(() => setAuthed(Boolean(getToken())));

  return (
    <nav className="nav">
      <Link href="/" className="brand">AI Travel Explorer</Link>
      <div className="nav-links">
        {authed ? (
          <>
            <Link href="/planner">Планувальник</Link>
            <Link href="/routes">Мої маршрути</Link>
            <button
              className="link-btn"
              onClick={() => {
                clearToken();
                router.push('/login');
              }}
            >
              Вийти
            </button>
          </>
        ) : (
          <Link href="/login">Увійти</Link>
        )}
      </div>
    </nav>
  );
}
