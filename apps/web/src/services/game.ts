import type {
  BackendGame,
  CreateGameRequest,
  CreateGameResponse,
  UpdateGameRequest,
  UpdateGameResponse,
  GetGamesResponse,
  GetGameResponse,
  Pagination,
} from '../types'
import { GAMES_API, GAMES_SEARCH_API, getGameApiUrl } from '../constants/api'
import { getToken } from './auth'

// ==================== Main Class ====================

/**
 * 游戏服务
 * 游戏查询接口（GET）为公开接口，无需认证
 * 游戏管理接口（POST/PUT/DELETE）需要 Bearer Token 认证
 */
class GameService {
  /**
   * 获取公开接口的 headers（无需认证）
   */
  private getPublicHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    }
  }

  /**
   * 获取需要认证的接口的 headers
   * 使用 Bearer Token 认证
   */
  private getAuthHeaders(): HeadersInit {
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
   * 获取所有游戏列表（公开接口，无需认证）
   * @param params - 查询参数
   * @param params.page - 页码，默认 1
   * @param params.page_size - 每页数量，默认 20，最大 100
   * @param params.sort_by - 排序字段：name, release_date, created_at
   * @param params.order - 排序方向：asc, desc
   * @param params.genres - 类型筛选，逗号分隔
   * @param params.categories - 分类筛选，逗号分隔
   * @param params.is_free - 是否免费
   * @returns 成功时返回游戏列表和分页信息，失败时返回 null
   */
  async getGames(params?: {
    page?: number
    page_size?: number
    sort_by?: string
    order?: 'asc' | 'desc'
    genres?: string
    categories?: string
    is_free?: boolean
  }): Promise<{ data: BackendGame[]; pagination: Pagination } | null> {
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString())
      if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
      if (params?.order) queryParams.append('order', params.order)
      if (params?.genres) queryParams.append('genres', params.genres)
      if (params?.categories) queryParams.append('categories', params.categories)
      if (params?.is_free !== undefined) queryParams.append('is_free', params.is_free.toString())

      const url = queryParams.toString() ? `${GAMES_API}?${queryParams.toString()}` : GAMES_API
      const response = await fetch(url, { headers: this.getPublicHeaders() })

      // Happy Path: API 请求失败
      if (!response.ok) {
        console.error(
          `[GameService] Failed to get games: ${response.status} ${response.statusText}`
        )
        return null
      }

      const result: GetGamesResponse = await response.json()

      // Happy Path: 响应数据无效
      if (!result || !result.data || !result.pagination) {
        console.error('[GameService] Invalid response data')
        return null
      }

      return { data: result.data, pagination: result.pagination }
    } catch (error) {
      console.error('[GameService] Failed to get games:', error)
      return null
    }
  }

  /**
   * 搜索游戏（公开接口，无需认证）
   * @param query - 搜索关键词
   * @param page - 页码，默认 1
   * @param page_size - 每页数量，默认 20
   * @returns 成功时返回游戏列表和分页信息，失败时返回 null
   */
  async searchGames(
    query: string,
    page?: number,
    page_size?: number
  ): Promise<{ data: BackendGame[]; pagination: Pagination } | null> {
    // Happy Path: 搜索关键词为空
    if (!query || query.trim() === '') {
      return {
        data: [],
        pagination: {
          page: 1,
          page_size: 20,
          total_count: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false,
        },
      }
    }

    try {
      const queryParams = new URLSearchParams()
      queryParams.append('q', query)
      if (page) queryParams.append('page', page.toString())
      if (page_size) queryParams.append('page_size', page_size.toString())

      const searchUrl = `${GAMES_SEARCH_API}?${queryParams.toString()}`
      const response = await fetch(searchUrl, { headers: this.getPublicHeaders() })

      // Happy Path: API 请求失败
      if (!response.ok) {
        console.error(
          `[GameService] Failed to search games: ${response.status} ${response.statusText}`
        )
        return null
      }

      const result: GetGamesResponse = await response.json()

      // Happy Path: 响应数据无效
      if (!result || !result.data || !result.pagination) {
        console.error('[GameService] Invalid response data')
        return null
      }

      return { data: result.data, pagination: result.pagination }
    } catch (error) {
      console.error('[GameService] Failed to search games:', error)
      return null
    }
  }

  /**
   * 获取单个游戏详情（公开接口，无需认证）
   * @param gameId - 游戏 ID (UUID)
   * @returns 成功时返回游戏对象，失败时返回 null
   */
  async getGame(gameId: string): Promise<BackendGame | null> {
    // Happy Path: 游戏 ID 为空
    if (!gameId || gameId.trim() === '') {
      console.error('[GameService] Invalid game ID')
      return null
    }

    try {
      const gameUrl = getGameApiUrl(gameId)
      const response = await fetch(gameUrl, { headers: this.getPublicHeaders() })

      // Happy Path: 游戏不存在
      if (response.status === 404) {
        console.warn(`[GameService] Game not found: ${gameId}`)
        return null
      }

      // Happy Path: API 请求失败
      if (!response.ok) {
        console.error(`[GameService] Failed to get game: ${response.status} ${response.statusText}`)
        return null
      }

      const data: GetGameResponse = await response.json()

      // Happy Path: 响应数据无效
      if (!data || !data.data) {
        console.error('[GameService] Invalid response data')
        return null
      }

      return data.data
    } catch (error) {
      console.error('[GameService] Failed to get game:', error)
      return null
    }
  }

  /**
   * 创建新游戏（需认证，Session Token 通过 Cookie 自动携带）
   * @param params - 游戏创建参数
   * @returns 成功时返回创建的游戏 ID 等信息，失败时返回 null
   */
  async createGame(params: CreateGameRequest): Promise<CreateGameResponse['data'] | null> {
    // Happy Path: 游戏名称为空
    if (!params.name || params.name.trim() === '') {
      console.error('[GameService] Game name is required')
      return null
    }

    // Happy Path: app_id 无效
    if (!params.app_id || params.app_id <= 0) {
      console.error('[GameService] Valid app_id is required')
      return null
    }

    try {
      const response = await fetch(GAMES_API, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(params),
      })

      // Happy Path: 未认证
      if (response.status === 401) {
        console.error('[GameService] Unauthorized: Please login first')
        return null
      }

      // Happy Path: App ID 已存在
      if (response.status === 409) {
        console.error('[GameService] Game with this app_id already exists')
        return null
      }

      // Happy Path: API 请求失败
      if (!response.ok) {
        console.error(
          `[GameService] Failed to create game: ${response.status} ${response.statusText}`
        )
        return null
      }

      const data: CreateGameResponse = await response.json()

      // Happy Path: ���应数据无效
      if (!data || !data.data) {
        console.error('[GameService] Invalid response data')
        return null
      }

      console.log(`[GameService] Successfully created game: ${params.name}`)
      return data.data
    } catch (error) {
      console.error('[GameService] Failed to create game:', error)
      return null
    }
  }

  /**
   * 更新游戏信息（需认证，Session Token 通过 Cookie 自动携带）
   * @param gameId - 游戏 ID (UUID)
   * @param updates - 要更新的字段
   * @returns 成功时返回更新消息，失败时返回 null
   */
  async updateGame(
    gameId: string,
    updates: UpdateGameRequest
  ): Promise<UpdateGameResponse['data'] | null> {
    // Happy Path: 游戏 ID 为空
    if (!gameId || gameId.trim() === '') {
      console.error('[GameService] Invalid game ID')
      return null
    }

    // Happy Path: 没有更新内容
    if (Object.keys(updates).length === 0) {
      console.error('[GameService] No fields to update')
      return null
    }

    try {
      const gameUrl = getGameApiUrl(gameId)
      const response = await fetch(gameUrl, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
      })

      // Happy Path: 未认证
      if (response.status === 401) {
        console.error('[GameService] Unauthorized: Please login first')
        return null
      }

      // Happy Path: 游戏不存在
      if (response.status === 404) {
        console.warn(`[GameService] Game not found: ${gameId}`)
        return null
      }

      // Happy Path: API 请求失败
      if (!response.ok) {
        console.error(
          `[GameService] Failed to update game: ${response.status} ${response.statusText}`
        )
        return null
      }

      const data: UpdateGameResponse = await response.json()

      // Happy Path: 响应数据无效
      if (!data || !data.data) {
        console.error('[GameService] Invalid response data')
        return null
      }

      console.log(`[GameService] Successfully updated game: ${gameId}`)
      return data.data
    } catch (error) {
      console.error('[GameService] Failed to update game:', error)
      return null
    }
  }

  /**
   * 删除游戏（需认证，Session Token 通过 Cookie 自动携带）
   * @param gameId - 游戏 ID (UUID)
   * @returns 成功返回 true，失败返回 false
   */
  async deleteGame(gameId: string): Promise<boolean> {
    // Happy Path: 游戏 ID 为空
    if (!gameId || gameId.trim() === '') {
      console.error('[GameService] Invalid game ID')
      return false
    }

    try {
      const gameUrl = getGameApiUrl(gameId)
      const response = await fetch(gameUrl, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      })

      // Happy Path: 未认证
      if (response.status === 401) {
        console.error('[GameService] Unauthorized: Please login first')
        return false
      }

      // Happy Path: 游戏不存在
      if (response.status === 404) {
        console.warn(`[GameService] Game not found: ${gameId}`)
        return false
      }

      // Happy Path: API 请求失败
      if (!response.ok) {
        console.error(
          `[GameService] Failed to delete game: ${response.status} ${response.statusText}`
        )
        return false
      }

      console.log(`[GameService] Successfully deleted game: ${gameId}`)
      return true
    } catch (error) {
      console.error('[GameService] Failed to delete game:', error)
      return false
    }
  }

  /**
   * 测试 API 连接是否正常（公开接口）
   * @returns 连接成功返回 true，失败返回 false
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(GAMES_API, { headers: this.getPublicHeaders() })

      // Happy Path: API 请求失败
      if (!response.ok) {
        console.error(
          `[GameService] Connection test failed: ${response.status} ${response.statusText}`
        )
        return false
      }

      console.log('[GameService] Connection test succeeded')
      return true
    } catch (error) {
      console.error('[GameService] Connection test failed:', error)
      return false
    }
  }
}

// ==================== Service Instance ====================

const gameService = new GameService()

// ==================== Exports ====================

export { GameService, gameService }
