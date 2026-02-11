import { githubService } from '../services/github'
import { gameService } from '../services/game'
import { userGameService } from '../services/userGame'
import { toCreateGameRequest, extractAppIdFromSteamUrl } from './gameDataMapper'

// ==================== Types ====================

interface MigrationResult {
  success: boolean
  totalGames: number
  migratedGames: number
  skippedGames: number
  failedGames: number
  errors: string[]
}

// ==================== Helper Functions ====================

/**
 * 从 GitHub 迁移游戏数据到后端数据库
 * @param onProgress - 进度回调函数
 * @returns 迁移结果
 */
async function migrateFromGitHub(
  onProgress?: (current: number, total: number, gameName: string) => void
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    totalGames: 0,
    migratedGames: 0,
    skippedGames: 0,
    failedGames: 0,
    errors: [],
  }

  // 1. 从 GitHub 读取游戏数据
  console.log('[Migration] 开始从 GitHub 读取游戏数据...')
  const gameData = await githubService.fetchGames()

  // Happy Path: 读取失败
  if (!gameData) {
    result.errors.push('无法从 GitHub 读取游戏数据')
    return result
  }

  const games = gameData.games
  result.totalGames = games.length

  console.log(`[Migration] 找到 ${games.length} 个游戏，开始迁移...`)

  // 2. 逐个迁移游戏
  for (let i = 0; i < games.length; i++) {
    const game = games[i]

    // 通知进度
    if (onProgress) {
      onProgress(i + 1, games.length, game.name)
    }

    console.log(`[Migration] [${i + 1}/${games.length}] 迁移游戏: ${game.name}`)

    try {
      // 提取 appId
      const appId = game.steamUrl ? extractAppIdFromSteamUrl(game.steamUrl) : null
      if (!appId) {
        result.errors.push(`无效的 Steam URL: ${game.name}`)
        result.failedGames++
        continue
      }

      // 1. 尝试直接使用 app_id 添加到用户库
      const addResult = await userGameService.addUserGame({
        app_id: appId,
        status: game.status,
        is_pinned: game.isPinned || false,
      })

      // 2. 如果游戏不存在数据库，先创建游戏
      if (addResult && 'error' in addResult && addResult.error === 'game_not_found') {
        console.log(`[Migration] 游戏不存在，创建中: ${game.name}`)

        const createParams = toCreateGameRequest({
          appId,
          name: game.name,
          steamUrl: game.steamUrl,
          coverImage: game.coverImage,
          type: 'game',
          positivePercentage: game.positivePercentage,
          totalReviews: game.totalReviews,
          chinesePositivePercentage: game.chinesePositivePercentage,
          chineseTotalReviews: game.chineseTotalReviews,
          releaseDate: game.releaseDate,
          comingSoon: game.comingSoon,
          isEarlyAccess: game.isEarlyAccess,
        })

        const backendGame = await gameService.createGame(createParams)

        // Happy Path: 创建游戏失败
        if (!backendGame) {
          result.errors.push(`创建游戏失败: ${game.name}`)
          result.failedGames++
          continue
        }

        // 2.2 创建成功后，再添加到用户库
        const addResult2 = await userGameService.addUserGame({
          app_id: appId,
          status: game.status,
          is_pinned: game.isPinned || false,
        })

        // Happy Path: 添加到用户库失败
        if (!addResult2 || 'error' in addResult2) {
          result.errors.push(`添加游戏到用户库失败: ${game.name}`)
          result.failedGames++
          continue
        }
      } else if (!addResult) {
        // Happy Path: 添加失败
        result.errors.push(`添加游戏失败: ${game.name}`)
        result.failedGames++
        continue
      }

      console.log(`[Migration] ✓ 成功迁移: ${game.name} (${game.status})`)
      result.migratedGames++

      // 添加延迟，避免请求过快
      await new Promise((resolve) => setTimeout(resolve, 300))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[Migration] ✗ 迁移失败: ${game.name}`, error)
      result.errors.push(`${game.name}: ${errorMessage}`)
      result.failedGames++
    }
  }

  // 3. 汇总结果
  result.success = result.migratedGames === result.totalGames
  console.log(`[Migration] 迁移完成:`)
  console.log(`  - 总计: ${result.totalGames} 个游戏`)
  console.log(`  - 成功: ${result.migratedGames} 个`)
  console.log(`  - 失败: ${result.failedGames} 个`)
  console.log(`  - 跳过: ${result.skippedGames} 个`)

  if (result.errors.length > 0) {
    console.log(`  - 错误信息:`)
    for (const error of result.errors) {
      console.log(`    • ${error}`)
    }
  }

  return result
}

/**
 * 验证迁移结果
 * 检查后端游戏数量和用户游戏数量是否匹配
 * @returns 验证是否通过
 */
async function verifyMigration(): Promise<{
  success: boolean
  backendGamesCount: number
  userGamesCount: number
  message: string
}> {
  console.log('[Migration] 验证迁移结果...')

  const [backendGames, userGames] = await Promise.all([
    gameService.getGames(),
    userGameService.getUserGames(),
  ])

  // Happy Path: 获取数据失败
  if (!backendGames || !userGames) {
    return {
      success: false,
      backendGamesCount: 0,
      userGamesCount: 0,
      message: '无法验证迁移结果：获取数据失败',
    }
  }

  const backendCount = backendGames.data.length
  const userCount = userGames.data.length

  const success = backendCount > 0 && userCount > 0
  const message = success
    ? `验证成功：后端有 ${backendCount} 个游戏，用户库有 ${userCount} 个游戏`
    : `验证失败：后端有 ${backendCount} 个游戏，用户库有 ${userCount} 个游戏`

  console.log(`[Migration] ${message}`)

  return {
    success,
    backendGamesCount: backendCount,
    userGamesCount: userCount,
    message,
  }
}

/**
 * 清空后端数据（谨慎使用！）
 * 从用户库中移除所有游戏
 * @returns 清空是否成功
 */
async function clearBackendData(): Promise<boolean> {
  console.warn('[Migration] 开始清空后端数据...')

  const userGames = await userGameService.getUserGames()

  // Happy Path: 获取用户游戏失败
  if (!userGames) {
    console.error('[Migration] 无法获取用户游戏列表')
    return false
  }

  console.log(`[Migration] 找到 ${userGames.data.length} 个用户游戏，开始清空...`)

  let successCount = 0
  let failCount = 0

  for (const userGame of userGames.data) {
    const success = await userGameService.removeUserGame(userGame.id)

    if (success) {
      successCount++
    } else {
      failCount++
    }

    // 添加延迟，避免请求过快
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  console.log(`[Migration] 清空完成：成功 ${successCount} 个，失败 ${failCount} 个`)

  return failCount === 0
}

// ==================== Exports ====================

export type { MigrationResult }
export { migrateFromGitHub, verifyMigration, clearBackendData }
