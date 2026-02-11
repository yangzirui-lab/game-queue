import { useState, useEffect, lazy, Suspense, useRef, useCallback } from 'react'
import classNames from 'classnames'
import { GameItem } from '../components/GameItem'
import { SearchBar, type SearchResult } from '../components/SearchBar'
import type { Game } from '../types'
import { AnimatePresence, motion } from 'framer-motion'
import { SettingsIcon, Loader2, Play, Bookmark, CheckCircle, Library, Sparkles } from 'lucide-react'
import { gameService } from '../services/game'
import { userGameService } from '../services/userGame'
import { steamService } from '../services/steam'
import type { GameStatus } from '../types'
import {
  mergeGameData,
  toCreateGameRequest,
  extractAppIdFromSteamUrl,
} from '../utils/gameDataMapper'
import styles from './index.module.scss'

// 导入自定义 hooks
import { useToast } from '../hooks/useToast'
import { useHighlight } from '../hooks/useHighlight'
import { useGamesGrouping } from '../hooks/useGamesGrouping'
import { useGameSearch } from '../hooks/useGameSearch'
import { useGameRefresh } from '../hooks/useGameRefresh'

// 懒加载重组件（命名导出转换为默认导出）
const MiniGames = lazy(() =>
  import('../components/MiniGames').then((module) => ({ default: module.MiniGames }))
)
const SteamSearch = lazy(() =>
  import('../components/SteamSearch').then((module) => ({ default: module.SteamSearch }))
)
const Settings = lazy(() =>
  import('../components/Settings').then((module) => ({ default: module.Settings }))
)

