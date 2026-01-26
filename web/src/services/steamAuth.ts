/**
 * Steam 认证服务
 */

export interface SteamUser {
  steamId: string
  username: string
  avatar: string
  profileUrl: string
}

const STEAM_TOKEN_KEY = 'steam_auth_token'
// API 基础 URL - 从环境变量读取，用于支持跨域部署（GitHub Pages + Vercel）
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

interface JWTPayload {
  steamId: string
  username: string
  avatar: string
  profileUrl: string
  exp: number
  iat?: number
}

/**
 * 解码 JWT token
 */
function decodeJWT(token: string): JWTPayload | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload) as JWTPayload
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

/**
 * 检查 token 是否过期
 */
function isTokenExpired(token: string): boolean {
  const decoded = decodeJWT(token)
  if (!decoded || !decoded.exp) return true

  const currentTime = Math.floor(Date.now() / 1000)
  return decoded.exp < currentTime
}

/**
 * 保存 Steam token
 */
export function saveSteamToken(token: string): void {
  localStorage.setItem(STEAM_TOKEN_KEY, token)
}

/**
 * 获取 Steam token
 */
export function getSteamToken(): string | null {
  const token = localStorage.getItem(STEAM_TOKEN_KEY)
  if (!token) return null

  // 检查是否过期
  if (isTokenExpired(token)) {
    localStorage.removeItem(STEAM_TOKEN_KEY)
    return null
  }

  return token
}

/**
 * 获取当前登录的 Steam 用户
 */
export function getCurrentSteamUser(): SteamUser | null {
  const token = getSteamToken()
  if (!token) return null

  const decoded = decodeJWT(token)
  if (!decoded) return null

  return {
    steamId: decoded.steamId,
    username: decoded.username,
    avatar: decoded.avatar,
    profileUrl: decoded.profileUrl,
  }
}

/**
 * 退出 Steam 登录
 */
export function logoutSteam(): void {
  localStorage.removeItem(STEAM_TOKEN_KEY)
}

/**
 * 初始化 Steam 登录
 * 优先尝试在Steam客户端的内置浏览器中打开
 */
export function initiateSteamLogin(): void {
  const loginUrl = `${API_BASE_URL}/api/auth/steam`

  // 尝试在Steam客户端的内置浏览器中打开
  const steamProtocolUrl = `steam://openurl/${encodeURIComponent(loginUrl)}`

  // 检测Steam客户端是否成功打开
  let blurred = false
  const onBlur = () => {
    blurred = true
  }

  // 尝试打开Steam客户端
  window.location.href = steamProtocolUrl
  window.addEventListener('blur', onBlur)

  // 2秒后检查，如果Steam客户端未打开，则使用普通浏览器
  setTimeout(() => {
    window.removeEventListener('blur', onBlur)

    if (!blurred) {
      // Steam客户端未安装或未打开，使用普通浏览器
      console.log('Steam客户端未检测到，使用浏览器登录')
      window.location.href = loginUrl
    } else {
      console.log('已在Steam客户端中打开登录页面')
    }
  }, 2000)
}

/**
 * 处理 Steam 登录回调
 * 在页面加载时调用，检查 URL 参数中是否有 token
 */
export function handleSteamCallback(): { success: boolean; user?: SteamUser; error?: string } {
  const urlParams = new URLSearchParams(window.location.search)

  // 检查是否有错误
  const error = urlParams.get('steam_error')
  if (error) {
    // 清除 URL 参数
    window.history.replaceState({}, document.title, window.location.pathname)
    return { success: false, error }
  }

  // 检查是否有 token
  const token = urlParams.get('steam_token')
  if (token) {
    // 保存 token
    saveSteamToken(token)

    // 清除 URL 参数
    window.history.replaceState({}, document.title, window.location.pathname)

    // 获取用户信息
    const user = getCurrentSteamUser()
    if (user) {
      return { success: true, user }
    }
  }

  return { success: false }
}

/**
 * 检查是否已登录 Steam
 */
export function isSteamLoggedIn(): boolean {
  return getSteamToken() !== null
}
