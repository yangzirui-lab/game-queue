import React, { useState, useEffect } from 'react';
import { X, Save, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { githubService } from '../../services/github';
import styles from './index.module.scss';

interface SettingsProps {
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [token, setToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [detectedOwner, setDetectedOwner] = useState('');

  const FIXED_REPO = 'game-queue';

  useEffect(() => {
    const config = githubService.getConfig();
    if (config) {
      setToken(config.token);
      setDetectedOwner(config.owner);
    }
  }, []);

  const handleTest = async () => {
    if (!token) {
      setErrorMessage('请填写 GitHub Token');
      setTestStatus('error');
      return;
    }

    setIsTesting(true);
    setTestStatus('idle');
    setErrorMessage('');

    try {
      // 获取当前用户信息
      const owner = await githubService.getCurrentUser(token);
      if (!owner) {
        setTestStatus('error');
        setErrorMessage('无法获取用户信息。请检查 Token 是否有效。');
        setIsTesting(false);
        return;
      }

      setDetectedOwner(owner);

      // 临时保存配置以进行测试
      const tempConfig = { token, owner, repo: FIXED_REPO };
      githubService.saveConfig(tempConfig);

      const success = await githubService.testConnection();
      if (success) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
        setErrorMessage(`连接失败。仓库 ${owner}/${FIXED_REPO} 不存在或无法访问。`);
      }
    } catch (error) {
      setTestStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '连接测试失败');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!token) {
      setErrorMessage('请填写 GitHub Token');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      // 获取当前用户信息
      const owner = await githubService.getCurrentUser(token);
      if (!owner) {
        setErrorMessage('无法获取用户信息。请检查 Token 是否有效。');
        setTestStatus('error');
        setIsSaving(false);
        return;
      }

      setDetectedOwner(owner);

      githubService.saveConfig({ token, owner, repo: FIXED_REPO });

      // 测试连接
      const success = await githubService.testConnection();
      if (success) {
        setTestStatus('success');
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setErrorMessage(`配置已保存，但仓库 ${owner}/${FIXED_REPO} 不存在或无法访问。`);
        setTestStatus('error');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存失败');
      setTestStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button onClick={onClose} className={styles.closeBtn}>
          <X size={24} />
        </button>

        <h2 className={styles.title}>GitHub 配置</h2>

        <div className={styles.form}>
          <div>
            <label className={styles.label}>
              GitHub Token
            </label>
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
              需要 <code>repo</code> 权限。
              <a
                href="https://github.com/settings/tokens/new"
                target="_blank"
                rel="noopener noreferrer"
              >
                创建 Token
              </a>
            </div>
          </div>

          {detectedOwner && (
            <div className={styles.infoBox}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>GitHub 用户：</span>
                <span className={styles.infoValue}>{detectedOwner}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>仓库名称：</span>
                <span className={styles.infoValue}>{FIXED_REPO}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>完整路径：</span>
                <span className={styles.infoValue}>{detectedOwner}/{FIXED_REPO}</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className={styles.errorBox}>
              {errorMessage}
            </div>
          )}

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

            <button
              onClick={handleSave}
              disabled={isSaving || !token}
              className={styles.btnSave}
            >
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

          <div className={styles.instructions}>
            <strong>使用说明：</strong>
            <ul>
              <li>创建一个 GitHub Personal Access Token（需要 <code>repo</code> 权限）</li>
              <li>系统会自动获取您的 GitHub 用户名</li>
              <li>游戏数据将保存到 <code>game-queue</code> 仓库</li>
              <li>点击"测试连接"验证配置是否正确</li>
              <li>如果仓库不存在，需要先在 GitHub 创建 <code>game-queue</code> 仓库</li>
              <li>配置保存在浏览器本地，不会上传到服务器</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
