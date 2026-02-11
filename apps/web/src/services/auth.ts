/**
 * 认证服务
 * 使用 Cookie-based Session Token 认证
 * 提供密码登录、登出、Token 管理等功能
 */

import { AUTH_LOGIN_API, AUTH_LOGOUT_API } from '@/constants/api'
import type { User, AuthResponse, LoginRequest } from '@/types'

// ==================== Constants ====================

const TOKEN_KEY = 'session_token'
const USER_KEY = 'auth_user'

// ==================== Types ====================

interface ApiErrorResponse {
  error: string
  message: string
}

// ==================== User Management ====================

/**
 * 保存认证信息到本地存储
 */
function saveAuthData(token: string, user: User): void {
  if (!token || token.trim() === '') {
    console.error('[Auth] Cannot save auth data: Invalid token')
    return
  }

  if (!user || !user.id) {
    console.error('[Auth] Cannot save auth data: Invalid user')
    return
  }

  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/**
 * 获取保存的用户信息
 */
function getUser(): User | null {
  const userJson = localStorage.getItem(USER_KEY)

  if (!userJson) {
    return null
  }

  try {
    return JSON.parse(userJson) as User
  } catch (error) {
    console.error('[Auth] Failed to parse user data:', error)
    return null
  }
}

/**
 * 获取保存的 token
 */
function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * 清除认证信息
 */
function clearAuthData(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

// ==================== API Methods ====================

/**
 * 密码登录
 * @param params - 登录参数（用户名和密码）
 * @returns 登录成功返回用户信息，失败返回 null
 */
async function login(params: LoginRequest): Promise<User | null> {
  try {
    const response = await fetch(AUTH_LOGIN_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = (await response.json()) as ApiErrorResponse
      console.error(`[Auth] Login failed: ${response.status} - ${error.message}`)
      return null
    }

    const data = (await response.json()) as AuthResponse

    if (!data.data || !data.data.token || !data.data.user) {
      console.error('[Auth] Invalid response: missing token or user')
      return null
    }

    // 保存 token 和用户信息
    saveAuthData(data.data.token, data.data.user)
    console.log('[Auth] Login successful, token saved')
    return data.data.user
  } catch (error) {
    console.error('[Auth] Error during login:', error)
    return null
  }
}

/**
 * 登出
 * @returns 成功返回 true，失败返回 false
 */
async function logout(): Promise<boolean> {
  const token = getToken()

  if (token) {
    try {
      const response = await fetch(AUTH_LOGOUT_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        console.error(`[Auth] Failed to logout: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('[Auth] Error during logout:', error)
    }
  }

  // 无论服务器响应如何，都清除本地认证信息
  clearAuthData()
  console.log('[Auth] Logout successful, token cleared')
  return true
}

/**
 * 检查是否已登录
 * 通过本地是否有用户信息判断
 * 注意：实际的认证状态由服务器 Cookie 决定
 */
function isAuthenticated(): boolean {
  return getUser() !== null
}

/**
 * 获取当前登录用户
 */
function getCurrentUser(): User | null {
  return getUser()
}

// ==================== Exports ====================

export { login, logout, isAuthenticated, getCurrentUser, getToken, clearAuthData }
