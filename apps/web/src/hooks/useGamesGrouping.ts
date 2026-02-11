import { useMemo } from 'react'
import type { Game, GameStatus } from '../types'

/**
 * 游戏分组和排序 Hook
 *
 * 功能：
 * - 按状态分组（playing, queueing, completion）
 * - 每组内按置顶状态和添加时间排序
 *   - 置顶的游戏排在前面
 *   - 相同置顶状态的游戏按添加时间倒序排列（新添加的在前）
 */
function useGamesGrouping(games: Game[]): {
  playing: Game[]
  queueing: Game[]
  completion: Game[]
} {
  return useMemo(() => {
    const sortByPinnedAndDate = (a: Game, b: Game) => {
      // 置顶的游戏排在前面
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1

      // 相同置顶状态，按添加时间倒序（新添加的在前）
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    }

    const filterAndSort = (status: GameStatus) =>
      games.filter((g) => g.status === status).sort(sortByPinnedAndDate)

    return {
      playing: filterAndSort('playing'),
      queueing: filterAndSort('queueing'),
      completion: filterAndSort('completion'),
    }
  }, [games])
}

// ==================== Exports ====================

export { useGamesGrouping }
