import React, { useState, useEffect } from 'react'
import { X, Save, CheckCircle, XCircle, Loader2, LogOut } from 'lucide-react'
import { githubService } from '../../services/github'
import { getCurrentSteamUser, initiateSteamLogin, logoutSteam } from '../../services/steamAuth'
import styles from './index.module.scss'

interface SettingsProps {
  onClose: () => void
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [token, setToken] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [steamUser, setSteamUser] = useState(getCurrentSteamUser())

  const FIXED_OWNER = 'yangzirui-lab'
  const FIXED_REPO = 'game-gallery'

  useEffect(() => {
    const config = githubService.getConfig()
    if (config) {
      setToken(config.token)
      // 强制更新为正确的owner和repo
      if (config.owner !== FIXED_OWNER || config.repo !== FIXED_REPO) {
        githubService.saveConfig({ token: config.token, owner: FIXED_OWNER, repo: FIXED_REPO })
      }
    }
  }, [])

  const handleTest = async () => {
    if (!token) {
      setErrorMessage('请填写 GitHub Token')
      setTestStatus('error')
      return
    }

    setIsTesting(true)
    setTestStatus('idle')
    setErrorMessage('')

    try {
      // 使用写死的用户名
      const tempConfig = { token, owner: FIXED_OWNER, repo: FIXED_REPO }
      githubService.saveConfig(tempConfig)

      const success = await githubService.testConnection()
      if (success) {
        setTestStatus('success')
      } else {
        setTestStatus('error')
        setErrorMessage(
          `连接失败。仓库 ${FIXED_OWNER}/${FIXED_REPO} 不存在或无法访问。请检查 Token 权限。`
        )
      }
    } catch (error) {
      setTestStatus('error')
      setErrorMessage(error instanceof Error ? error.message : '连接测试失败')
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    if (!token) {
      setErrorMessage('请填写 GitHub Token')
      return
    }

    setIsSaving(true)
    setErrorMessage('')

    try {
      // 使用写死的用户名
      githubService.saveConfig({ token, owner: FIXED_OWNER, repo: FIXED_REPO })

      // 测试连接
      const success = await githubService.testConnection()
      if (success) {
        setTestStatus('success')
        setTimeout(() => {
          onClose()
        }, 1000)
      } else {
        setErrorMessage(
          `配置已保存，但仓库 ${FIXED_OWNER}/${FIXED_REPO} 不存在或无法访问。请检查 Token 权限。`
        )
        setTestStatus('error')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存失败')
      setTestStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleSteamLogin = () => {
    initiateSteamLogin()
  }

  const handleSteamLogout = () => {
    logoutSteam()
    setSteamUser(null)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button onClick={onClose} className={styles.closeBtn}>
          <X size={24} />
        </button>

        <h2 className={styles.title}>设置</h2>

        <div className={styles.form}>
          {/* Steam 登录部分 */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Steam 账号（可选）</h3>
            {steamUser ? (
              <div className={styles.steamProfile}>
                <img
                  src={steamUser.avatar}
                  alt={steamUser.username}
                  className={styles.steamAvatar}
                />
                <div className={styles.steamInfo}>
                  <div className={styles.steamUsername}>{steamUser.username}</div>
                  <a
                    href={steamUser.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.steamLink}
                  >
                    查看 Steam 主页
                  </a>
                </div>
                <button onClick={handleSteamLogout} className={styles.btnLogout}>
                  <LogOut size={18} />
                  退出登录
                </button>
              </div>
            ) : (
              <div>
                <button onClick={handleSteamLogin} className={styles.btnSteamLogin}>
                  <img
                    src="https://community.akamai.steamstatic.com/public/images/signinthroughsteam/sits_01.png"
                    alt="Sign in through Steam"
                    className={styles.steamLoginImage}
                  />
                </button>
                <div className={styles.helpText}>显示个人资料信息</div>
              </div>
            )}
          </div>

          <div className={styles.divider}></div>

          {/* GitHub 配置部分 */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>GitHub 配置</h3>
            <div>
              <label className={styles.label}>GitHub Token</label>
              <input
                type="password"
                className={styles.inputPrimary}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <div className={styles.helpText}>
                需要 <code>repo</code> 权限
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  创建 Token
                </a>
              </div>
            </div>

            {errorMessage && <div className={styles.errorBox}>{errorMessage}</div>}

            {testStatus === 'success' && (
              <div className={styles.successBox}>
                <CheckCircle size={18} />
                连接成功！
              </div>
            )}

            <div className={styles.actions}>
              <button
                onClick={handleTest}
                disabled={isTesting || !token}
                className={styles.btnTest}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    测试中...
                  </>
                ) : testStatus === 'error' ? (
                  <>
                    <XCircle size={18} />
                    重新测试
                  </>
                ) : (
                  '测试连接'
                )}
              </button>

              <button onClick={handleSave} disabled={isSaving || !token} className={styles.btnSave}>
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    保存
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
