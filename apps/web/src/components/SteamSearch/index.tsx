import React, { useState, useEffect } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import classNames from 'classnames'
import { steamService, type SteamGame } from '../../services/steam'
import styles from './index.module.scss'

interface SteamSearchProps {
  onAddGame: (
    name: string,
    steamUrl: string,
    coverImage: string,
    tags: string[],
    positivePercentage?: number,
    totalReviews?: number,
    releaseDate?: string,
    comingSoon?: boolean,
    isEarlyAccess?: boolean
  ) => Promise<void>
  onClose: () => void
}

export const SteamSearch: React.FC<SteamSearchProps> = ({ onAddGame, onClose }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SteamGame[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingGameId, setAddingGameId] = useState<number | null>(null)

  // 异步获取单个游戏的好评率和发布日期
  const fetchGameReviews = async (game: SteamGame) => {
    const [reviews, releaseInfo] = await Promise.all([
      steamService.getGameReviews({ appId: game.id }),
      steamService.getGameReleaseDate({ appId: game.id }),
    ])

    if (!reviews || !releaseInfo) {
      console.warn(`Failed to fetch info for game ${game.id}`)
      return
    }

    // 更新该游戏的好评率和发布日期数据
    setResults((prevResults) =>
      prevResults.map((g) =>
        g.id === game.id
          ? {
              ...g,
              positivePercentage: reviews.positivePercentage,
              totalReviews: reviews.totalReviews,
              releaseDate: releaseInfo.releaseDate,
              comingSoon: releaseInfo.comingSoon,
              isEarlyAccess: releaseInfo.isEarlyAccess,
            }
          : g
      )
    )
  }

  // 实时搜索：输入时自动搜索，带防抖
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    setError(null)

    const timer = setTimeout(async () => {
      const games = await steamService.search({ query })

      if (games === null) {
        setError('搜索失败，请重试')
        setIsSearching(false)
        return
      }

      setResults(games)

      // 先显示基本信息，然后异步获取每个游戏的好评率
      games.forEach((game) => {
        fetchGameReviews(game)
      })

      setIsSearching(false)
    }, 500) // 500ms 防抖

    return () => {
      clearTimeout(timer)
      setIsSearching(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleAddGame = async (game: SteamGame) => {
    if (addingGameId !== null) return // 防止重复点击

    setAddingGameId(game.id)
    try {
      await onAddGame(
        game.name,
        game.steamUrl,
        game.coverImage,
        game.tags,
        game.positivePercentage ?? undefined,
        game.totalReviews ?? undefined,
        game.releaseDate ?? undefined,
        game.comingSoon ?? undefined,
        game.isEarlyAccess ?? undefined
      )
      onClose()
    } catch (err) {
      console.error('Failed to add game:', err)
      setError('添加游戏失败，请重试')
    } finally {
      setAddingGameId(null)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button onClick={onClose} className={styles.closeBtn}>
          <X size={24} />
        </button>

        <h2 className={styles.title}>从 Steam 搜索游戏</h2>

        <div className={styles.searchWrapper}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              className={styles.inputPrimary}
              placeholder="输入游戏名称开始搜索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {isSearching && (
              <div className={styles.loadingIcon}>
                <Loader2 size={18} className="animate-spin" />
              </div>
            )}
          </div>
          {query && (
            <div className={styles.searchStatus}>
              {isSearching
                ? '正在搜索...'
                : results.length > 0
                  ? `找到 ${results.length} 个结果`
                  : '没有找到结果'}
            </div>
          )}
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <div className={styles.resultsList}>
          {results.length > 0 &&
            results.map((game) => (
              <div key={game.id} className={styles.resultItem}>
                <img
                  src={game.coverImage}
                  alt={game.name}
                  className={styles.coverImage}
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="45"%3E%3Crect fill="%23333" width="120" height="45"/%3E%3Ctext x="50%25" y="50%25" fill="%23666" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E'
                  }}
                />
                <div className={styles.gameInfo}>
                  <div className={styles.gameName}>{game.name}</div>
                  <div className={styles.gameMeta}>
                    {game.positivePercentage !== null &&
                    game.totalReviews !== null &&
                    game.totalReviews > 0 ? (
                      <div className={styles.metaRating}>
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
                          {game.totalReviews.toLocaleString()} 条评论
                        </span>
                      </div>
                    ) : (
                      <div className={styles.metaRatingLoading}>加载好评率中...</div>
                    )}
                    {game.tags.length > 0 && (
                      <div className={styles.metaTags}>{game.tags.join(', ')}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleAddGame(game)}
                  className={classNames(styles.addBtn, {
                    [styles.loading]: addingGameId === game.id,
                  })}
                  disabled={addingGameId === game.id}
                >
                  {addingGameId === game.id ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      添加中...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      添加
                    </>
                  )}
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
