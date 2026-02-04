/**
 * 日期工具函数
 */

/**
 * 解析Steam的发布日期字符串
 * 支持的格式：
 * - "2026 年 2 月 3 日"
 * - "2025年6月19日"
 * - "2016 年 2 月 26 日"
 * - "即将宣布"
 * - "2026 年第二季度"
 * - "Coming Soon"
 * @param dateString - Steam返回的日期字符串
 * @returns Date对象，如果无法解析则返回null
 */
function parseSteamReleaseDate(dateString: string | null): Date | null {
  if (!dateString) {
    return null
  }

  // 处理特殊情况
  const lowerDate = dateString.toLowerCase()
  if (
    lowerDate.includes('即将') ||
    lowerDate.includes('coming soon') ||
    lowerDate.includes('tba') ||
    lowerDate.includes('季度') ||
    lowerDate.includes('quarter')
  ) {
    return null
  }

  // 匹配 "YYYY 年 M 月 D 日" 或 "YYYY年M月D日" 格式
  const chineseMatch = dateString.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (chineseMatch) {
    const year = parseInt(chineseMatch[1])
    const month = parseInt(chineseMatch[2])
    const day = parseInt(chineseMatch[3])
    return new Date(year, month - 1, day)
  }

  // 匹配英文日期格式 "MMM DD, YYYY" (如 "Feb 26, 2016")
  const englishMatch = dateString.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/)
  if (englishMatch) {
    return new Date(dateString)
  }

  // 尝试直接解析
  const parsed = new Date(dateString)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }

  return null
}

/**
 * 判断游戏是否已发售
 * 逻辑：
 * 1. 如果comingSoon明确为false，返回true（已发售）
 * 2. 如果comingSoon为true，但发布日期已过，返回true（已发售，Steam数据未更新）
 * 3. 如果comingSoon为true，且发布日期未到或无法解析，返回false（未发售）
 * 4. 如果comingSoon为null，尝试解析发布日期判断
 *
 * @param comingSoon - Steam API返回的coming_soon字段
 * @param releaseDate - Steam API返回的发布日期字符串
 * @returns true表示已发售，false表示未发售
 */
function isGameReleased(comingSoon: boolean | null, releaseDate: string | null): boolean {
  // 如果明确标记为即将发售
  if (comingSoon === true) {
    // 尝试解析发布日期
    const parsedDate = parseSteamReleaseDate(releaseDate)
    if (parsedDate) {
      // 如果发布日期已经过去，说明Steam数据未及时更新，游戏实际已发售
      const now = new Date()
      now.setHours(0, 0, 0, 0) // 只比较日期，忽略时间
      return parsedDate <= now
    }
    // 无法解析日期，相信Steam的标记
    return false
  }

  // 如果明确标记为非即将发售
  if (comingSoon === false) {
    return true
  }

  // comingSoon为null，尝试通过发布日期判断
  const parsedDate = parseSteamReleaseDate(releaseDate)
  if (parsedDate) {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return parsedDate <= now
  }

  // 无法判断，默认为已发售（避免误显示"未发售"）
  return true
}

// ==================== Exports ====================
export { parseSteamReleaseDate, isGameReleased }
