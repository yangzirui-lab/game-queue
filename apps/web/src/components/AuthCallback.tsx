/**
 * Steam 登录回调处理组件
 * 处理从 Steam 返回的认证信息
 */

import { useEffect, useState } from 'react'
import { handleAuthCallback } from '@/services/auth'
import type { AuthResponse } from '@/types'

// ==================== Component ====================

interface AuthCallbackProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

function AuthCallback({ onSuccess, onError }: AuthCallbackProps) {
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const processCallback = async () => {
      // 从 URL 查询参数中获取认证数据
      const urlParams = new URLSearchParams(window.location.search)

      // 调试日志：查看所有参数
      console.log('[AuthCallback] URL params:', Object.fromEntries(urlParams.entries()))

      // 检查是否有错误
      const errorParam = urlParams.get('error')
      if (errorParam) {
        setError(errorParam)
        setIsProcessing(false)
        if (onError) {
          onError(errorParam)
        }
        return
      }

      // 注意：实际的回调处理取决于后端如何返回数据
      // 这里假设后端通过 URL 参数返回 token 和用户信息
      // 或者后端可能直接返回 JSON 响应

      // 从 URL 参数获取认证数据
      const token = urlParams.get('token')

      if (!token) {
        setError('No token received')
        setIsProcessing(false)
        if (onError) {
          onError('No token received')
        }
        return
      }

      try {
        let user

        // 方案 1: user 是 JSON 字符串
        const userJson = urlParams.get('user')
        if (userJson) {
          user = JSON.parse(decodeURIComponent(userJson))
        } else {
          // 方案 2: 用户信息是单独的参数
          const userId = urlParams.get('user_id')
          const steamId = urlParams.get('steam_id')
          const username = urlParams.get('username')
          const avatarUrl = urlParams.get('avatar_url')
          const profileUrl = urlParams.get('profile_url')
          const isActive = urlParams.get('is_active')
          const lastLoginAt = urlParams.get('last_login_at')
          const createdAt = urlParams.get('created_at')
          const updatedAt = urlParams.get('updated_at')

          if (userId && steamId && username) {
            user = {
              id: userId,
              steam_id: steamId,
              username: decodeURIComponent(username),
              avatar_url: avatarUrl || '',
              profile_url: profileUrl || '',
              is_active: isActive === 'true',
              last_login_at: lastLoginAt || '',
              created_at: createdAt || '',
              updated_at: updatedAt || '',
            }
          }
        }

        if (!user || !user.id) {
          setError('Invalid user data received')
          setIsProcessing(false)
          if (onError) {
            onError('Invalid user data received')
          }
          return
        }

        const authData: AuthResponse = { token, user }
        const success = handleAuthCallback(authData)

        if (success) {
          // 登录成功，清除 URL 参数并通知父组件
          window.history.replaceState({}, document.title, window.location.pathname)
          if (onSuccess) {
            onSuccess()
          }
        } else {
          setError('Failed to process authentication data')
          setIsProcessing(false)
          if (onError) {
            onError('Failed to process authentication data')
          }
        }
      } catch (err) {
        console.error('[AuthCallback] Error parsing authentication data:', err)
        setError('Invalid authentication data')
        setIsProcessing(false)
        if (onError) {
          onError('Invalid authentication data')
        }
        return
      }
    }

    processCallback()
  }, [onSuccess, onError])

  if (isProcessing) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Processing login...</h2>
        <p>Please wait while we complete your authentication.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Login Failed</h2>
        <p style={{ color: 'red' }}>{error}</p>
        <button
          onClick={() => (window.location.href = '/')}
          style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}
        >
          Back to Home
        </button>
      </div>
    )
  }

  return null
}

// ==================== Exports ====================

export default AuthCallback
