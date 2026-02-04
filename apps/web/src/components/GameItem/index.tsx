import React, { useRef, useEffect, useState } from 'react'
import classNames from 'classnames'
import type { Game, GameStatus } from '../../types'
import { Trash2, Loader2, Pin } from 'lucide-react'
import { isGameReleased } from '../../utils/dateUtils'
import styles from './index.module.scss'

interface GameItemProps {
  game: Game
  onUpdate: (id: string, updates: Partial<Game>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onPin: (id: string) => Promise<void>
  isHighlighted: boolean
  onShowToast?: (message: string) => void
}

export const GameItem: React.FC<GameItemProps> = ({
  game,
  onUpdate,
  onDelete,
  onPin,
  isHighlighted,
  onShowToast,
}) => {
  const itemRef = useRef<HTMLDivElement>(null)
  const [isEditingSteamUrl, setIsEditingSteamUrl] = useState(false)
  const [steamUrlInput, setSteamUrlInput] = useState(game.steamUrl || '')
  const [coverError, setCoverError] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const statusBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isHighlighted])

  const getNextStatus = (status: GameStatus): GameStatus => {
    const statusFlow: Record<GameStatus, GameStatus> = {
      queueing: 'playing',
      playing: 'completion',
      completion: 'queueing',
    }
    return statusFlow[status]
  }

  const getActionLabel = (nextStatus: GameStatus): string => {
    const actions: Record<GameStatus, string> = {
      playing: 'Start Playing',
      completion: 'Mark Complete',
      queueing: 'Queue',
    }
    return actions[nextStatus]
  }

  const handleStatusClick = async () => {
    if (isAnimating || isUpdating) return

    const nextStatus = getNextStatus(game.status)

    // 进入 loading 状态
    setIsUpdating(true)

    try {
      // 先调用接口更新状态
      await onUpdate(game.id, {
        status: nextStatus,
        lastUpdated: new Date().toISOString(),
      })

      // 接口成功后，开始播放动画
      const btnRect = statusBtnRef.current?.getBoundingClientRect()
      if (!btnRect) {
        setIsUpdating(false)
        return
      }

      // 查找目标 tab 按钮
      const targetTab = document.querySelector(`[data-status="${nextStatus}"]`) as HTMLElement
      if (!targetTab) {
        setIsUpdating(false)
        return
      }

      const targetRect = targetTab.getBoundingClientRect()

      // 创建飞行的圆形图片
      const flyingImg = document.createElement('div')
      flyingImg.className = styles.flyingCover

      // 设置背景图片
      if (game.coverImage && !coverError) {
        flyingImg.style.backgroundImage = `url(${game.coverImage})`
      } else {
        flyingImg.textContent = game.name.charAt(0).toUpperCase()
        flyingImg.classList.add(styles.flyingCoverPlaceholder)
      }

      document.body.appendChild(flyingImg)
      setIsAnimating(true)

      // 定义动画参数
      const startX = btnRect.left + btnRect.width / 2
      const startY = btnRect.top + btnRect.height / 2
      const endX = targetRect.left + targetRect.width / 2
      const endY = targetRect.top + targetRect.height / 2

      // 计算控制点（贝塞尔曲线的顶点）
      const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))
      const peakHeight = Math.min(250, distance * 0.6) // 抛物线高度
      const controlX = (startX + endX) / 2
      const controlY = Math.min(startY, endY) - peakHeight

      const duration = 900 // 动画持续时间（毫秒）
      const startTime = performance.now()

      let hasTriggeredTabAnimation = false

      // 二次贝塞尔曲线函数
      const bezierQuadratic = (t: number, p0: number, p1: number, p2: number): number => {
        const u = 1 - t
        return u * u * p0 + 2 * u * t * p1 + t * t * p2
      }

      // 缓动函数（ease-in-out）
      const easeInOutCubic = (t: number): number => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      }

      // 动画循环
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const rawProgress = Math.min(elapsed / duration, 1)
        const progress = easeInOutCubic(rawProgress)

        // 计算当前位置（贝塞尔曲线）
        const currentX = bezierQuadratic(progress, startX, controlX, endX)
        const currentY = bezierQuadratic(progress, startY, controlY, endY)

        // 计算旋转角度（两圈）
        const rotation = progress * 720

        // 计算缩放
        let scale = 1
        if (progress < 0.3) {
          scale = 1 + progress * 1 // 0 -> 0.3: 1.0 -> 1.3
        } else if (progress < 0.7) {
          scale = 1.3 - (progress - 0.3) * 0.5 // 0.3 -> 0.7: 1.3 -> 1.1
        } else {
          scale = 1.1 - (progress - 0.7) * 3 // 0.7 -> 1.0: 1.1 -> 0.2
        }

        // 计算透明度
        const opacity = progress > 0.85 ? 1 - (progress - 0.85) / 0.15 : 1

        // 应用变换
        flyingImg.style.left = `${currentX}px`
        flyingImg.style.top = `${currentY}px`
        flyingImg.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`
        flyingImg.style.opacity = `${opacity}`

        // 在 70% 进度时触发 tab 响应动画
        if (progress >= 0.7 && !hasTriggeredTabAnimation) {
          hasTriggeredTabAnimation = true
          targetTab.classList.add('tabReceiving')
          setTimeout(() => {
            targetTab.classList.remove('tabReceiving')
          }, 500)
        }

        // 继续动画或结束
        if (rawProgress < 1) {
          requestAnimationFrame(animate)
        } else {
          flyingImg.remove()
          setIsAnimating(false)
          setIsUpdating(false)
        }
      }

      // 启动动画
      requestAnimationFrame(animate)
    } catch (error) {
      // 接口调用失败，恢复状态
      console.error('Failed to update game status:', error)
      setIsUpdating(false)
      onShowToast?.('更新状态失败，请重试')
    }
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

  const handlePinClick = async () => {
    if (isPinning) return

    setIsPinning(true)
    try {
      await onPin(game.id)
    } finally {
      setIsPinning(false)
    }
  }

  const handleDeleteClick = async () => {
    if (isDeleting) return

    if (!window.confirm(`确定要删除 "${game.name}"?`)) {
      return
    }

    setIsDeleting(true)
    try {
      await onDelete(game.id)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      ref={itemRef}
      className={classNames(styles.gameCard, {
        [styles.playing]: game.status === 'playing',
        [styles.highlight]: isHighlighted,
        [styles.pinned]: game.isPinned,
      })}
      id={`game-${game.id}`}
    >
      {game.status === 'queueing' && (
        <button
          onClick={handlePinClick}
          className={classNames(styles.pinBtnAbsolute, {
            [styles.active]: game.isPinned,
            [styles.loading]: isPinning,
          })}
          title={game.isPinned ? '取消置顶' : '置顶游戏'}
          disabled={isPinning}
        >
          {isPinning ? <Loader2 size={16} className={styles.spinner} /> : <Pin size={16} />}
        </button>
      )}

      <button
        onClick={handleDeleteClick}
        className={classNames(styles.deleteBtnAbsolute, { [styles.loading]: isDeleting })}
        title="删除游戏"
        disabled={isDeleting}
      >
        {isDeleting ? <Loader2 size={16} className={styles.spinner} /> : <Trash2 size={16} />}
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
                  {!isGameReleased(game.comingSoon ?? null, game.releaseDate ?? null) ? (
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
                    {!isGameReleased(game.comingSoon ?? null, game.releaseDate ?? null) ? (
                      <span className={styles.comingSoon}>预计发售: {game.releaseDate}</span>
                    ) : (
                      <span className={styles.releaseDate}>发布于 {game.releaseDate}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.gameActions}>
              <button
                ref={statusBtnRef}
                className={classNames(
                  styles.gameStatusBtn,
                  styles[`status-${getNextStatus(game.status)}`],
                  { [styles.loading]: isUpdating }
                )}
                onClick={handleStatusClick}
                title={getActionLabel(getNextStatus(game.status))}
                disabled={isAnimating || isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    <span>Updating...</span>
                  </>
                ) : (
                  getActionLabel(getNextStatus(game.status))
                )}
              </button>
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
