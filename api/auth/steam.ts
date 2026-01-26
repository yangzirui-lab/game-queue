/**
 * Steam OpenID 登录入口
 * 使用自动提交表单的方式重定向到 Steam 登录页面
 */
export const GET = async (req: Request) => {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    // 构建 Steam OpenID 请求参数
    const params = {
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': `${baseUrl}/api/auth/callback`,
      'openid.realm': baseUrl,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    }

    // 返回一个自动提交的HTML表单
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>正在跳转到 Steam 登录...</title>
  <style>
    body {
      background: #1b2838;
      color: #c7d5e0;
      font-family: Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .loading {
      text-align: center;
    }
    .spinner {
      border: 3px solid rgba(255,255,255,0.1);
      border-top: 3px solid #66c0f4;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <p>正在跳转到 Steam 登录页面...</p>
  </div>
  <form id="steamForm" method="POST" action="https://steamcommunity.com/openid/login">
    ${Object.entries(params)
      .map(
        ([key, value]) =>
          `<input type="hidden" name="${key}" value="${value}">`
      )
      .join('\n    ')}
  </form>
  <script>
    document.getElementById('steamForm').submit();
  </script>
</body>
</html>
    `

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Steam auth error:', error)
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
