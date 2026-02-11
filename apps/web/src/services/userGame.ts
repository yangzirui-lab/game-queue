import type {
  UserGame,
  UserGameWithDetails,
  GameStatus,
  Pagination,
  AddUserGameRequest,
  AddUserGameResponse,
  AddUserGameErrorResponse,
  UpdateUserGameRequest,
  UpdateUserGameResponse,
  GetUserGamesResponse,
} from '../types'
import { USER_GAMES_API, getUserGameApiUrl, getUserGameStatusApiUrl } from '../constants/api'
import { getToken } from './auth'

// ==================== Main Class ====================

/**
 * 用户游戏服务
 * 所有接口都需要认证，使用 Bearer Token
 */
class UserGameService {
  /**
   * 获取请求 headers
   * 使用 Bearer Token 认证
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    const token = getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  /**
   * 获取当前用户的游戏库（需认证）
   * @param params - 查询参数
   * @param params.status - 游戏状态筛选
   * @param params.page - 页码
   * @param params.page_size - 每页数量
   * @returns 成功时返回用户游戏列表（包含完整游戏信息）和分页信息，失败时返回 null
   */
  async getUserGames(params?: {
    status?: GameStatus
    page?: number
    page_size?: number
  }): Promise<{ data: UserGameWithDetails[]; pagination: Pagination } | null> {
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams()
      if (params?.status) queryParams.append('status', params.status)
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString())

      const url = queryParams.toString()
        ? `${USER_GAMES_API}?${queryParams.toString()}`
        : USER_GAMES_API

      const response = await fetch(url, {
        headers: this.getHeaders(),
      })

      // Happy Path: 未认证
      if (response.status === 401) {
        console.error('[UserGameService] Unauthorized: Please login first')
        return null
      }

      // Happy Path: API 请求失败
      if (!response.ok) {
        console.error(
          `[UserGameService] Failed to get user games: ${response.status} ${response.statusText}`
        )
        return null
      }

      const result: GetUserGamesResponse = await response.json()

      // Happy Path: 响应数据无效
      if (!result || !result.data || !result.pagination) {
        console.error('[UserGameService] Invalid response data')
        return null
      }

      return { data: result.data, pagination: result.pagination }
    } catch (error) {
      console.error('[UserGameService] Failed to get user games:', error)
      return null
    }
  }

  /**
   * 添加游戏到用户库（需认证）
   * 支持通过 game_id 或 app_id 添加
   * @param params - 添加参数
   * @param params.game_id - 游戏 UUID（二选一）
   * @param params.app_id - Steam App ID（二选一）
   * @param params.status - 游戏状态（默认 queueing）
   * @param params.is_pinned - 是否置顶（默认 false）
   * @param params.sort_order - 排序权重（默认 0）
   * @returns 成功时返回用户游戏关系对象，失败时返回 null
   */
  async addUserGame(
    params: AddUserGameRequest
  ): Promise<UserGame | AddUserGameErrorResponse | null> {
    // Happy Path: 既没有 game_id 也没有 app_id
    if (!params.game_id && !params.app_id) {
      console.error('[UserGameService] Either game_id or app_id is required')
      return null
    }

    try {
      const response = await fetch(USER_GAMES_API, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      })

      // Happy Path: 未认证
      if (response.status === 401) {
        console.error('[UserGameService] Unauthorized: Please login first')
        return null
      }

      // Happy Path: 游戏不存在（使用 app_id 时）
      if (response.status === 404) {
        const errorData = await response.json()
        console.warn('[UserGameService] Game not found in database:', errorData.message)
        // 返回特殊标记，让调用者知道需要先创建游戏
        return { error: 'game_not_found', app_id: params.app_id }
      }

      // Happy Path: API 请求失败
      if (!response.ok) {
        console.error(
          `[UserGameService] Failed to add user game: ${response.status} ${response.statusText}`
        )
        return null
      }

      const data: AddUserGameResponse = await response.json()

      // Happy Path: 响应数据无效
      if (!data || !data.data) {
        console.error('[UserGameService] Invalid response data')
        return null
      }

      console.log(`[UserGameService] Successfully added game to user library`)
      return data.data
    } catch (error) {
      console.error('[UserGameService] Failed to add user game:', error)
      return null
    }
  }

  /**
   * 更新用户游戏状态（需认证）
   * @param gameId - 游戏 ID (UUID)
   * @param updates - 要更新的字段（status 和/或 is_pinned）
   * @returns 成功时返回更新后的用户游戏关系对象，失败时返回 null
   */
  async updateUserGame(gameId: string, updates: UpdateUserGameRequest): Promise<UserGame | null> {
    // Happy Path: 游戏 ID 为空
    if (!gameId || gameId.trim() === '') {
      console.error('[UserGameService] Invalid game ID')
      return null
    }

    // Happy Path: 没有更新内容
    if (!updates.status && updates.is_pinned === undefined) {
      console.error('[UserGameService] No updates provided')
      return null
    }

    try {
      // 使用 /status 路径更新游戏状态
      const statusUrl = getUserGameStatusApiUrl(gameId)
      const response = await fetch(statusUrl, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      })

      // Happy Path: 未认证
      if (response.status === 401) {
        console.error('[UserGameService] Unauthorized: Please login first')
        return null
      }

      // Happy Path: 游戏不在用户库中
      if (response.status === 404) {
        console.warn(`[UserGameService] User game not found: ${gameId}`)
        return null
      }

      // Happy Path: API 请求失败
      if (!response.ok) {
        console.error(
          `[UserGameService] Failed to update user game: ${response.status} ${response.statusText}`
        )
        return null
      }

      const data: UpdateUserGameResponse = await response.json()

      // Happy Path: 响应数据无效
      if (!data || !data.data) {
        console.error('[UserGameService] Invalid response data')
        return null
      }

      console.log(`[UserGameService] Successfully updated user game: ${gameId}`)
      return data.data
    } catch (error) {
      console.error('[UserGameService] Failed to update user game:', error)
      return null
    }
  }

  /**
   * 从用户库中移除游戏（需认证）
   * @param gameId - 游戏 ID (UUID)
   * @returns 成功返回 true，失败返回 false
   */
  async removeUserGame(gameId: string): Promise<boolean> {
    // Happy Path: 游戏 ID 为空
    if (!gameId || gameId.trim() === '') {
      console.error('[UserGameService] Invalid game ID')
      return false
    }

    try {
      const userGameUrl = getUserGameApiUrl(gameId)
      const response = await fetch(userGameUrl, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })

      // Happy Path: 未认证
      if (response.status === 401) {
        console.error('[UserGameService] Unauthorized: Please login first')
        return false
      }

      // Happy Path: 游戏不在用户库中
      if (response.status === 404) {
        console.warn(`[UserGameService] User game not found: ${gameId}`)
        return false
      }

      // Happy Path: API 请求失败
      if (!response.ok) {
        console.error(
          `[UserGameService] Failed to remove user game: ${response.status} ${response.statusText}`
        )
        return false
      }

      console.log(`[UserGameService] Successfully removed game from user library: ${gameId}`)
      return true
    } catch (error) {
      console.error('[UserGameService] Failed to remove user game:', error)
      return false
    }
  }
}

// ==================== Service Instance ====================

const userGameService = new UserGameService()

// ==================== Exports ====================

export { UserGameService, userGameService }
