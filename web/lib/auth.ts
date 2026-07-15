'use client';

/**
 * Tiny client-side session store. The JWT and the logged-in cat's profile
 * live in localStorage so a refresh keeps you signed in. Centralised here so
 * no component reaches into localStorage directly (single responsibility).
 *
 * localStorage is a deliberate, documented simplification for this demo; a
 * production app would prefer an httpOnly cookie to reduce XSS exposure.
 */
const TOKEN_KEY = 'meowpay.token';
const USER_KEY = 'meowpay.user';

export interface SessionUser {
  id: string;
  catName: string;
  displayName: string;
  email: string;
}

export function saveSession(token: string, user: SessionUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
