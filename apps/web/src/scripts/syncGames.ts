#!/usr/bin/env tsx

import * as fs from 'fs'
import * as path from 'path'

// ==================== Types ====================

interface GameJson {
  id: string
  name: string
  status: 'playing' | 'queueing' | 'completion'
  addedAt: string
  lastUpdated: string
  steamUrl?: string
  coverImage?: string
  positivePercentage?: number
  totalReviews?: number
  releaseDate?: string
  comingSoon?: boolean
  isEarlyAccess?: boolean
  isPinned?: boolean
  chinesePositivePercentage?: number
  chineseTotalReviews?: number
  genres?: Array<{
    id: string
    description: string
  }>
}

interface GamesData {
  games: GameJson[]
}

interface BackendGame {
  id: string
  app_id?: number
  name: string
  steam_url?: string
  capsule_image?: string
  status?: string
  is_pinned?: boolean
  created_at: string
  updated_at: string
}

interface SyncResult {
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ game: string; error: string }>
}

// ==================== Helper Functions ====================

/**
 * 从 Steam URL 提取 App ID
 */
function extractAppIdFromSteamUrl(steamUrl: string): number | null {
  const match = steamUrl.match(/\/app\/(\d+)/)
  if (!match) {
    return null
  }
  return parseInt(match[1])
}

/**
 * 获取后端所有游戏（支持分页）
 */
async function fetchBackendGames(token: string): Promise<BackendGame[]> {
  const allGames: BackendGame[] = []
  let page = 1
  let hasNext = true

  while (hasNext) {
    const response = await fetch(`https://degenerates.site/api/games?page=${page}&page_size=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch backend games: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const games = data.data || []
    allGames.push(...games)

    // 检查是否还有下一页
    hasNext = data.pagination?.has_next || false
    page++
  }

  return allGames
}

/**
 * 创建游戏
 */
async function createGame(token: string, gameData: GameJson): Promise<boolean> {
  if (!gameData.steamUrl) {
    console.log(`  ⚠️  跳过 "${gameData.name}": 缺少 Steam URL`)
    return false
  }

  const appId = extractAppIdFromSteamUrl(gameData.steamUrl)
  if (!appId) {
    console.log(`  ⚠️  跳过 "${gameData.name}": 无效的 Steam URL`)
    return false
  }

  // 注意：后端不支持存储好评率字段（positive_percentage, total_reviews 等）
  // 只发送后端支持的字段
  const payload = {
    app_id: appId,
    name: gameData.name,
    type: 'game',
    steam_url: gameData.steamUrl,
    capsule_image: gameData.coverImage,
    status: gameData.status,
    is_pinned: gameData.isPinned || false,
    release_date: gameData.releaseDate,
    coming_soon: gameData.comingSoon,
    is_early_access: gameData.isEarlyAccess,
  }

  const response = await fetch('https://degenerates.site/api/games', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create game: ${response.status} ${errorText}`)
  }

  return true
}

/**
 * 更新游戏
 */
async function updateGame(token: string, gameId: string, gameData: GameJson): Promise<boolean> {
  // 注意：后端不支持存储好评率字段（positive_percentage, total_reviews 等）
  // 只更新后端支持的字段
  const payload = {
    name: gameData.name,
    capsule_image: gameData.coverImage,
    release_date: gameData.releaseDate,
    coming_soon: gameData.comingSoon,
    is_early_access: gameData.isEarlyAccess,
  }

  const response = await fetch(`https://degenerates.site/api/games/${gameId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to update game: ${response.status} ${errorText}`)
  }

  return true
}

/**
 * 更新游戏状态
 */
async function updateGameStatus(token: string, gameId: string, status: string): Promise<boolean> {
  const response = await fetch(`https://degenerates.site/api/games/${gameId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to update game status: ${response.status} ${errorText}`)
  }

  return true
}

// ==================== Main Sync Function ====================

