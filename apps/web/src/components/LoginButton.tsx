/**
 * 登录表单组件
 * 提供用户名密码登录功能
 * 支持紧凑模式（横向）和完整模式（纵向）
 */

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, LogIn, LogOut } from 'lucide-react'
import styles from './LoginButton.module.scss'

// ==================== Types ====================

interface LoginButtonProps {
  mode?: 'compact' | 'full' // 紧凑模式或完整模式
  onLoginSuccess?: () => void // 登录成功回调
}

// ==================== Component ====================

function LoginButton({ mode = 'compact', onLoginSuccess }: LoginButtonProps = {}) {
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

    // 触发回调
    onLoginSuccess?.()
  }

  if (isLoading) {
    return (
      <div className={styles.loginContainer}>
        <button className={styles.loading} disabled>
          加载中...
        </button>
      </div>
    )
  }

  if (isAuthenticated && user) {
    if (mode === 'full') {
      return (
        <div className={styles.fullMode}>
          <div className={styles.userProfile}>
            <div className={styles.userInfoFull}>
              <div className={styles.usernameFull}>
                <LogIn size={18} />
                已登录：{user.username}
              </div>
              <p className={styles.helpText}>认证状态通过 Cookie 管理，有效期 60 天</p>
            </div>
            <button onClick={logout} className={styles.btnLogoutFull}>
              <LogOut size={18} />
              退出登录
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className={styles.loginContainer}>
        <div className={styles.userInfo}>
          <span className={styles.username}>欢迎，{user.username}</span>
        </div>
        <button onClick={logout} className={styles.btnLogout}>
          登出
        </button>
      </div>
    )
  }

  if (mode === 'full') {
    return (
      <div className={styles.fullMode}>
        <form onSubmit={handleSubmit} className={styles.loginFormFull}>
          {error && <div className={styles.errorBoxFull}>{error}</div>}

          <div className={styles.inputGroup}>
            <label className={styles.label}>用户名</label>
            <input
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              className={styles.inputFull}
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>密码</label>
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className={styles.inputFull}
            />
          </div>

          <button type="submit" disabled={isSubmitting} className={styles.btnLoginFull}>
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                登录中...
              </>
            ) : (
              <>
                <LogIn size={18} />
                登录
              </>
            )}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        {error && <span className={styles.error}>{error}</span>}

        <input
          type="text"
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isSubmitting}
          className={styles.input}
        />

        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          className={styles.input}
        />

        <button type="submit" disabled={isSubmitting} className={styles.btnLogin}>
          {isSubmitting ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  )
}

// ==================== Exports ====================

export default LoginButton