function App() {
  // 状态管理
  const [games, setGames] = useState<Game[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSteamSearch, setShowSteamSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [mainTab, setMainTab] = useState<'steamgames' | 'playground'>('steamgames')
  const [activeTab, setActiveTab] = useState<'playing' | 'queueing' | 'completion'>('playing')

  // 分页状态
  const [playingPage, setPlayingPage] = useState(1)
  const [queueingPage, setQueueingPage] = useState(1)
  const [completionPage, setCompletionPage] = useState(1)
  const [hasMorePlaying, setHasMorePlaying] = useState(false)
  const [hasMoreQueueing, setHasMoreQueueing] = useState(false)
  const [hasMoreCompletion, setHasMoreCompletion] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // 使用自定义 hooks
  const { toast, showToast } = useToast()
  const { highlightId, setHighlightId } = useHighlight()
  const groupedGames = useGamesGrouping(games)
  const searchResults = useGameSearch(games, searchTerm)

  // IntersectionObserver ref
  const observerTarget = useRef<HTMLDivElement>(null)

  // 定时刷新游戏信息
  useGameRefresh(games, setGames)

  // 加载指定状态的游戏
  const loadGamesByStatus = async (status: GameStatus, page: number = 1) => {
    const result = await userGameService.getUserGames({
      status,
      page,
      page_size: 20,
    })

    // Happy Path: 获取失败或未登录
    if (!result) {
      return { games: [], hasMore: false }
    }

    // 转换为前端格式
    const games = mergeGameData(result.data, null)
    return { games, hasMore: result.pagination.has_next }
  }

  // 初始化：加载所有状态的第一页
  useEffect(() => {
    const loadAllGames = async () => {
      setIsLoading(true)

      const [playingResult, queueingResult, completionResult] = await Promise.all([
        loadGamesByStatus('playing', 1),
        loadGamesByStatus('queueing', 1),
        loadGamesByStatus('completion', 1),
      ])

      const allGames = [...playingResult.games, ...queueingResult.games, ...completionResult.games]

      setGames(allGames)
      setHasMorePlaying(playingResult.hasMore)
      setHasMoreQueueing(queueingResult.hasMore)
      setHasMoreCompletion(completionResult.hasMore)
      setIsLoading(false)
    }

    loadAllGames()
  }, [])

  // 以下 useEffect 已被提取到自定义 hooks 中：
  // - highlightId 自动清除 → useHighlight
  // - toast 自动清除 → useToast
  // - 定时刷新游戏信息 → useGameRefresh

  // 以下代码已被提取到自定义 hooks 中：
  // - 定时刷新游戏信息 → useGameRefresh
  // - 游戏分组和排序 → useGamesGrouping
  // - 搜索逻辑 → useGameSearch

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
    // Happy Path: 游戏已存在
    const existing = games.find((g) => g.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      showToast(`"${name}" 已经在队列中！`)
      setHighlightId(existing.id)
      return
    }

    // 从 steamUrl 中提取 appId
    const appId = extractAppIdFromSteamUrl(steamUrl)
    if (!appId) {
      showToast('无效的 Steam URL')
      return
    }

    // 1. 尝试直接使用 app_id 添加到用户库
    const addResult = await userGameService.addUserGame({
      app_id: appId,
      status: 'queueing',
      is_pinned: false,
    })

    let gameId: string

    // 2. 如果游戏不存在数据库，先创建游戏
    if (addResult && 'error' in addResult && addResult.error === 'game_not_found') {
      const createGameParams = toCreateGameRequest({
        appId,
        name,
        steamUrl,
        coverImage,
        type: 'game',
        positivePercentage,
        totalReviews,
        releaseDate,
        comingSoon,
        isEarlyAccess,
      })

      const createdGame = await gameService.createGame(createGameParams)

      // Happy Path: 创建游戏失败
      if (!createdGame) {
        showToast('创建游戏失败')
        return
      }

      // 3. 创建成功后，再添加到用户库
      const addResult2 = await userGameService.addUserGame({
        app_id: appId,
        status: 'queueing',
        is_pinned: false,
      })

      if (!addResult2 || 'error' in addResult2) {
        showToast('添加游戏到库失败')
        return
      }

      gameId = createdGame.id
    } else if (!addResult || 'error' in addResult) {
      // Happy Path: 添加失败
      showToast('添加游戏失败')
      return
    } else {
      gameId = addResult.game_id
    }

    // 4. 获取完整的游戏信息
    const backendGame = await gameService.getGame(gameId)

    // Happy Path: 获取游戏信息失败
    if (!backendGame) {
      showToast('获取游戏信息失败')
      return
    }

    // 更新本地状态
    const newGame: Game = {
      id: backendGame.id,
      name: backendGame.name,
      status: 'queueing',
      isPinned: false,
      addedAt: backendGame.created_at,
      lastUpdated: backendGame.updated_at,
      steamUrl: backendGame.steam_url,
      coverImage: backendGame.capsule_image,
      positivePercentage: positivePercentage,
      totalReviews: totalReviews,
      chinesePositivePercentage: undefined,
      chineseTotalReviews: undefined,
      releaseDate: backendGame.release_date ?? backendGame.release_date_text,
      comingSoon: comingSoon ?? backendGame.categories?.includes('Coming Soon'),
      isEarlyAccess: isEarlyAccess ?? backendGame.categories?.includes('Early Access'),
      genres: backendGame.genres?.map((name) => ({ id: name, description: name })),
    }

    setGames([newGame, ...games])
    showToast(`从 Steam 添加了 "${name}"`)
    setHighlightId(newGame.id)

    // 如果没有好评率或发布日期数据，立即拉取
    const needsAdditionalInfo =
      positivePercentage === undefined ||
      positivePercentage === null ||
      totalReviews === undefined ||
      totalReviews === null ||
      !newGame.releaseDate ||
      isEarlyAccess === undefined ||
      isEarlyAccess === null

    if (!needsAdditionalInfo) {
      return
    }

    // appId 已经在上面定义过了，这里直接使用

    const [reviews, releaseInfo] = await Promise.all([
      steamService.getGameReviews({ appId }),
      steamService.getGameReleaseDate({ appId }),
    ])

    // Happy Path: 获取信息失败或没有新数据
    if (
      !reviews ||
      !releaseInfo ||
      (reviews.positivePercentage === null &&
        reviews.totalReviews === null &&
        releaseInfo.releaseDate === null &&
        releaseInfo.isEarlyAccess === null)
    ) {
      return
    }

    // 注意：后端不支持存储好评率字段，只更新后端支持的字段
    const updatedBackendGame = await gameService.updateGame(newGame.id, {
      release_date: releaseInfo.releaseDate ?? newGame.releaseDate,
      coming_soon: releaseInfo.comingSoon ?? newGame.comingSoon,
      is_early_access: releaseInfo.isEarlyAccess ?? newGame.isEarlyAccess,
    })

    // Happy Path: 更新失败（不影响主流程，已经添加成功了）
    if (!updatedBackendGame) {
      // 即使后端更新失败，也继续更新本地状态
    }

    // 更新本地状态（包括好评率数据，仅保存在本地）
    setGames((prevGames) =>
      prevGames.map((g) => {
        if (g.id === newGame.id) {
          return {
            ...g,
            positivePercentage: reviews.positivePercentage ?? positivePercentage,
            totalReviews: reviews.totalReviews ?? totalReviews,
            chinesePositivePercentage: reviews.chinesePositivePercentage ?? undefined,
            chineseTotalReviews: reviews.chineseTotalReviews ?? undefined,
            releaseDate: releaseInfo.releaseDate ?? newGame.releaseDate,
            comingSoon: releaseInfo.comingSoon ?? newGame.comingSoon,
            isEarlyAccess: releaseInfo.isEarlyAccess ?? newGame.isEarlyAccess,
            lastUpdated: new Date().toISOString(),
          }
        }
        return g
      })
    )
  }

  const handleUpdateGame = async (id: string, updates: Partial<Game>) => {
    // Happy Path: 游戏不存在
    const game = games.find((g) => g.id === id)
    if (!game) {
      return
    }

    // 只有状态或置顶字段发生变化时才调用更新接口
    if (!updates.status && updates.isPinned === undefined) {
      return
    }

    // 更新用户游戏状态
    const result = await userGameService.updateUserGame(id, {
      status: updates.status,
      is_pinned: updates.isPinned,
    })

    // Happy Path: 更新失败
    if (!result) {
      showToast('更新游戏失败')
      return
    }

    // 更新本地状态
    setGames((prevGames) =>
      prevGames.map((g) =>
        g.id === id
          ? {
              ...g,
              ...(updates.status && { status: updates.status }),
              ...(updates.isPinned !== undefined && { isPinned: updates.isPinned }),
              lastUpdated: new Date().toISOString(),
            }
          : g
      )
    )
  }

  const handleDeleteGame = async (id: string) => {
    // Happy Path: 游戏不存在
    const game = games.find((g) => g.id === id)
    if (!game) {
      return
    }

    // 删除游戏
    const success = await gameService.deleteGame(id)

    // Happy Path: 删除失败
    if (!success) {
      showToast('删除游戏失败')
      return
    }

    // 更新本地状态
    setGames((prevGames) => prevGames.filter((g) => g.id !== id))
    showToast(`移除了 "${game.name}"`)
  }

  const handlePinGame = async (id: string) => {
    // Happy Path: 游戏不存在
    const game = games.find((g) => g.id === id)
    if (!game) {
      return
    }

    // 注意：后端暂未实现置顶功能的独立接口
    const newPinnedState = !game.isPinned

    showToast('置顶功能暂未实现，请联系后端开发')

    // 临时方案：仅在前端更新状态（页面刷新后会丢失）
    setGames((prevGames) =>
      prevGames.map((g) =>
        g.id === id ? { ...g, isPinned: newPinnedState, lastUpdated: new Date().toISOString() } : g
      )
    )
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

  const handleSettingsClose = async () => {
    setShowSettings(false)

    // 重新加载游戏数据（如果用户刚登录）
    const [playingResult, queueingResult, completionResult] = await Promise.all([
      loadGamesByStatus('playing', 1),
      loadGamesByStatus('queueing', 1),
      loadGamesByStatus('completion', 1),
    ])

    const allGames = [...playingResult.games, ...queueingResult.games, ...completionResult.games]

    setGames(allGames)
    setPlayingPage(1)
    setQueueingPage(1)
    setCompletionPage(1)
    setHasMorePlaying(playingResult.hasMore)
    setHasMoreQueueing(queueingResult.hasMore)
    setHasMoreCompletion(completionResult.hasMore)
  }

  // 加载更多游戏
  const loadMoreGames = useCallback(
    async (status: GameStatus) => {
      // 防止重复加载
      if (isLoadingMore) {
        return
      }

      let currentPage: number
      let setPage: (page: number) => void
      let setHasMore: (hasMore: boolean) => void
      let hasMore: boolean

      if (status === 'playing') {
        currentPage = playingPage
        setPage = setPlayingPage
        setHasMore = setHasMorePlaying
        hasMore = hasMorePlaying
      } else if (status === 'queueing') {
        currentPage = queueingPage
        setPage = setQueueingPage
        setHasMore = setHasMoreQueueing
        hasMore = hasMoreQueueing
      } else {
        currentPage = completionPage
        setPage = setCompletionPage
        setHasMore = setHasMoreCompletion
        hasMore = hasMoreCompletion
      }

      // 如果没有更多数据，不加载
      if (!hasMore) {
        return
      }

      setIsLoadingMore(true)

      try {
        const nextPage = currentPage + 1
        const result = await loadGamesByStatus(status, nextPage)

        setGames((prevGames) => [...prevGames, ...result.games])
        setPage(nextPage)
        setHasMore(result.hasMore)
      } catch (error) {
        console.error('加载更多游戏失败:', error)
      } finally {
        setIsLoadingMore(false)
      }
    },
    [
      isLoadingMore,
      playingPage,
      queueingPage,
      completionPage,
      hasMorePlaying,
      hasMoreQueueing,
      hasMoreCompletion,
    ]
  )

  // IntersectionObserver 监听滚动到底部
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          loadMoreGames(activeTab)
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [activeTab, isLoadingMore, loadMoreGames])

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
          <Suspense
            fallback={
              <div className={styles.loadingContainer}>
                <Loader2 className={`${styles.loaderIcon} animate-spin`} size={32} />
                <div className={styles.mt1}>加载中...</div>
              </div>
            }
          >
            <MiniGames onClose={() => {}} />
          </Suspense>
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
                  <>
                    {groupedGames[activeTab].map((game) => (
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
                          onShowToast={showToast}
                        />
                      </motion.div>
                    ))}
                    {/* 加载触发器 */}
                    <div ref={observerTarget} className={styles.loadMoreTrigger} />
                    {/* 加载状态提示 */}
                    {isLoadingMore && (
                      <div className={styles.loadingMore}>
                        <Loader2 className="animate-spin" size={24} />
                        <span>加载中...</span>
                      </div>
                    )}
                  </>
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
        <Suspense fallback={<div />}>
          <SteamSearch
            onAddGame={handleAddGameFromSteam}
            onClose={() => setShowSteamSearch(false)}
          />
        </Suspense>
      )}

      {showSettings && (
        <Suspense fallback={<div />}>
          <Settings onClose={handleSettingsClose} />
        </Suspense>
      )}

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
