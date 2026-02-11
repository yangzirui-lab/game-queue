import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import type { Game } from '../types'
import { steamService } from '../services/steam'
import { gameService } from '../services/game'
import { extractAppIdFromSteamUrl } from '../utils/gameDataMapper'

/**
 * 游戏信息定时刷新 Hook
 *
 * 功能：
 * - 延迟 2 秒后进行首次刷新（优先刷新缺少数据的游戏）
 * - 每 30 分钟自动刷新一次
 * - 从 Steam API 获取游戏的好评率、发布日期、发售状态(comingSoon)、抢先体验状态
 * - 更新后保存到后端数据库（逐个调用 gameService.updateGame）
 * - 防止 API 限流（每个游戏之间延迟 1 秒）
 */
function useGameRefresh(games: Game[], onGamesUpdate: Dispatch<SetStateAction<Game[]>>): void {
  // 使用 ref 保存最新的 games 状态，避免闭包陷阱
  const gamesRef = useRef(games)
  const refreshedGameIds = useRef(new Set<string>())

  useEffect(() => {
    gamesRef.current = games
  }, [games])

  useEffect(() => {
    /**
     * 刷新游戏信息
     * @param {boolean} prioritizeMissing - 是否优先刷新缺少数据的游戏
     */
    const refreshReviews = async (prioritizeMissing = false) => {
      const currentGames = gamesRef.current
      if (currentGames.length === 0) return

      // 按优先级排序：缺少好评率的游戏优先
      let gamesToRefresh = [...currentGames]
      if (prioritizeMissing) {
        gamesToRefresh = gamesToRefresh.sort((a, b) => {
          const aMissing = a.positivePercentage === null || a.positivePercentage === undefined
          const bMissing = b.positivePercentage === null || b.positivePercentage === undefined
          if (aMissing && !bMissing) return -1
          if (!aMissing && bMissing) return 1
          return 0
        })
      }

      const updatedGames: Game[] = []

      for (const game of gamesToRefresh) {
        if (!game.steamUrl) continue

        // 从 steamUrl 中提取 appId
        const appId = extractAppIdFromSteamUrl(game.steamUrl)
        if (!appId) continue

        try {
          // 在首次刷新时，强制刷新所有游戏的发售状态和抢先体验状态
          // 在定期刷新时，只刷新缺少数据的游戏（releaseDate/comingSoon/isEarlyAccess为null）
          // 或已标记为抢先体验的游戏（确保游戏转正时能及时更新）
          const needsReleaseInfo =
            prioritizeMissing ||
            !game.releaseDate ||
            game.comingSoon === null ||
            game.comingSoon === undefined ||
            game.isEarlyAccess === null ||
            game.isEarlyAccess === undefined ||
            game.isEarlyAccess === true

          const [reviews, releaseInfo] = await Promise.all([
            steamService.getGameReviews({ appId }),
            needsReleaseInfo
              ? steamService.getGameReleaseDate({ appId })
              : Promise.resolve({
                  releaseDate: game.releaseDate,
                  comingSoon: game.comingSoon,
                  isEarlyAccess: game.isEarlyAccess,
                  genres: null,
                }),
          ])

          // 如果任何一个请求失败，跳过此游戏
          if (!reviews || !releaseInfo) {
            console.warn(`Failed to fetch info for game ${appId}`)
            continue
          }

          // 如果获取到了数据，或者数据有变化时更新
          const needsUpdate =
            game.positivePercentage === null ||
            game.positivePercentage === undefined ||
            game.releaseDate === null ||
            game.releaseDate === undefined ||
            game.comingSoon === null ||
            game.comingSoon === undefined ||
            game.isEarlyAccess === null ||
            game.isEarlyAccess === undefined ||
            reviews.positivePercentage !== game.positivePercentage ||
            reviews.totalReviews !== game.totalReviews ||
            (needsReleaseInfo && releaseInfo.releaseDate !== game.releaseDate) ||
            (needsReleaseInfo && releaseInfo.comingSoon !== game.comingSoon) ||
            (needsReleaseInfo && releaseInfo.isEarlyAccess !== game.isEarlyAccess)

          if (
            needsUpdate &&
            (reviews.positivePercentage !== null ||
              reviews.totalReviews !== null ||
              releaseInfo.releaseDate !== null ||
              releaseInfo.isEarlyAccess !== null)
          ) {
            // 注意：后端不支持存储好评率字段（positive_percentage, total_reviews 等）
            // 这些数据仅保存在前端本地状态中
            // 只更新后端支持的字段：release_date, coming_soon, is_early_access
            if (
              releaseInfo.releaseDate !== game.releaseDate ||
              releaseInfo.comingSoon !== game.comingSoon ||
              releaseInfo.isEarlyAccess !== game.isEarlyAccess
            ) {
              const updatedBackendGame = await gameService.updateGame(game.id, {
                release_date_text: releaseInfo.releaseDate ?? game.releaseDate,
              })

              // Happy Path: 更新失败，不影响好评率数据的本地更新
              if (!updatedBackendGame) {
                console.warn(`Failed to update backend for game ${game.id}`)
              }
            }

            // 记录已更新的游戏（包括好评率数据，仅保存在本地）
            const updatedGame: Game = {
              ...game,
              positivePercentage: reviews.positivePercentage ?? game.positivePercentage,
              totalReviews: reviews.totalReviews ?? game.totalReviews,
              chinesePositivePercentage:
                reviews.chinesePositivePercentage ?? game.chinesePositivePercentage,
              chineseTotalReviews: reviews.chineseTotalReviews ?? game.chineseTotalReviews,
              releaseDate: releaseInfo.releaseDate ?? game.releaseDate,
              comingSoon: releaseInfo.comingSoon ?? game.comingSoon,
              isEarlyAccess: releaseInfo.isEarlyAccess ?? game.isEarlyAccess,
              lastUpdated: new Date().toISOString(),
            }

            updatedGames.push(updatedGame)
            refreshedGameIds.current.add(game.id)
          }
        } catch (err) {
          console.error(`刷新 ${game.name} 信息失败:`, err)
        }

        // 添加延迟避免请求过快（防止 API 限流）
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // 如果有游戏更新，更新本地状态
      if (updatedGames.length === 0) {
        return
      }

      // 创建更新映射
      const updatedGamesMap = new Map(updatedGames.map((g) => [g.id, g]))

      // 使用函数式更新，确保使用最新的 games 状态
      onGamesUpdate((prevGames: Game[]) =>
        prevGames.map((g) => {
          const updated = updatedGamesMap.get(g.id)
          return updated || g
        })
      )
    }

    // 延迟 2 秒后进行首次刷新，优先处理缺少好评率的游戏
    const initialTimer = setTimeout(() => refreshReviews(true), 2000)

    // 每 30 分钟刷新一次
    const interval = setInterval(() => refreshReviews(false), 30 * 60 * 1000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 监听新游戏加载，立即刷新未处理过的游戏
  useEffect(() => {
    const currentGames = gamesRef.current
    const newGames = currentGames.filter(
      (game) =>
        !refreshedGameIds.current.has(game.id) &&
        (game.positivePercentage === null ||
          game.positivePercentage === undefined ||
          game.totalReviews === null ||
          game.totalReviews === undefined)
    )

    if (newGames.length === 0) return

    // 先标记这些游戏为"正在处理"，防止重复刷新
    const processingIds = new Set(newGames.map((g) => g.id))
    processingIds.forEach((id) => refreshedGameIds.current.add(id))

    const refreshNewGames = async () => {
      const updatedGames: Game[] = []

      for (const game of newGames) {
        if (!game.steamUrl) continue

        const appId = extractAppIdFromSteamUrl(game.steamUrl)
        if (!appId) continue

        try {
          const [reviews, releaseInfo] = await Promise.all([
            steamService.getGameReviews({ appId }),
            steamService.getGameReleaseDate({ appId }),
          ])

          if (!reviews || !releaseInfo) {
            console.warn(`Failed to fetch info for game ${appId}`)
            continue
          }

          if (
            reviews.positivePercentage !== null ||
            reviews.totalReviews !== null ||
            releaseInfo.releaseDate !== null ||
            releaseInfo.isEarlyAccess !== null
          ) {
            // 更新后端（只更新发布日期）
            if (
              releaseInfo.releaseDate !== game.releaseDate ||
              releaseInfo.comingSoon !== game.comingSoon ||
              releaseInfo.isEarlyAccess !== game.isEarlyAccess
            ) {
              await gameService.updateGame(game.id, {
                release_date_text: releaseInfo.releaseDate ?? game.releaseDate,
              })
            }

            const updatedGame: Game = {
              ...game,
              positivePercentage: reviews.positivePercentage ?? game.positivePercentage,
              totalReviews: reviews.totalReviews ?? game.totalReviews,
              chinesePositivePercentage:
                reviews.chinesePositivePercentage ?? game.chinesePositivePercentage,
              chineseTotalReviews: reviews.chineseTotalReviews ?? game.chineseTotalReviews,
              releaseDate: releaseInfo.releaseDate ?? game.releaseDate,
              comingSoon: releaseInfo.comingSoon ?? game.comingSoon,
              isEarlyAccess: releaseInfo.isEarlyAccess ?? game.isEarlyAccess,
              lastUpdated: new Date().toISOString(),
            }

            updatedGames.push(updatedGame)
          }
        } catch (err) {
          console.error(`刷新新游戏 ${game.name} 失败:`, err)
        }

        // 防止请求过快
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      if (updatedGames.length > 0) {
        const updatedGamesMap = new Map(updatedGames.map((g) => [g.id, g]))

        // 使用函数式更新，确保使用最新的 games 状态
        onGamesUpdate((prevGames: Game[]) => prevGames.map((g) => updatedGamesMap.get(g.id) || g))
      }
    }

    // 延迟 500ms 后刷新新游戏（避免在列表快速滚动时频繁触发）
    const timer = setTimeout(refreshNewGames, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games.length]) // 仅在游戏数量变化时触发
}

// ==================== Exports ====================

export { useGameRefresh }
