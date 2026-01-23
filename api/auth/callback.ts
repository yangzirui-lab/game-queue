import type { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'

/**
 * Steam OpenID 回调处理
 * 验证 Steam 响应并生成 JWT token
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const params = req.query

    // 验证 OpenID 响应
    if (params['openid.mode'] !== 'id_res') {
      throw new Error('Invalid OpenID mode')
    }

    // 从 claimed_id 中提取 Steam ID
    const claimedId = params['openid.claimed_id'] as string
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
    res.redirect(302, `${frontendUrl}?steam_token=${token}`)
  } catch (error) {
    console.error('Steam callback error:', error)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(302, `${frontendUrl}?steam_error=auth_failed`)
  }
}

/**
 * 验证 Steam OpenID 响应
 */
async function verifySteamResponse(params: any): Promise<boolean> {
  try {
    // 构建验证请求参数
    const verifyParams = new URLSearchParams()
    verifyParams.set('openid.assoc_handle', params['openid.assoc_handle'])
    verifyParams.set('openid.signed', params['openid.signed'])
    verifyParams.set('openid.sig', params['openid.sig'])
    verifyParams.set('openid.ns', params['openid.ns'])
    verifyParams.set('openid.mode', 'check_authentication')

    // 添加所有已签名的字段
    const signed = (params['openid.signed'] as string).split(',')
    signed.forEach((item) => {
      const key = `openid.${item}`
      if (params[key]) {
        verifyParams.set(key, params[key] as string)
      }
    })

    // 向 Steam 验证
    const response = await fetch('https://steamcommunity.com/openid/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: verifyParams.toString(),
    })

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

  const response = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`
  )

  const data = await response.json()

  if (!data.response?.players?.[0]) {
    throw new Error('Failed to fetch Steam user info')
  }

  return data.response.players[0]
}
