/**
 * 登录表单组件
 * 提供用户名密码登录功能
 */

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

// ==================== Component ====================

function LoginButton() {
  const { isAuthenticated, user, isLoading, login, logout } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码')
      return
    }

    setIsSubmitting(true)

    const success = await login(username, password)

    if (!success) {
      setError('登录失败：用户名或密码错误')
      setIsSubmitting(false)
      return
    }

    // 登录成功，清空表单
    setUsername('')
    setPassword('')
    setIsSubmitting(false)
  }

  if (isLoading) {
    return <button disabled>加载中...</button>
  }

  if (isAuthenticated && user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>欢迎，{user.username}</span>
        <button onClick={logout}>登出</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {error && <span style={{ color: 'red', fontSize: '12px', marginRight: '8px' }}>{error}</span>}

      <input
        type="text"
        placeholder="用户名"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={isSubmitting}
        style={{
          padding: '6px 12px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          fontSize: '14px',
        }}
      />

      <input
        type="password"
        placeholder="密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isSubmitting}
        style={{
          padding: '6px 12px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          fontSize: '14px',
        }}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          padding: '6px 16px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: '#007bff',
          color: 'white',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          fontSize: '14px',
        }}
      >
        {isSubmitting ? '登录中...' : '登录'}
      </button>
    </form>
  )
}

// ==================== Exports ====================

export default LoginButton
