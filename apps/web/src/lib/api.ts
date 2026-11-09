export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TOKEN_KEY = 'token';
export const getToken = (): string | null => {
  try {
    return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (t: string): void => {
  try { localStorage.setItem(TOKEN_KEY, t); } catch { /* сховище недоступне */ }
};
export const clearToken = (): void => {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* сховище недоступне */ }
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface Options {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  const useAuth = options.auth !== false;
  if (useAuth && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Не вдалося підключитись до сервера. Перевірте, що API запущено.');
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && useAuth) {
      clearToken();
      window.location.href = '/login';
    }
    const msg = Array.isArray(data?.message)
      ? data.message.join('; ')
      : (data?.message ?? `Помилка ${res.status}`);
    throw new ApiError(res.status, msg);
  }
  return data as T;
}
