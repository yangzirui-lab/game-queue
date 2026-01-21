import React, { useRef, useEffect, useState } from 'react'
import classNames from 'classnames'
import type { Game, GameStatus } from '../../types'
import { Trash2 } from 'lucide-react'
import styles from './index.module.scss'

interface GameItemProps {
  game: Game
  onUpdate: (id: string, updates: Partial<Game>) => void
  onDelete: (id: string) => void
  isHighlighted: boolean
  onShowToast?: (message: string) => void
}

export const GameItem: React.FC<GameItemProps> = ({
  game,
  onUpdate,
  onDelete,
  isHighlighted,
  onShowToast,
}) => {
  const itemRef = useRef<HTMLDivElement>(null)
  const [isEditingSteamUrl, setIsEditingSteamUrl] = useState(false)
  const [steamUrlInput, setSteamUrlInput] = useState(game.steamUrl || '')
  const [coverError, setCoverError] = useState(false)

  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isHighlighted])

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(game.id, {
      status: e.target.value as GameStatus,
      lastUpdated: new Date().toISOString(),
    })
  }

  const handleSteamUrlSave = () => {
    if (steamUrlInput.trim()) {
      onUpdate(game.id, { steamUrl: steamUrlInput.trim() })
    }
    setIsEditingSteamUrl(false)
  }

  const handleSteamUrlCancel = () => {
    setSteamUrlInput(game.steamUrl || '')
    setIsEditingSteamUrl(false)
  }

  const handleGameNameClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()

    if (!game.steamUrl) {
      setIsEditingSteamUrl(true)
      return
    }

    const match = game.steamUrl.match(/\/app\/(\d+)/)
    if (!match) return

    const appId = match[1]
    const steamProtocolUrl = `steam://store/${appId}`
    const webUrl = game.steamUrl

    // 尝试打开Steam客户端
    window.location.href = steamProtocolUrl

    // 检测Steam客户端是否打开
    let blurred = false
    const onBlur = () => {
      blurred = true
    }

    window.addEventListener('blur', onBlur)

    // 2秒后检查，如果Steam未打开则降级到网页
    setTimeout(() => {
      window.removeEventListener('blur', onBlur)

      if (!blurred) {
        // Steam客户端未安装，打开网页版
        window.open(webUrl, '_blank', 'noopener,noreferrer')
        onShowToast?.('未检测到Steam客户端，建议安装以获得更好体验')
      }
    }, 2000)
  }

  const handleCoverClick = () => {
    if (!game.steamUrl) {
      onShowToast?.('该游戏尚未设置Steam链接')
      return
    }

    // 直接打开Steam网页版
    window.open(game.steamUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      ref={itemRef}
      className={classNames(styles.gameCard, {
        [styles.playing]: game.status === 'playing',
        [styles.highlight]: isHighlighted,
      })}
      id={`game-${game.id}`}
    >
      <button
        onClick={() => onDelete(game.id)}
        className={styles.deleteBtnAbsolute}
        title="删除游戏"
      >
        <Trash2 size={16} />
      </button>

      <div className={styles.gameWrapper}>
        <div className={styles.gameCoverContainer} onClick={handleCoverClick}>
          {game.coverImage && !coverError ? (
            <img
              src={game.coverImage}
              alt={game.name}
              className={styles.gameCover}
              onError={() => {
                setCoverError(true)
              }}
              onLoad={() => setCoverError(false)}
            />
          ) : (
            <div className={styles.gameCoverPlaceholder}>{game.name.charAt(0).toUpperCase()}</div>
          )}
          {game.isEarlyAccess && <div className={styles.earlyAccessBadge}>抢先体验</div>}
        </div>
        <div className={styles.gameContent}>
          <div className={styles.gameHeader}>
            <div className={styles.gameTitleArea}>
              <div className={styles.gameTitleRow}>
                <a href="#" onClick={handleGameNameClick} className={styles.gameNameLink}>
                  {game.name}
                </a>
              </div>

              <div className={styles.gameMeta}>
                <div className={styles.metaRow}>
                  {game.comingSoon ? (
                    <span className={styles.metaRating}>
                      <span className={styles.unreleased}>尚未发售</span>
                    </span>
                  ) : game.positivePercentage !== undefined &&
                    game.positivePercentage !== null &&
                    game.totalReviews !== undefined &&
                    game.totalReviews !== null ? (
                    <span className={styles.metaRating}>
                      <span
                        className={classNames(styles.ratingPercentage, {
                          [styles.high]: game.positivePercentage >= 80,
                          [styles.medium]:
                            game.positivePercentage >= 60 && game.positivePercentage < 80,
                          [styles.low]: game.positivePercentage < 60,
                        })}
                      >
                        {game.positivePercentage}% 好评
                      </span>
                      <span className={styles.reviewCount}>
                        {game.totalReviews?.toLocaleString()} 条评论
                      </span>
                    </span>
                  ) : (
                    <span className={styles.metaRatingLoading}>加载好评率中...</span>
                  )}
                </div>
                {game.releaseDate && (
                  <div className={styles.releaseInfo}>
                    {game.comingSoon ? (
                      <span className={styles.comingSoon}>预计发售: {game.releaseDate}</span>
                    ) : (
                      <span className={styles.releaseDate}>发布于 {game.releaseDate}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.gameActions}>
              <select
                className={styles.gameStatusSelect}
                value={game.status}
                onChange={handleStatusChange}
                style={{
                  color: `var(--status-${game.status})`,
                }}
              >
                <option value="playing">Playing</option>
                <option value="queueing">Queueing</option>
                <option value="completion">Completion</option>
              </select>
            </div>
          </div>

          {isEditingSteamUrl && (
            <div className={styles.steamUrlEditRow}>
              <input
                type="text"
                className={styles.inputPrimary}
                placeholder="Enter Steam URL..."
                value={steamUrlInput}
                onChange={(e) => setSteamUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSteamUrlSave()
                  if (e.key === 'Escape') handleSteamUrlCancel()
                }}
                autoFocus
              />
              <button onClick={handleSteamUrlSave} className={styles.btnSave}>
                Save
              </button>
              <button onClick={handleSteamUrlCancel} className={styles.btnCancel}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
