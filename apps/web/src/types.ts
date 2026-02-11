// ==================== Types ====================

// Auth Types
interface User {
  id: string
  username: string
}

interface LoginRequest {
  username: string
  password: string
}

interface LoginResponse {
  token: string
  user: User
}

interface AuthResponse {
  data: LoginResponse
}

interface LogoutResponse {
  message: string
}

// Game Types
type GameStatus = 'playing' | 'queueing' | 'completion'

interface Genre {
  id: string
  description: string
}

interface Game {
  id: string
  name: string
  status: GameStatus
  addedAt: string
  lastUpdated: string
  steamUrl?: string
  coverImage?: string
  positivePercentage?: number // 全球好评率
  totalReviews?: number // 全球评论数
  chinesePositivePercentage?: number // 中文区好评率
  chineseTotalReviews?: number // 中文区评论数
  releaseDate?: string
  comingSoon?: boolean
  isEarlyAccess?: boolean
  genres?: Genre[]
  isPinned?: boolean
}

interface GameQueueData {
  games: Game[]
}

// Backend API Types
interface BackendGame {
  id: string
  app_id: number
  name: string
  description?: string
  short_description?: string
  header_image?: string
  capsule_image?: string
  steam_url?: string
  type: string
  is_free: boolean
  price_info?: {
    currency: string
    initial: number
    final: number
    discount_percent: number
  }
  platforms?: {
    windows: boolean
    mac: boolean
    linux: boolean
  }
  categories?: string[]
  genres?: string[]
  release_date?: string
  release_date_text?: string
  developers?: string[]
  publishers?: string[]
  metacritic_score?: number
  created_at: string
  updated_at: string
}

// Pagination Types
interface Pagination {
  page: number
  page_size: number
  total_count: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

// 用户游戏基础关系（POST/PATCH/DELETE 返回）
interface UserGame {
  id: string
  user_id: string
  game_id: string
  status: GameStatus
  is_pinned: boolean
  added_at: string
  updated_at: string
}

// 用户游戏列表项（GET /api/users/me/games 返回，包含完整游戏信息）
interface UserGameWithDetails extends BackendGame {
  status: GameStatus
  is_pinned: boolean
  sort_order: number
}

// Game API Request/Response Types
interface CreateGameRequest {
  app_id: number
  name: string
  type: string
  description?: string
  short_description?: string
  header_image?: string
  capsule_image?: string
  steam_url?: string
  is_free?: boolean
  categories?: string[]
  genres?: string[]
  developers?: string[]
  publishers?: string[]
  release_date_text?: string
}

interface CreateGameResponse {
  data: {
    id: string
    app_id: number
    name: string
    created_at: string
  }
}

interface UpdateGameRequest {
  name?: string
  description?: string
  short_description?: string
  header_image?: string
  capsule_image?: string
  categories?: string[]
  genres?: string[]
  is_free?: boolean
  release_date?: string
  release_date_text?: string
  coming_soon?: boolean
  is_early_access?: boolean
}

interface UpdateGameResponse {
  data: {
    message: string
    id: string
  }
}

interface GetGamesResponse {
  data: BackendGame[]
  pagination: Pagination
}

interface GetGameResponse {
  data: BackendGame
}

interface DeleteGameResponse {
  data: {
    message: string
    id: string
  }
}

// User Game API Request/Response Types
interface AddUserGameRequest {
  game_id?: string
  app_id?: number
  status?: GameStatus
  is_pinned?: boolean
  sort_order?: number
}

interface AddUserGameResponse {
  data: UserGame
}

interface AddUserGameErrorResponse {
  error: 'game_not_found'
  app_id?: number
}

interface UpdateUserGameRequest {
  status?: GameStatus
  is_pinned?: boolean
}

interface UpdateUserGameResponse {
  data: UserGame
}

interface GetUserGamesResponse {
  data: UserGameWithDetails[]
  pagination: Pagination
}

// ==================== Exports ====================

export type {
  User,
  LoginRequest,
  LoginResponse,
  AuthResponse,
  LogoutResponse,
  GameStatus,
  Genre,
  Game,
  GameQueueData,
  BackendGame,
  Pagination,
  UserGame,
  UserGameWithDetails,
  CreateGameRequest,
  CreateGameResponse,
  UpdateGameRequest,
  UpdateGameResponse,
  DeleteGameResponse,
  GetGamesResponse,
  GetGameResponse,
  AddUserGameRequest,
  AddUserGameResponse,
  AddUserGameErrorResponse,
  UpdateUserGameRequest,
  UpdateUserGameResponse,
  GetUserGamesResponse,
}
