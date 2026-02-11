import React, { useState } from 'react'
import { X, Loader2, LogOut, LogIn } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import styles from './index.module.scss'

interface SettingsProps {
  onClose: () => void
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { user, isAuthenticated, login, logout, isLoading: authLoading } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)

    if (!username.trim() || !password.trim()) {
      setLoginError('请输入用户名和密码')
      return
    }

    setIsLoggingIn(true)

    const success = await login(username, password)

    if (!success) {
      setLoginError('登录失败：用户名或密码错误')
      setIsLoggingIn(false)
      return
    }

    // 登录成功，清空表单
    setUsername('')
    setPassword('')
    setIsLoggingIn(false)
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button onClick={onClose} className={styles.closeBtn}>
          <X size={24} />
        </button>

        <h2 className={styles.title}>设置</h2>

        <div className={styles.form}>
          {/* 账号登录部分 */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>账号管理</h3>
            {isAuthenticated && user ? (
              <div className={styles.userProfile}>
                <div className={styles.userInfo}>
                  <div className={styles.username}>
                    <LogIn size={18} />
                    已登录：{user.username}
                  </div>
                  <p className={styles.helpText}>认证状态通过 Cookie 管理，有效期 60 天</p>
                </div>
                <button onClick={handleLogout} className={styles.btnLogout}>
                  <LogOut size={18} />
                  退出登录
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className={styles.loginForm}>
                {loginError && <div className={styles.errorBox}>{loginError}</div>}

                <div className={styles.inputGroup}>
                  <label className={styles.label}>用户名</label>
                  <input
                    type="text"
                    className={styles.inputPrimary}
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoggingIn}
                    autoFocus
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>密码</label>
                  <input
                    type="password"
                    className={styles.inputPrimary}
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoggingIn}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn || authLoading}
                  className={styles.btnSave}
                >
                  {isLoggingIn ? (
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
