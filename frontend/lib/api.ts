import type {
  BoardDetail,
  BoardMember,
  BoardSummary,
  Column,
  Task,
  User,
} from './types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const TOKEN_KEY = 'kanban.token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (Array.isArray(body?.message) ? body.message.join(', ') : body?.message) ||
      res.statusText ||
      'Request failed';
    throw new ApiError(res.status, message);
  }
  return body as T;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export const api = {
  register: (data: { email: string; name: string; password: string }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<User>('/auth/me'),

  searchUsers: (q: string) =>
    request<User[]>(`/users/search?q=${encodeURIComponent(q)}`),

  listBoards: () => request<BoardSummary[]>('/boards'),

  createBoard: (name: string) =>
    request<BoardDetail>('/boards', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  getBoard: (id: string) => request<BoardDetail>(`/boards/${id}`),

  renameBoard: (id: string, name: string) =>
    request<BoardSummary>(`/boards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  deleteBoard: (id: string) =>
    request<{ deleted: boolean }>(`/boards/${id}`, { method: 'DELETE' }),

  shareBoard: (id: string, email: string, role: 'EDITOR' | 'VIEWER') =>
    request<BoardMember>(`/boards/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  updateMember: (id: string, userId: string, role: 'EDITOR' | 'VIEWER') =>
    request<BoardMember>(`/boards/${id}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeMember: (id: string, userId: string) =>
    request<{ removed: boolean }>(`/boards/${id}/members/${userId}`, {
      method: 'DELETE',
    }),

  createColumn: (boardId: string, name: string) =>
    request<Column>(`/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  renameColumn: (columnId: string, name: string) =>
    request<Column>(`/columns/${columnId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  reorderColumn: (columnId: string, position: number) =>
    request<Column[]>(`/columns/${columnId}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ position }),
    }),

  deleteColumn: (columnId: string) =>
    request<{ deleted: boolean }>(`/columns/${columnId}`, { method: 'DELETE' }),

  createTask: (columnId: string, data: { title: string; description?: string }) =>
    request<Task>(`/columns/${columnId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (
    taskId: string,
    data: { title?: string; description?: string | null },
  ) =>
    request<Task>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  moveTask: (taskId: string, columnId: string, position: number) =>
    request<Task[]>(`/tasks/${taskId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ columnId, position }),
    }),

  deleteTask: (taskId: string) =>
    request<{ deleted: boolean }>(`/tasks/${taskId}`, { method: 'DELETE' }),
};
