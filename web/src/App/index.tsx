import { useState, useMemo, useEffect, useRef } from 'react'
import classNames from 'classnames'
import { GameItem } from '../components/GameItem'
import { SearchBar, type SearchResult } from '../components/SearchBar'
import { SteamSearch } from '../components/SteamSearch'
import { Settings } from '../components/Settings'
import { MiniGames } from '../components/MiniGames'
import type { Game, GameStatus } from '../types'
import { AnimatePresence, motion } from 'framer-motion'
import { SettingsIcon, Loader2, Play, Bookmark, CheckCircle, Library, Sparkles } from 'lucide-react'
import { githubService } from '../services/github'
import { steamService } from '../services/steam'
import { handleSteamCallback } from '../services/steamAuth'
import styles from './index.module.scss'

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSteamSearch, setShowSteamSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [mainTab, setMainTab] = useState<'steamgames' | 'playground'>('steamgames')
  const [activeTab, setActiveTab] = useState<'playing' | 'queueing' | 'completion'>('playing')

  // Handle Steam login callback
  useEffect(() => {
    const result = handleSteamCallback()
    if (result.success && result.user) {
      setToast(`欢迎，${result.user.username}！Steam 登录成功`)
    } else if (result.error) {
      setToast('Steam 登录失败，请重试')
    }
  }, [])

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

        // 数据迁移：将 pending 状态迁移为 queueing
        const hasPendingGames = data.games.some((g: Game) => (g.status as string) === 'pending')

        if (hasPendingGames) {
          console.log('Migrating pending games to queueing...')
          const migratedGames = data.games.map((g: Game) =>
            (g.status as string) === 'pending' ? { ...g, status: 'queueing' as GameStatus } : g
          )

          // 保存迁移后的数据
          await githubService.updateGames(
            { games: migratedGames },
            'Migrate pending status to queueing'
          )

          setGames(migratedGames)
          setToast('数据已自动迁移：pending → queueing')
          console.log('Migration completed')
        } else {
          setGames(data.games)
        }
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

      console.log(
        prioritizeMissing
          ? '开始刷新游戏信息（包含所有游戏的抢先体验状态）...'
          : '开始刷新游戏好评率...'
      )

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
          // 在首次刷新时，强制刷新所有游戏的抢先体验状态
          // 在定期刷新时，只刷新缺少数据的游戏或已标记为抢先体验的游戏（确保游戏转正时能及时更新）
          const needsReleaseInfo =
            prioritizeMissing ||
            !game.releaseDate ||
            game.isEarlyAccess === null ||
            game.isEarlyAccess === undefined ||
            game.isEarlyAccess === true

          const [reviews, releaseInfo] = await Promise.all([
            steamService.getGameReviews(appId),
            needsReleaseInfo
              ? steamService.getGameReleaseDate(appId)
              : Promise.resolve({
                  releaseDate: game.releaseDate,
                  comingSoon: game.comingSoon,
                  isEarlyAccess: game.isEarlyAccess,
                  genres: null,
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
            (needsReleaseInfo && releaseInfo.releaseDate !== game.releaseDate) ||
            (needsReleaseInfo && releaseInfo.isEarlyAccess !== game.isEarlyAccess)

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
              `已更新 ${game.name} 的信息: 好评率 ${reviews.positivePercentage}%, 发布日期 ${releaseInfo.releaseDate}, 抢先体验 ${releaseInfo.isEarlyAccess}`
            )
          }
        } catch (err) {
          console.error(`刷新 ${game.name} 信息失败:`, err)
        }

        // 添加延迟避免请求过快
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      console.log(prioritizeMissing ? '游戏信息刷新完成（已刷新抢先体验状态）' : '好评率刷新完成')

      // 所有游戏刷新完成后，统一保存一次到 GitHub
      if (hasAnyUpdate) {
        try {
          const finalGames = await githubService.concurrentUpdateGames((remoteGames) => {
            // 将最新的好评率数据合并到远程数据中
            // 以远程数据为基准，只更新好评率相关字段
            const updatedRemoteGames = remoteGames.map((remoteGame) => {
              const localUpdate = gamesRef.current.find((g) => g.id === remoteGame.id)
              if (localUpdate) {
                // 如果本地有更新（好评率等），应用到远程数据
                // 注意：这里我们假设 gamesRef.current 中的好评率是最新的，因为我们刚刚刷新过
                // 但是，如果远程 games 列表已经变了（比如删除了游戏），map 会保留远程的列表结构
                return {
                  ...remoteGame,
                  positivePercentage: localUpdate.positivePercentage,
                  totalReviews: localUpdate.totalReviews,
                  releaseDate: localUpdate.releaseDate,
                  comingSoon: localUpdate.comingSoon,
                  isEarlyAccess: localUpdate.isEarlyAccess,
                }
              }
              return remoteGame
            })
            return updatedRemoteGames
          }, 'Update games info after refresh')

          // 更新本地状态以匹配远程（虽然这里主要是后台刷新，但保持一致是个好习惯）
          setGames(finalGames)
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
    const sortByPinnedAndDate = (a: Game, b: Game) => {
      // 置顶的游戏优先
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      // 都置顶或都不置顶，按更新时间排序
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    }

    const playing = games.filter((g) => g.status === 'playing').sort(sortByPinnedAndDate)
    const queueing = games.filter((g) => g.status === 'queueing').sort(sortByPinnedAndDate)
    const completion = games.filter((g) => g.status === 'completion').sort(sortByPinnedAndDate)

    return { playing, queueing, completion }
  }, [games])

  // Generate search results
  const searchResults = useMemo((): SearchResult[] => {
    if (!searchTerm) return []

    const results: SearchResult[] = []
    const lowerSearch = searchTerm.toLowerCase()

    // Search in Steam games
    games.forEach((game) => {
      if (game.name.toLowerCase().includes(lowerSearch)) {
        results.push({
          id: game.id,
          name: game.name,
          type: 'steam-game',
          status: game.status,
          mainTab: 'steamgames',
        })
      }
    })

    // Search in mini games
    const miniGames = [
      { id: 'snake', name: '贪吃蛇', description: '经典贪吃蛇游戏，控制蛇吃食物并避免撞墙' },
      { id: '2048', name: '2048', description: '滑动方块合并相同数字，挑战达到 2048' },
      { id: 'memory', name: '记忆翻牌', description: '翻开卡片找出所有配对，挑战你的记忆力' },
      { id: 'tower', name: '塔防', description: '建造防御塔抵御敌人，通过三个关卡' },
      { id: 'breakout', name: '打砖块', description: '经典街机游戏，用挡板接球打碎砖块' },
      { id: 'flappy', name: 'Flappy Bird', description: '点击屏幕控制小鸟飞行，躲避管道障碍' },
      { id: 'match3', name: '连连看', description: '找到相同图案配对消除，挑战你的眼力' },
      { id: 'jump', name: '跳一跳', description: '长按蓄力跳跃，落在中心获得连击加分' },
      { id: 'fruit', name: '接水果', description: '控制篮子接住水果得分，躲避炸弹' },
    ]
    miniGames.forEach((game) => {
      if (
        game.name.toLowerCase().includes(lowerSearch) ||
        game.description.toLowerCase().includes(lowerSearch)
      ) {
        results.push({
          id: game.id,
          name: game.name,
          type: 'mini-game',
          mainTab: 'playground',
        })
      }
    })

    return results
  }, [games, searchTerm])

  // Handle search result click
  const handleSearchResultClick = (result: SearchResult) => {
    setMainTab(result.mainTab)
    if (result.type === 'steam-game' && result.status) {
      setActiveTab(result.status)
      // Scroll to the game after a short delay to allow tab switch
      setTimeout(() => {
        setHighlightId(result.id)
        setTimeout(() => setHighlightId(null), 2000)
      }, 100)
    }
  }

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
      // 重复的游戏仍然算作成功，因为游戏已存在，只是不需要再添加
      return
    }

    const newGame: Game = {
      id: Date.now().toString(),
      name,
      status: 'queueing',
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
      // 使用 concurrentUpdateGames 确保在添加时获取最新数据，避免覆盖他人更改
      const finalGames = await githubService.concurrentUpdateGames(
        (currentGames) => {
          // 再次检查是否已存在（防止并发添加）
          const duplicate = currentGames.find((g) => g.name.toLowerCase() === name.toLowerCase())
          if (duplicate) {
            throw new Error(`"${name}" 已经在队列中！`)
          }
          return [newGame, ...currentGames]
        },
        `Add game via web: ${name} (${steamUrl.split('/').pop()})`
      )

      setGames(finalGames)

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

              // 保存更新到 GitHub
              try {
                await githubService.concurrentUpdateGames((currentGames) => {
                  return currentGames.map((g) => {
                    if (g.id === newGame.id) {
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
                }, `Update game via web: ${name}`)

                console.log(
                  `已获取并保存 ${name} 的信息: 好评率 ${reviews.positivePercentage}%, 发布日期 ${releaseInfo.releaseDate}, 抢先体验 ${releaseInfo.isEarlyAccess}`
                )
              } catch (saveErr) {
                console.error(`保存 ${name} 信息到 GitHub 失败:`, saveErr)
              }
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
      throw err // 重新抛出错误以便 SteamSearch 组件可以处理
    }
  }

  const handleUpdateGame = async (id: string, updates: Partial<Game>) => {
    const game = games.find((g) => g.id === id)
    if (!game) return

    try {
      const finalGames = await githubService.concurrentUpdateGames((currentGames) => {
        return currentGames.map((g) =>
          g.id === id ? { ...g, ...updates, lastUpdated: new Date().toISOString() } : g
        )
      }, `Update game via web: ${game.name}`)

      setGames(finalGames)
    } catch (err) {
      console.error('Failed to update game:', err)
      setToast('更新游戏失败')
      // 不需要回滚，因为我们没有提前更新本地状态
    }
  }

  const handleDeleteGame = async (id: string) => {
    const game = games.find((g) => g.id === id)
    if (!game) return

    try {
      const finalGames = await githubService.concurrentUpdateGames((currentGames) => {
        return currentGames.filter((g) => g.id !== id)
      }, `Remove game via web: ${game.name}`)

      setGames(finalGames)
      setToast(`移除了 "${game.name}"`)
    } catch (err) {
      console.error('Failed to delete game:', err)
      setToast('删除游戏失败')
    }
  }

  const handlePinGame = async (id: string) => {
    const game = games.find((g) => g.id === id)
    if (!game) return

    const newPinnedState = !game.isPinned

    try {
      const finalGames = await githubService.concurrentUpdateGames(
        (currentGames) => {
          return currentGames.map((g) =>
            g.id === id
              ? { ...g, isPinned: newPinnedState, lastUpdated: new Date().toISOString() }
              : g
          )
        },
        `${newPinnedState ? 'Pin' : 'Unpin'} game via web: ${game.name}`
      )

      setGames(finalGames)
      setToast(newPinnedState ? `已置顶 "${game.name}"` : `已取消置顶 "${game.name}"`)
    } catch (err) {
      console.error('Failed to pin game:', err)
      setToast('操作失败')
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
          <SearchBar
            value={searchTerm}
            onSearch={handleSearch}
            results={searchResults}
            onResultClick={handleSearchResultClick}
          />
          <button onClick={() => setShowSettings(true)} className={styles.btnSettings} title="设置">
            <SettingsIcon size={18} />
          </button>
        </div>
      </header>

      {/* Main Tab Navigation */}
      <div className={styles.mainTabNav}>
        <button
          onClick={() => setMainTab('steamgames')}
          className={classNames(styles.mainTabBtn, {
            [styles.mainTabActive]: mainTab === 'steamgames',
          })}
        >
          <Library size={20} />
          Steam Games
        </button>
        <button
          onClick={() => setMainTab('playground')}
          className={classNames(styles.mainTabBtn, {
            [styles.mainTabActive]: mainTab === 'playground',
          })}
        >
          <Sparkles size={20} />
          Playground
        </button>
      </div>

      <main>
        {mainTab === 'playground' ? (
          <MiniGames onClose={() => {}} />
        ) : isLoading ? (
          <div className={styles.loadingContainer}>
            <Loader2 className={`${styles.loaderIcon} animate-spin`} size={32} />
            <div className={styles.mt1}>加载中...</div>
          </div>
        ) : (
          <div>
            {/* Tab Navigation with Add Button */}
            <div className={styles.tabNavRow}>
              <div className={styles.tabNav}>
                <button
                  data-status="playing"
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
                  data-status="queueing"
                  onClick={() => setActiveTab('queueing')}
                  className={classNames(styles.tabBtn, {
                    [styles.active]: activeTab === 'queueing',
                    [styles.activeQueueing]: activeTab === 'queueing',
                  })}
                >
                  <Bookmark size={16} />
                  Queueing ({groupedGames.queueing.length})
                </button>
                <button
                  data-status="completion"
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
              <button onClick={() => setShowSteamSearch(true)} className={styles.btnSteam}>
                从 Steam 添加
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
                        onPin={handlePinGame}
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
