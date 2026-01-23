import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Steam OpenID 登录入口
 * 重定向到 Steam 登录页面
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    // 构建 Steam OpenID 请求参数
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': `${baseUrl}/api/auth/callback`,
      'openid.realm': baseUrl,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    })

    const steamLoginUrl = `https://steamcommunity.com/openid/login?${params.toString()}`

    // 重定向到 Steam 登录页面
    res.redirect(302, steamLoginUrl)
  } catch (error) {
    console.error('Steam auth error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}
