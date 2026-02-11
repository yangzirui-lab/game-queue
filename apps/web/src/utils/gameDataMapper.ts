import type { BackendGame, UserGame, UserGameWithDetails, Game, GameStatus, Genre } from '../types'

// ==================== Helper Functions ====================

/**
 * 合并后端游戏数据和用户游戏数据为前端 Game 类型
 * @param backendGames - 后端游戏列表
 * @param userGames - 用户游戏关系列表（可选，如果后端已包含用户数据则可为 null）
 * @returns 合并后的前端游戏列表
 */
function mergeGameData(
  backendGames: BackendGame[] | UserGameWithDetails[],
  userGames: UserGame[] | null
): Game[] {
  // Happy Path: 后端已包含用户游戏数据（新 API 架构）
  if (!userGames) {
    return (backendGames as UserGameWithDetails[])
      .filter((backendGame) => backendGame.status !== undefined)
      .map((backendGame) => ({
        id: backendGame.id,
        name: backendGame.name,
        status: backendGame.status!,
        isPinned: backendGame.is_pinned ?? false,
        addedAt: backendGame.created_at,
        lastUpdated: backendGame.updated_at,
        steamUrl: backendGame.steam_url,
        coverImage: backendGame.capsule_image,
        // 优先使用后端返回的数据（如果有）
        positivePercentage: backendGame.positive_percentage ?? undefined,
        totalReviews: backendGame.total_reviews ?? undefined,
        chinesePositivePercentage: undefined,
        chineseTotalReviews: undefined,
        releaseDate: backendGame.release_date ?? backendGame.release_date_text,
        comingSoon: backendGame.categories?.includes('Coming Soon'),
        isEarlyAccess:
          backendGame.is_early_access ?? backendGame.categories?.includes('Early Access'),
        genres: (backendGame.genres as string[] | undefined)?.map(
          (name: string): Genre => ({ id: name, description: name })
        ),
      }))
  }

  // 旧 API 架构：创建用户游戏映射表并合并
  const userGameMap = new Map<string, UserGame>()
  for (const userGame of userGames) {
    userGameMap.set(userGame.game_id, userGame)
  }

  // 合并数据
  const games: Game[] = []
  for (const backendGame of backendGames) {
    const userGame = userGameMap.get(backendGame.id)

    // Happy Path: 后端游戏不在用户库中，跳过
    if (!userGame) {
      continue
    }

    const game: Game = {
      id: backendGame.id,
      name: backendGame.name,
      status: userGame.status,
      isPinned: userGame.is_pinned,
      addedAt: userGame.added_at,
      lastUpdated: backendGame.updated_at,
      steamUrl: backendGame.steam_url,
      coverImage: backendGame.capsule_image,
      // 优先使用后端返回的数据（如果有）
      positivePercentage: backendGame.positive_percentage ?? undefined,
      totalReviews: backendGame.total_reviews ?? undefined,
      chinesePositivePercentage: undefined,
      chineseTotalReviews: undefined,
      releaseDate: backendGame.release_date ?? backendGame.release_date_text,
      comingSoon: backendGame.categories?.includes('Coming Soon'),
      isEarlyAccess:
        backendGame.is_early_access ?? backendGame.categories?.includes('Early Access'),
      genres: (backendGame.genres as string[] | undefined)?.map(
        (name: string): Genre => ({ id: name, description: name })
      ),
    }

    games.push(game)
  }

  return games
}

/**
 * 从 Steam URL 提取 App ID
 * @param steamUrl - Steam 商店链接
 * @returns App ID 或 null
 */
function extractAppIdFromSteamUrl(steamUrl: string): number | null {
  const match = steamUrl.match(/\/app\/(\d+)/)
  if (!match) {
    return null
  }

  return parseInt(match[1])
}

/**
 * 将前端 Game 对象转换为后端 CreateGameRequest 参数
 * @param game - 前端游戏对象（部分字段）
 * @returns 后端创建游戏请求参数
 */
function toCreateGameRequest(game: {
  appId: number
  name: string
  steamUrl?: string
  coverImage?: string
  type?: string
  status?: GameStatus
  positivePercentage?: number
  totalReviews?: number
  chinesePositivePercentage?: number
  chineseTotalReviews?: number
  releaseDate?: string
  comingSoon?: boolean
  isEarlyAccess?: boolean
}): {
  app_id: number
  name: string
  type: string
  steam_url?: string
  capsule_image?: string
  status?: GameStatus
  positive_percentage?: number
  total_reviews?: number
  chinese_positive_percentage?: number
  chinese_total_reviews?: number
  release_date?: string
  coming_soon?: boolean
  is_early_access?: boolean
} {
  return {
    app_id: game.appId,
    name: game.name,
    type: game.type || 'game',
    steam_url: game.steamUrl,
    capsule_image: game.coverImage,
    status: game.status || 'queueing',
    positive_percentage: game.positivePercentage,
    total_reviews: game.totalReviews,
    chinese_positive_percentage: game.chinesePositivePercentage,
    chinese_total_reviews: game.chineseTotalReviews,
    release_date: game.releaseDate,
    coming_soon: game.comingSoon,
    is_early_access: game.isEarlyAccess,
  }
}

// ==================== Exports ====================

export { mergeGameData, extractAppIdFromSteamUrl, toCreateGameRequest }
