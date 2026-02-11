import React from 'react'
import { X } from 'lucide-react'
import LoginButton from '../LoginButton'
import styles from './index.module.scss'

interface SettingsProps {
  onClose: () => void
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className={styles.closeBtn}>
          <X size={24} />
        </button>

        <h2 className={styles.title}>设置</h2>

        <div className={styles.form}>
          {/* 账号登录部分 */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>账号管理</h3>
            <LoginButton mode="full" />
          </div>
        </div>
      </div>
    </div>
  )
}
