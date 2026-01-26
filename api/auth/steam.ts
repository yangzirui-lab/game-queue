/**
 * Steam OpenID 登录入口
 * 重定向到 Steam 登录页面
 */
export const GET = async (req: Request) => {
  try {
    // 获取当前请求的域名
    const url = new URL(req.url)
    const baseUrl = `${url.protocol}//${url.host}`

    console.log('Steam login initiated, baseUrl:', baseUrl)

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

    console.log('Redirecting to Steam:', steamLoginUrl)

    // 使用 302 重定向到 Steam 登录页面
    return Response.redirect(steamLoginUrl, 302)
  } catch (error) {
    console.error('Steam auth error:', error)
    const url = new URL(req.url)
    const frontendUrl = process.env.FRONTEND_URL || `${url.protocol}//${url.host}`
    return Response.redirect(`${frontendUrl}?steam_error=auth_failed`, 302)
  }
}
