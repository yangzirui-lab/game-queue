// ==================== Steam API ====================

/**
 * Steam Store 搜索 API
 * 用于搜索 Steam 商店中的游戏
 * @param term - 搜索关键词（需要 URL 编码）
 * @param l - 语言代码（如 schinese 表示简体中文）
 * @param cc - 国家/地区代码（如 CN 表示中国）
 * @returns 返回游戏搜索结果列表，包含游戏基本信息
 */
export const STEAM_SEARCH_API = 'https://store.steampowered.com/api/storesearch/'

/**
 * Steam App 详情 API
 * 用于获取指定游戏的详细信息
 * @param appids - 游戏 ID（逗号分隔可查询多个）
 * @param l - 语言代码（如 schinese）
 * @param cc - 国家/地区代码（如 CN）
 * @returns 返回游戏详细信息，包括名称、描述、分类、发布日期等
 */
export const STEAM_APP_DETAILS_API = 'https://store.steampowered.com/api/appdetails'

/**
 * Steam 评论统计 API
 * 用于获取游戏的评论统计数据（好评率、总评论数等）
 * @param appId - 游戏 ID（需要拼接到 URL 路径中，如 /appreviews/{appId}）
 * @param json - 返回格式（固定为 1 表示 JSON）
 * @param language - 评论语言筛选（all 表示所有语言）
 * @param purchase_type - 购买类型筛选（all 表示所有类型）
 * @param num_per_page - 每页数量（设为 0 仅获取统计信息，不返回评论内容）
 * @note 该 API 无需认证，但有速率限制，建议请求间隔至少 1 秒
 * @returns 返回评论统计信息（好评数、差评数、总评论数）
 */
export const STEAM_REVIEWS_API_BASE = 'https://store.steampowered.com/appreviews'

// ==================== CORS 代理 ====================

/**
 * CORS 代理列表
 * 用于解决浏览器跨域请求 Steam API 的问题
 * @note 按优先级排序，请求失败时自动切换到下一个代理
 * @note 代理服务可能不稳定，建议定期检查可用性
 */
export const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
]

// ==================== GitHub API (仅用于数据迁移) ====================

export const GITHUB_API_BASE = 'https://api.github.com'
export const GITHUB_USER_API = `${GITHUB_API_BASE}/user`
export const getGitHubRepoApiUrl = (owner: string, repo: string) =>
  `${GITHUB_API_BASE}/repos/${owner}/${repo}`
export const getGitHubFileApiUrl = (owner: string, repo: string, path: string) =>
  `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`

// ==================== Backend API ====================

/**
 * 后端 API 基础地址
 * 使用 Bearer Token 认证，无需代理，直接访问后端
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://degenerates.site'

// ==================== Auth API ====================

/**
 * 密码登录接口
 * 使用用户名和密码进行登录认证
 * @method POST
 * @param username - 用户名
 * @param password - 密码
 * @returns 返回用户信息和 session token
 * @note Session token 有效期 60 天，存储在本地
 * @example
 * POST /api/auth/login/password
 * Body: { "username": "admin", "password": "password" }
 * Response: { "data": { "token": "...", "user": { "id": "...", "username": "..." } } }
 */
export const AUTH_LOGIN_API = `${API_BASE_URL}/api/auth/login/password`

/**
 * 用户登出接口
 * 退出登录并删除服务端的 session token
 * @method POST
 * @requires Authorization header with Bearer token
 * @returns 返回成功消息
 * @note 调用后客户端应删除本地存储的 token
 */
export const AUTH_LOGOUT_API = `${API_BASE_URL}/api/auth/logout`

// ==================== Game API ====================

/**
 * 获取所有游戏列表（公开接口，无需认证）
 * 用于获取系统中所有游戏的基本信息
 * @param page - 页码，默认 1
 * @param page_size - 每页数量，默认 20，最大 100
 * @param sort_by - 排序字段：name, release_date, created_at
 * @param order - 排序方向：asc, desc，默认 desc
 * @param genres - 类型筛选，逗号分隔
 * @param categories - 分类筛选，逗号分隔
 * @param is_free - 是否免费
 * @returns 返回游戏列表和分页信息
 */
export const GAMES_API = `${API_BASE_URL}/api/games`

/**
 * 获取单个游戏详情 API 地址（公开接口，无需认证）
 * @param gameId - 游戏 ID (UUID)
 * @returns 完整的 API 地址
 */
export const getGameApiUrl = (gameId: string) => `${API_BASE_URL}/api/games/${gameId}`

/**
 * 搜索游戏（公开接口，无需认证）
 * 用于按关键词搜索游戏，支持中文搜索
 * @param q - 搜索关键词（必填，需要 URL 编码）
 * @param page - 页码，默认 1
 * @param page_size - 每页数量，默认 20
 * @returns 返回匹配的游戏列表和分页信息
 */
export const GAMES_SEARCH_API = `${API_BASE_URL}/api/games/search`

// ==================== User Game API ====================

/**
 * 获取当前用户的游戏库（需认证，使用 Cookie）
 * 用于获取用户的所有游戏及其状态（playing/queueing/completion）和置顶信息
 * @requires Session Token (自动通过 Cookie 携带)
 * @returns 返回用户游戏列表,包含游戏状态和置顶标记
 */
export const USER_GAMES_API = `${API_BASE_URL}/api/users/me/games`

/**
 * 获取/删除用户单个游戏关系 API 地址（需认证）
 * @param gameId - 游戏 ID (UUID)
 * @returns 完整的 API 地址
 * @note DELETE - 从用户库中移除游戏
 */
export const getUserGameApiUrl = (gameId: string) => `${API_BASE_URL}/api/users/me/games/${gameId}`

/**
 * 更新用户游戏状态 API 地址（需认证）
 * @param gameId - 游戏 ID (UUID)
 * @returns 完整的 API 地址
 * @note PATCH - 更新游戏状态
 */
export const getUserGameStatusApiUrl = (gameId: string) =>
  `${API_BASE_URL}/api/users/me/games/${gameId}/status`
