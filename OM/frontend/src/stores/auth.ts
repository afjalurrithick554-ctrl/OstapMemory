import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchAuthStatus, verifyPassword } from '@/api/auth'
import { getToken, setToken, clearToken } from '@/api/client'

export const useAuthStore = defineStore('auth', () => {
  // null = ещё не проверяли; true/false = требуется ли пароль.
  const authRequired = ref<boolean | null>(null)
  const isAuthenticated = ref<boolean>(!!getToken())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function checkAuthRequired(): Promise<boolean> {
    const status = await fetchAuthStatus()
    authRequired.value = status.auth_enabled
    if (!status.auth_enabled) {
      // Пароль не нужен — считаем вход свободным.
      isAuthenticated.value = true
    }
    return status.auth_enabled
  }

  async function login(password: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      const ok = await verifyPassword(password)
      if (ok) {
        setToken(password)
        isAuthenticated.value = true
        return true
      }
      error.value = 'invalid'
      return false
    } catch {
      error.value = 'connect'
      return false
    } finally {
      isLoading.value = false
    }
  }

  function logout() {
    clearToken()
    isAuthenticated.value = false
  }

  return { authRequired, isAuthenticated, isLoading, error, checkAuthRequired, login, logout }
})