async function syncGames(token: string, gamesJsonPath: string): Promise<SyncResult> {
  const result: SyncResult = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  // 1. 读取 games.json
  console.log('📖 读取 games.json...')
  const gamesData: GamesData = JSON.parse(fs.readFileSync(gamesJsonPath, 'utf-8'))
  result.total = gamesData.games.length
  console.log(`   找到 ${result.total} 个游戏\n`)

  // 2. 获取后端现有游戏
  console.log('🔍 获取后端现有游戏...')
  const backendGames = await fetchBackendGames(token)
  console.log(`   后端已有 ${backendGames.length} 个游戏\n`)

  // 创建映射表（按 app_id 和名称）
  const backendGamesByAppId = new Map<number, BackendGame>()
  const backendGamesByName = new Map<string, BackendGame>()

  for (const game of backendGames) {
    if (game.app_id) {
      backendGamesByAppId.set(game.app_id, game)
    }
    backendGamesByName.set(game.name.toLowerCase(), game)
  }

  // 3. 同步每个游戏
  console.log('🔄 开始同步游戏...\n')

  for (let i = 0; i < gamesData.games.length; i++) {
    const game = gamesData.games[i]
    const progress = `[${i + 1}/${result.total}]`

    try {
      // 提取 app_id
      const appId = game.steamUrl ? extractAppIdFromSteamUrl(game.steamUrl) : null

      // 查找后端是否已存在
      let existingGame: BackendGame | undefined

      if (appId) {
        existingGame = backendGamesByAppId.get(appId)
      }

      if (!existingGame) {
        existingGame = backendGamesByName.get(game.name.toLowerCase())
      }

      if (existingGame) {
        // 游戏已存在，更新
        console.log(`${progress} 🔄 更新游戏: ${game.name}`)

        await updateGame(token, existingGame.id, game)

        // 如果状态不同，也更新状态
        if (existingGame.status !== game.status) {
          await updateGameStatus(token, existingGame.id, game.status)
          console.log(`          └─ 状态: ${existingGame.status} → ${game.status}`)
        }

        result.updated++
      } else {
        // 游戏不存在，尝试创建
        console.log(`${progress} ➕ 创建游戏: ${game.name}`)

        try {
          const created = await createGame(token, game)

          if (created) {
            result.created++
          } else {
            result.skipped++
          }
        } catch (error) {
          // 如果是 409 冲突，说明游戏已存在但名称不匹配，尝试通过 app_id 查找并更新
          if (error instanceof Error && error.message.includes('409')) {
            console.log(`          └─ 游戏已存在（app_id 冲突），尝试查找并更新...`)

            // 重新获取后端游戏列表（因为刚才可能没匹配上）
            const freshBackendGames = await fetchBackendGames(token)
            const matchedGame = appId
              ? freshBackendGames.find((g) => g.app_id === appId)
              : undefined

            if (matchedGame) {
              console.log(`          └─ 找到匹配游戏: "${matchedGame.name}"`)
              await updateGame(token, matchedGame.id, game)

              // 如果状态不同，也更新状态
              if (matchedGame.status !== game.status) {
                await updateGameStatus(token, matchedGame.id, game.status)
                console.log(`          └─ 状态: ${matchedGame.status} → ${game.status}`)
              }

              result.updated++
            } else {
              throw error // 找不到匹配游戏，抛出原错误
            }
          } else {
            throw error // 其他错误直接抛出
          }
        }
      }
    } catch (error) {
      console.log(`${progress} ❌ 失败: ${game.name}`)
      console.log(`          └─ 错误: ${error instanceof Error ? error.message : String(error)}`)

      result.failed++
      result.errors.push({
        game: game.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // 添加延迟避免请求过快
    if (i < gamesData.games.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  return result
}

// ==================== CLI Entry Point ====================

async function main() {
  console.log('🎮 游戏数据同步工具\n')
  console.log('='.repeat(60) + '\n')

  // 获取参数
  const token = process.env.GAME_GALLERY_TOKEN
  const gamesJsonPath = process.argv[2] || path.join(process.cwd(), 'games.json')

  // 验证参数
  if (!token) {
    console.error('❌ 错误: 请设置环境变量 GAME_GALLERY_TOKEN')
    console.error('\n使用方法:')
    console.error('  export GAME_GALLERY_TOKEN="your_token_here"')
    console.error('  npm run sync-games [games.json路径]')
    process.exit(1)
  }

  if (!fs.existsSync(gamesJsonPath)) {
    console.error(`❌ 错误: 找不到文件 ${gamesJsonPath}`)
    process.exit(1)
  }

  try {
    // 执行同步
    const result = await syncGames(token, gamesJsonPath)

    // 打印结果
    console.log('\n' + '='.repeat(60))
    console.log('✅ 同步完成！\n')
    console.log(`📊 统计信息:`)
    console.log(`   总计:   ${result.total} 个游戏`)
    console.log(`   新增:   ${result.created} 个`)
    console.log(`   更新:   ${result.updated} 个`)
    console.log(`   跳过:   ${result.skipped} 个`)
    console.log(`   失败:   ${result.failed} 个`)

    if (result.errors.length > 0) {
      console.log('\n❌ 错误详情:')
      for (const error of result.errors) {
        console.log(`   - ${error.game}: ${error.error}`)
      }
    }

    console.log('\n' + '='.repeat(60))

    // 如果有失败，退出码为 1
    if (result.failed > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ 同步失败:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// 执行主函数
main()
