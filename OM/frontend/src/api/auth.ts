import { api } from './client'

export interface AuthStatus {
  auth_enabled: boolean
  message: string
}

// GET /api/auth/status — исключён из middleware, всегда отвечает.
export async function fetchAuthStatus(): Promise<AuthStatus> {
  const { data } = await api.get<AuthStatus>('/auth/status')
  return data
}

// Проверка пароля: дёргаем защищённый эндпоинт с Bearer. 200/любой не-401 = пароль верный.
export async function verifyPassword(password: string): Promise<boolean> {
  try {
    await api.get('/notebooks', {
      headers: { Authorization: `Bearer ${password}` },
    })
    return true
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 401) return false
    // Иная ошибка (например, бэкенд жив, но эндпоинт вернул 500) — пароль всё равно принят middleware.
    return true
  }
}
