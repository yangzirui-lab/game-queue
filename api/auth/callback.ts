import jwt from 'jsonwebtoken'

/**
 * Steam OpenID 回调处理
 * 验证 Steam 响应并生成 JWT token
 */
export const GET = async (req: Request) => {
  try {
    // 从 URL 中解析查询参数
    const url = new URL(req.url)
    const params: Record<string, string> = {}
    url.searchParams.forEach((value, key) => {
      params[key] = value
    })

    // 验证 OpenID 响应
    if (params['openid.mode'] !== 'id_res') {
      throw new Error('Invalid OpenID mode')
    }

    // 从 claimed_id 中提取 Steam ID
    const claimedId = params['openid.claimed_id']
    const steamIdMatch = claimedId?.match(/\/id\/(\d+)$/)

    if (!steamIdMatch) {
      throw new Error('Invalid Steam ID')
    }

    const steamId = steamIdMatch[1]

    // 验证 OpenID 响应的真实性
    const isValid = await verifySteamResponse(params)

    if (!isValid) {
      throw new Error('Steam verification failed')
    }

    // 获取 Steam 用户信息
    const steamUser = await getSteamUserInfo(steamId)

    // 生成 JWT token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    const token = jwt.sign(
      {
        steamId,
        username: steamUser.personaname,
        avatar: steamUser.avatarfull,
        profileUrl: steamUser.profileurl,
      },
      jwtSecret,
      { expiresIn: '7d' }
    )

    // 重定向回前端，携带 token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    return Response.redirect(`${frontendUrl}?steam_token=${token}`, 302)
  } catch (error) {
    console.error('Steam callback error:', error)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    return Response.redirect(`${frontendUrl}?steam_error=auth_failed`, 302)
  }
}

/**
 * 验证 Steam OpenID 响应
 */
async function verifySteamResponse(params: Record<string, string>): Promise<boolean> {
  try {
    // 构建验证请求参数
    const verifyParams = new URLSearchParams()
    verifyParams.set('openid.assoc_handle', params['openid.assoc_handle'])
    verifyParams.set('openid.signed', params['openid.signed'])
    verifyParams.set('openid.sig', params['openid.sig'])
    verifyParams.set('openid.ns', params['openid.ns'])
    verifyParams.set('openid.mode', 'check_authentication')

    // 添加所有已签名的字段
    const signed = params['openid.signed'].split(',')
    signed.forEach((item) => {
      const key = `openid.${item}`
      if (params[key]) {
        verifyParams.set(key, params[key])
      }
    })

    // 向 Steam 验证
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

    const response = await fetch('https://steamcommunity.com/openid/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (compatible; GameGallery/1.0)',
        Accept: 'text/plain',
      },
      body: verifyParams.toString(),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`Steam verification returned ${response.status}`)
      return false
    }

    const text = await response.text()
    return text.includes('is_valid:true')
  } catch (error) {
    console.error('Steam verification error:', error)
    return false
  }
}

/**
 * 获取 Steam 用户信息
 */
async function getSteamUserInfo(steamId: string) {
  const apiKey = process.env.STEAM_API_KEY

  if (!apiKey) {
    throw new Error('STEAM_API_KEY not configured')
  }

  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GameGallery/1.0)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Steam API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.response?.players?.[0]) {
      throw new Error('Steam user not found or API returned empty data')
    }

    return data.response.players[0]
  } catch (error) {
    console.error('Failed to fetch Steam user info:', error)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Steam API request timeout')
    }
    throw error
  }
}
