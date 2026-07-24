/**
 * TaskMate API Client
 * ─────────────────────────────────────────────────────────────────────────────
 * This file is the SINGLE place you need to touch to connect a real backend.
 *
 * Current state  : All service calls are handled by the in-memory AuthContext.
 *                  This file is a prepared stub.
 *
 * Future state   : Replace `BASE_URL` with your deployed server URL.
 *                  Implement `apiRequest` so it attaches the JWT from
 *                  localStorage and talks to the real API.
 *                  Then update each service file to call `apiRequest` instead
 *                  of delegating to the context.
 *
 * Architecture contract
 *   Teacher → App → [this file] → Backend → DB / Cloud Storage
 *   Student → App → [this file] → Backend → permission check → data returned
 *   The teacher's device is NEVER the server. All data lives in the cloud.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// Token helpers — swap localStorage key to match your auth provider
export const getToken = (): string | null => localStorage.getItem('taskmate_token');
export const setToken = (token: string) => localStorage.setItem('taskmate_token', token);
export const clearToken = () => localStorage.removeItem('taskmate_token');

/** Base HTTP helper for the local server API. */
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'API error');
  }

  return res.json() as Promise<T>;
}

export async function apiFormRequest<T>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  formData: FormData,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'API error');
  }

  return res.json() as Promise<T>;
}
