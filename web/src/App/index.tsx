import { useState, useMemo, useEffect, useRef } from 'react'
import classNames from 'classnames'
import { GameItem } from '../components/GameItem'
import { SearchBar } from '../components/SearchBar'
import { SteamSearch } from '../components/SteamSearch'
import { Settings } from '../components/Settings'
import type { Game } from '../types'
import { AnimatePresence, motion } from 'framer-motion'
import { SettingsIcon, Loader2, Play, Bookmark, CheckCircle } from 'lucide-react'
import { githubService } from '../services/github'
import { steamService } from '../services/steam'
import styles from './index.module.scss'

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSteamSearch, setShowSteamSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<'playing' | 'pending' | 'completion'>('playing')

  // Fetch games on mount
  useEffect(() => {
    const loadGames = async () => {
      if (!githubService.isConfigured()) {
        setShowSettings(true)
        return
      }

      setIsLoading(true)
      try {
        const data = await githubService.fetchGames()
        setGames(data.games)
      } catch (err) {
        console.error('Failed to fetch games:', err)
        setToast('加载游戏失败。请检查 GitHub 配置。')
        setShowSettings(true)
      } finally {
        setIsLoading(false)
      }
    }

    loadGames()
  }, [])

  // Clear highlight after a few seconds
  useEffect(() => {
    if (highlightId) {
      const timer = setTimeout(() => setHighlightId(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [highlightId])

  // Clear toast after a few seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // 使用 ref 保存最新的 games 状态
  const gamesRef = useRef(games)
  useEffect(() => {
    gamesRef.current = games
  }, [games])

  // 定时刷新游戏好评率（每30分钟）
  useEffect(() => {
    const refreshReviews = async (prioritizeMissing = false) => {
      const currentGames = gamesRef.current
      if (currentGames.length === 0) return

      console.log('开始刷新游戏好评率...')

      // 按优先级排序：缺少好评率的游戏优先
      let gamesToRefresh = [...currentGames]
      if (prioritizeMissing) {
        gamesToRefresh = gamesToRefresh.sort((a, b) => {
          const aMissing = a.positivePercentage === null || a.positivePercentage === undefined
          const bMissing = b.positivePercentage === null || b.positivePercentage === undefined
          if (aMissing && !bMissing) return -1
          if (!aMissing && bMissing) return 1
          return 0
        })
      }

      let hasAnyUpdate = false

      for (const game of gamesToRefresh) {
        if (!game.steamUrl) continue

        // 从 steamUrl 中提取 appId
        const match = game.steamUrl.match(/\/app\/(\d+)/)
        if (!match) continue

        const appId = parseInt(match[1])

        try {
          // 只在缺少发布日期或抢先体验状态时才获取，因为这些数据不会频繁变动
          const needsReleaseInfo =
            !game.releaseDate || game.isEarlyAccess === null || game.isEarlyAccess === undefined

          const [reviews, releaseInfo] = await Promise.all([
            steamService.getGameReviews(appId),
            needsReleaseInfo
              ? steamService.getGameReleaseDate(appId)
              : Promise.resolve({
                  releaseDate: game.releaseDate,
                  comingSoon: game.comingSoon,
                  isEarlyAccess: game.isEarlyAccess,
                }),
          ])

          // 如果获取到了数据，或者数据有变化时更新
          const needsUpdate =
            game.positivePercentage === null ||
            game.positivePercentage === undefined ||
            game.releaseDate === null ||
            game.releaseDate === undefined ||
            game.isEarlyAccess === null ||
            game.isEarlyAccess === undefined ||
            reviews.positivePercentage !== game.positivePercentage ||
            reviews.totalReviews !== game.totalReviews ||
            (needsReleaseInfo && releaseInfo.releaseDate !== game.releaseDate)

          if (
            needsUpdate &&
            (reviews.positivePercentage !== null ||
              reviews.totalReviews !== null ||
              releaseInfo.releaseDate !== null ||
              releaseInfo.isEarlyAccess !== null)
          ) {
            hasAnyUpdate = true

            // 更新本地状态
            setGames((prevGames) =>
              prevGames.map((g) => {
                if (g.id === game.id) {
                  // 使用最新的游戏状态，只更新好评率相关字段
                  return {
                    ...g,
                    positivePercentage: reviews.positivePercentage ?? g.positivePercentage,
                    totalReviews: reviews.totalReviews ?? g.totalReviews,
                    releaseDate: releaseInfo.releaseDate ?? g.releaseDate,
                    comingSoon: releaseInfo.comingSoon ?? g.comingSoon,
                    isEarlyAccess: releaseInfo.isEarlyAccess ?? g.isEarlyAccess,
                    // 不更新 lastUpdated，保持原有排序
                  }
                }
                return g
              })
            )

            console.log(
              `已更新 ${game.name} 的信息: 好评率 ${reviews.positivePercentage}%, 发布日期 ${releaseInfo.releaseDate}`
            )
          }
        } catch (err) {
          console.error(`刷新 ${game.name} 信息失败:`, err)
        }

        // 添加延迟避免请求过快
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      console.log('好评率刷新完成')

      // 所有游戏刷新完成后，统一保存一次到 GitHub
      if (hasAnyUpdate) {
        try {
          const finalGames = gamesRef.current
          await githubService.updateGames(
            { games: finalGames },
            'Update games info after refresh'
          )
          console.log('已保存所有游戏信息到 GitHub')
        } catch (err) {
          console.error('保存游戏信息到 GitHub 失败:', err)
        }
      }
    }

    // 延迟2秒后进行首次刷新，优先处理缺少好评率的游戏
    const initialTimer = setTimeout(() => refreshReviews(true), 2000)

    // 每30分钟刷新一次
    const interval = setInterval(() => refreshReviews(false), 30 * 60 * 1000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [])

  // Group games by status
  const groupedGames = useMemo(() => {
    const filtered = searchTerm
      ? games.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : games

    const playing = filtered
      .filter((g) => g.status === 'playing')
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    const pending = filtered
      .filter((g) => g.status === 'pending')
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    const completion = filtered
      .filter((g) => g.status === 'completion')
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())

    return { playing, pending, completion }
  }, [games, searchTerm])

  const handleAddGameFromSteam = async (
    name: string,
    steamUrl: string,
    coverImage: string,
    _tags: string[],
    positivePercentage?: number,
    totalReviews?: number,
    releaseDate?: string,
    comingSoon?: boolean,
    isEarlyAccess?: boolean
  ) => {
    const existing = games.find((g) => g.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      setToast(`"${name}" 已经在队列中！`)
      setHighlightId(existing.id)
      return
    }

    const newGame: Game = {
      id: Date.now().toString(),
      name,
      status: 'pending',
      addedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      steamUrl,
      coverImage,
      positivePercentage,
      totalReviews,
      releaseDate,
      comingSoon,
      isEarlyAccess,
    }

    try {
      const updatedGames = [newGame, ...games]
      setGames(updatedGames)

      await githubService.updateGames(
        { games: updatedGames },
        `Add game via web: ${name} (${steamUrl.split('/').pop()})`
      )

      setToast(`从 Steam 添加了 "${name}"`)
      setHighlightId(newGame.id)

      // 如果没有好评率或发布日期数据，立即拉取
      if (
        positivePercentage === undefined ||
        positivePercentage === null ||
        totalReviews === undefined ||
        totalReviews === null ||
        !newGame.releaseDate ||
        isEarlyAccess === undefined ||
        isEarlyAccess === null
      ) {
        const match = steamUrl.match(/\/app\/(\d+)/)
        if (match) {
          const appId = parseInt(match[1])
          console.log(`正在获取 ${name} 的信息...`)

          try {
            const [reviews, releaseInfo] = await Promise.all([
              steamService.getGameReviews(appId),
              steamService.getGameReleaseDate(appId),
            ])

            if (
              reviews.positivePercentage !== null ||
              reviews.totalReviews !== null ||
              releaseInfo.releaseDate !== null ||
              releaseInfo.isEarlyAccess !== null
            ) {
              // 更新本地状态
              setGames((prevGames) =>
                prevGames.map((g) => {
                  if (g.id === newGame.id) {
                    // 使用最新的游戏状态，只更新好评率相关字段
                    return {
                      ...g,
                      positivePercentage: reviews.positivePercentage ?? positivePercentage,
                      totalReviews: reviews.totalReviews ?? totalReviews,
                      releaseDate: releaseInfo.releaseDate ?? g.releaseDate,
                      comingSoon: releaseInfo.comingSoon ?? g.comingSoon,
                      isEarlyAccess: releaseInfo.isEarlyAccess ?? g.isEarlyAccess,
                    }
                  }
                  return g
                })
              )

              console.log(
                `已获取 ${name} 的信息: 好评率 ${reviews.positivePercentage}%, 发布日期 ${releaseInfo.releaseDate}, 抢先体验 ${releaseInfo.isEarlyAccess}`
              )
            }
          } catch (err) {
            console.error(`获取 ${name} 信息失败:`, err)
          }
        }
      }
    } catch (err) {
      console.error('Failed to add game:', err)
      setToast('添加游戏失败')
      setGames(games) // 回滚
    }
  }

  const handleUpdateGame = async (id: string, updates: Partial<Game>) => {
    const game = games.find((g) => g.id === id)
    if (!game) return

    const updatedGame: Game = {
      ...game,
      ...updates,
      lastUpdated: new Date().toISOString(),
    }

    try {
      const updatedGames = games.map((g) => (g.id === id ? updatedGame : g))
      setGames(updatedGames)

      await githubService.updateGames({ games: updatedGames }, `Update game via web: ${game.name}`)
    } catch (err) {
      console.error('Failed to update game:', err)
      setToast('更新游戏失败')
      setGames(games) // 回滚
    }
  }

  const handleDeleteGame = async (id: string) => {
    const game = games.find((g) => g.id === id)
    if (!game) return

    if (window.confirm(`确定要删除 "${game.name}"?`)) {
      try {
        const updatedGames = games.filter((g) => g.id !== id)
        setGames(updatedGames)

        await githubService.updateGames(
          { games: updatedGames },
          `Remove game via web: ${game.name}`
        )

        setToast(`移除了 "${game.name}"`)
      } catch (err) {
        console.error('Failed to delete game:', err)
        setToast('删除游戏失败')
        setGames(games) // 回滚
      }
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (term) {
      const match = games.find((g) => g.name.toLowerCase().includes(term.toLowerCase()))
      if (match) {
        setHighlightId(match.id)
      }
    }
  }

  const handleSettingsClose = () => {
    setShowSettings(false)
    // 重新加载游戏数据（如果配置已更新）
    if (githubService.isConfigured()) {
      githubService
        .fetchGames()
        .then((data) => setGames(data.games))
        .catch((err) => console.error('Failed to reload games:', err))
    }
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>GameGallery</h1>
        <div className={styles.headerActions}>
          <SearchBar value={searchTerm} onSearch={handleSearch} />
          <button onClick={() => setShowSteamSearch(true)} className={styles.btnSteam}>
            从 Steam 添加
          </button>
          <button onClick={() => setShowSettings(true)} className={styles.btnSettings}>
            <SettingsIcon size={18} />
            设置
          </button>
        </div>
      </header>

      <main>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <Loader2 className={`${styles.loaderIcon} animate-spin`} size={32} />
            <div className={styles.mt1}>加载中...</div>
          </div>
        ) : (
          <div>
            {/* Tab Navigation - iOS Style */}
            <div className={styles.tabNav}>
              <button
                onClick={() => setActiveTab('playing')}
                className={classNames(styles.tabBtn, {
                  [styles.active]: activeTab === 'playing',
                  [styles.activePlaying]: activeTab === 'playing',
                })}
              >
                <Play size={16} />
                Playing ({groupedGames.playing.length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={classNames(styles.tabBtn, {
                  [styles.active]: activeTab === 'pending',
                  [styles.activePending]: activeTab === 'pending',
                })}
              >
                <Bookmark size={16} />
                Pending ({groupedGames.pending.length})
              </button>
              <button
                onClick={() => setActiveTab('completion')}
                className={classNames(styles.tabBtn, {
                  [styles.active]: activeTab === 'completion',
                  [styles.activeCompletion]: activeTab === 'completion',
                })}
              >
                <CheckCircle size={16} />
                Completion ({groupedGames.completion.length})
              </button>
            </div>

            {/* Game List */}
            <div className={styles.gameList}>
              <AnimatePresence mode="wait">
                {groupedGames[activeTab].length > 0 ? (
                  groupedGames[activeTab].map((game) => (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className={styles.gameItemWrapper}
                    >
                      <GameItem
                        game={game}
                        onUpdate={handleUpdateGame}
                        onDelete={handleDeleteGame}
                        isHighlighted={highlightId === game.id}
                        onShowToast={setToast}
                      />
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={styles.emptyState}
                  >
                    该状态下暂无游戏
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {games.length === 0 && <div className={styles.emptyState}>队列中暂无游戏</div>}
          </div>
        )}
      </main>

      {showSteamSearch && (
        <SteamSearch onAddGame={handleAddGameFromSteam} onClose={() => setShowSteamSearch(false)} />
      )}

      {showSettings && <Settings onClose={handleSettingsClose} />}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={styles.toast}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
