'use client';

import { getToken, SessionUser } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Error carrying the backend's status + message for the UI to display. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * The single fetch wrapper every screen uses to talk to the API. It injects
 * the bearer token, sets JSON headers, and normalises the backend's error
 * shape into an {@link ApiError}. Having exactly one of these keeps auth and
 * error handling consistent across the app (DRY) — no component builds a
 * fetch by hand.
 */
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const body = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (body && (Array.isArray(body.message) ? body.message.join(', ') : body.message)) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return body as T;
}

// ---- Typed endpoint helpers ------------------------------------------------

export interface AuthResult {
  accessToken: string;
  user: SessionUser;
}

export interface Balance {
  balance: number;
  catName: string;
}

export interface CatSummary {
  catName: string;
  displayName: string;
}

export interface TransferHistoryItem {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  senderCatName: string;
  recipientCatName: string;
  direction: 'sent' | 'received';
}

export interface PaginatedTransfers {
  items: TransferHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const api = {
  register: (data: {
    email: string;
    password: string;
    catName: string;
    displayName: string;
  }) => apiFetch<AuthResult>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    apiFetch<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  getBalance: () => apiFetch<Balance>('/wallets/me'),

  getHistory: (page = 1, limit = 5) =>
    apiFetch<PaginatedTransfers>(`/transfers?page=${page}&limit=${limit}`),

  searchRecipients: (q: string) =>
    apiFetch<CatSummary[]>(`/users/search?q=${encodeURIComponent(q)}`),

  sendTreats: (data: { recipientCatName: string; amount: number; idempotencyKey: string }) =>
    apiFetch<unknown>('/transfers', { method: 'POST', body: JSON.stringify(data) }),
};
