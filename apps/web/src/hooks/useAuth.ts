/**
 * 认证 Hook
 * 提供认证状态管理和操作方法
 */

import { useState, useEffect, useCallback } from 'react'
import {
  login as loginService,
  logout as logoutService,
  isAuthenticated,
  getCurrentUser as getCurrentUserService,
} from '@/services/auth'
import type { User } from '@/types'

// ==================== Types ====================

interface UseAuthResult {
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => void
}

// ==================== Hook ====================

function useAuth(): UseAuthResult {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [authenticated, setAuthenticated] = useState(false)

  /**
   * 刷新用户信息
   */
  const refreshUser = useCallback(() => {
    const currentUser = getCurrentUserService()
    setUser(currentUser)
    setAuthenticated(isAuthenticated())
  }, [])

  /**
   * 初始化认证状态
   */
  useEffect(() => {
    refreshUser()
    setIsLoading(false)
  }, [refreshUser])

  /**
   * 登录 - 使用用户名和密码
   * Session Token 会通过 Cookie 自动管理
   */
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true)

    const user = await loginService({ username, password })

    if (!user) {
      setIsLoading(false)
      return false
    }

    setUser(user)
    setAuthenticated(true)
    setIsLoading(false)
    return true
  }, [])

  /**
   * 登出
   */
  const logout = useCallback(async () => {
    setIsLoading(true)

    await logoutService()

    setUser(null)
    setAuthenticated(false)
    setIsLoading(false)
  }, [])

  return {
    isAuthenticated: authenticated,
    user,
    isLoading,
    login,
    logout,
    refreshUser,
  }
}

// ==================== Exports ====================

export type { UseAuthResult }

export { useAuth }
