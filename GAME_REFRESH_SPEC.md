# 游戏数据自动更新规范

## 概述

本文档描述游戏数据的自动更新逻辑，供后端定时任务参考实现。

**目标**：每天自动更新所有游戏的评论数据、发布日期、抢先体验状态等信息。

---

## 更新字段

### 从 Steam API 获取并更新的字段

| 字段       | 数据库字段名                  | 类型     | 说明                       | 数据源            |
| ---------- | ----------------------------- | -------- | -------------------------- | ----------------- |
| 好评率     | `positive_percentage`         | integer  | Steam 全球好评率 (0-100)   | Steam Reviews API |
| 总评价数   | `total_reviews`               | integer  | Steam 全球总评价数         | Steam Reviews API |
| 中文好评率 | `chinese_positive_percentage` | integer  | Steam 中文区好评率 (0-100) | Steam Reviews API |
| 中文评价数 | `chinese_total_reviews`       | integer  | Steam 中文区总评价数       | Steam Reviews API |
| 发布日期   | `release_date_text`           | string   | 游戏发布日期文本           | Steam Store API   |
| 即将推出   | `coming_soon`                 | boolean  | 是否即将推出               | Steam Store API   |
| 抢先体验   | `is_early_access`             | boolean  | 是否抢先体验               | Steam Store API   |
| 类型       | `genres`                      | string[] | 游戏类型列表               | Steam Store API   |

---

## 更新优先级

### 1. 高优先级（必须更新）

缺少以下任一数据的游戏应优先更新：

- `positive_percentage` 为 NULL 或 0
- `total_reviews` 为 NULL 或 0
- `release_date_text` 为 NULL 或空字符串
- `is_early_access` 为 NULL

**原因**：这些游戏缺少基本数据，影响前端展示。

### 2. 中优先级（建议更新）

- 标记为抢先体验（`is_early_access = true`）的游戏
  - **原因**：抢先体验游戏可能转正，需要及时更新状态

### 3. 低优先级（定期更新）

- 所有其他游戏
  - **原因**：评论数据会随时间变化，建议定期更新

---

## 更新流程

### 步骤 1：获取待更新游戏列表

```sql
-- 获取所有游戏，按优先级排序
SELECT
    id,
    app_id,
    name,
    positive_percentage,
    total_reviews,
    release_date_text,
    is_early_access,
    updated_at
FROM games
ORDER BY
    -- 优先级 1：缺少数据的游戏
    CASE
        WHEN positive_percentage IS NULL
             OR total_reviews IS NULL
             OR release_date_text IS NULL
             OR is_early_access IS NULL
        THEN 0
        ELSE 1
    END,
    -- 优先级 2：抢先体验游戏
    CASE
        WHEN is_early_access = true THEN 0
        ELSE 1
    END,
    -- 优先级 3：按更新时间排序（最久未更新的优先）
    updated_at ASC
```

### 步骤 2：获取 Steam 数据

对每个游戏执行以下请求：

#### 2.1 获取评论数据

**API 端点**：`GET /api/steam/proxy/reviews`

**请求参数**：

```json
{
  "appId": 730 // Steam App ID
}
```

**响应示例**：

```json
{
  "positivePercentage": 86,
  "totalReviews": 9373155,
  "chinesePositivePercentage": 89,
  "chineseTotalReviews": 1361791
}
```

#### 2.2 获取发布日期和状态

**API 端点**：`GET /api/steam/proxy/release-date`

**请求参数**：

```json
{
  "appId": 730
}
```

**响应示例**：

```json
{
  "releaseDate": "2023 年 9 月 27 日",
  "comingSoon": false,
  "isEarlyAccess": false,
  "genres": ["Action", "FPS"]
}
```

### 步骤 3：更新数据库

**API 端点**：`PUT /api/games/{game_id}`

**请求体**：

```json
{
  "positive_percentage": 86,
  "total_reviews": 9373155,
  "chinese_positive_percentage": 89,
  "chinese_total_reviews": 1361791,
  "release_date_text": "2023 年 9 月 27 日",
  "coming_soon": false,
  "is_early_access": false,
  "genres": ["Action", "FPS"]
}
```

**注意事项**：

- 只更新获取到的字段（部分更新）
- 如果 Steam API 返回 NULL，保持原值不变

### 步骤 4：错误处理

| 错误类型             | 处理方式                       |
| -------------------- | ------------------------------ |
| Steam API 限流 (429) | 延迟 60 秒后重试，或跳过该游戏 |
| Steam API 超时       | 跳过该游戏，记录日志           |
| 游戏不存在 (404)     | 标记游戏为"已下架"，记录日志   |
| 其他错误             | 跳过该游戏，记录日志           |

---

## 速率限制

### Steam API 限流策略

为避免被 Steam API 限流，建议：

1. **每个请求间隔**：1-2 秒

   ```
   游戏 A → 等待 1 秒 → 游戏 B → 等待 1 秒 → 游戏 C
   ```

2. **批量处理**：
   - 每批处理 50 个游戏
   - 每批之间休息 5 分钟

3. **总时间估算**：
   - 32 个游戏 × 2 秒/游戏 × 2 次请求 = 约 2 分钟

### 后端代理接口限流

如果使用后端代理接口（`/api/steam/proxy/*`），建议：

- 设置代理接口的缓存时间：1 小时
- 相同 `appId` 在 1 小时内返回缓存结果

---

## 定时任务配置

### 推荐方案：Cron Job

```bash
# 每天凌晨 3:00 执行
0 3 * * * /path/to/refresh_games.sh

# 或者：每 6 小时执行一次
0 */6 * * * /path/to/refresh_games.sh
```

### 任务优先级建议

| 时间段     | 任务类型     | 说明                 |
| ---------- | ------------ | -------------------- |
| 每天 03:00 | 全量更新     | 更新所有游戏数据     |
| 每小时 :00 | 高优先级更新 | 只更新缺少数据的游戏 |
| 每 30 分钟 | 抢先体验更新 | 只更新抢先体验游戏   |

---

## 前端刷新逻辑参考

### 前端 `useGameRefresh` Hook 的更新策略

前端 Hook 实现了以下逻辑（供后端参考）：

#### 1. 首次加载（延迟 2 秒）

```typescript
// 优先刷新缺少好评率的游戏
const missingGames = games.filter(
  (g) => g.positivePercentage === null || g.positivePercentage === undefined
)
await refreshGames(missingGames)
```

#### 2. 定期刷新（每 30 分钟）

```typescript
// 刷新所有游戏，但以下类型优先：
// 1. 缺少好评率的游戏
// 2. 抢先体验游戏（可能转正）
// 3. 缺少发布日期的游戏
await refreshAllGames()
```

#### 3. 新游戏加载（延迟 500ms）

```typescript
// 立即刷新新加载的游戏
const newGames = games.filter((g) => !hasRefreshed(g.id))
await refreshGames(newGames)
```

#### 4. 数据更新决策

```typescript
// 只有以下情况才调用 Steam API：
const needsRefresh =
  game.positivePercentage === null ||
  game.totalReviews === null ||
  game.releaseDate === null ||
  game.isEarlyAccess === null ||
  game.isEarlyAccess === true // 抢先体验游戏总是刷新

if (needsRefresh) {
  await fetchSteamData(game.appId)
  await updateBackend(game.id, steamData)
}
```

---

## 后端实现建议

### Python 实现示例（伪代码）

```python
import time
import requests
from datetime import datetime

def refresh_all_games():
    """刷新所有游戏数据"""
    games = get_games_sorted_by_priority()

    stats = {
        'total': len(games),
        'updated': 0,
        'skipped': 0,
        'errors': 0
    }

    for game in games:
        try:
            print(f"更新游戏: {game['name']} (app_id={game['app_id']})")

            # 获取 Steam 数据
            reviews = fetch_steam_reviews(game['app_id'])
            release_info = fetch_steam_release_date(game['app_id'])

            # 检查是否需要更新
            if not needs_update(game, reviews, release_info):
                print(f"  跳过: 数据未变化")
                stats['skipped'] += 1
                continue

            # 更新数据库
            update_data = {
                'positive_percentage': reviews.get('positivePercentage'),
                'total_reviews': reviews.get('totalReviews'),
                'chinese_positive_percentage': reviews.get('chinesePositivePercentage'),
                'chinese_total_reviews': reviews.get('chineseTotalReviews'),
                'release_date_text': release_info.get('releaseDate'),
                'coming_soon': release_info.get('comingSoon'),
                'is_early_access': release_info.get('isEarlyAccess'),
                'genres': release_info.get('genres'),
            }

            # 移除 None 值
            update_data = {k: v for k, v in update_data.items() if v is not None}

            if update_data:
                update_game(game['id'], update_data)
                print(f"  ✓ 更新成功")
                stats['updated'] += 1

        except RateLimitError:
            print(f"  ⚠ 触发限流，等待 60 秒...")
            time.sleep(60)
            continue

        except Exception as e:
            print(f"  ✗ 更新失败: {e}")
            stats['errors'] += 1

        # 防止请求过快
        time.sleep(1.5)

    # 打印统计
    print("\n" + "="*60)
    print(f"更新完成: {datetime.now()}")
    print(f"  总数: {stats['total']}")
    print(f"  成功: {stats['updated']}")
    print(f"  跳过: {stats['skipped']}")
    print(f"  失败: {stats['errors']}")
    print("="*60)


def needs_update(game, reviews, release_info):
    """判断游戏是否需要更新"""
    # 缺少数据
    if not game['positive_percentage'] or not game['total_reviews']:
        return True

    # 数据有变化
    if reviews.get('positivePercentage') != game['positive_percentage']:
        return True
    if reviews.get('totalReviews') != game['total_reviews']:
        return True
    if release_info.get('isEarlyAccess') != game['is_early_access']:
        return True

    return False


def get_games_sorted_by_priority():
    """获取游戏列表，按优先级排序"""
    # SQL 查询见上文
    pass


def fetch_steam_reviews(app_id):
    """获取 Steam 评论数据"""
    response = requests.get(
        'https://your-backend/api/steam/proxy/reviews',
        params={'appId': app_id},
        timeout=10
    )
    return response.json()


def fetch_steam_release_date(app_id):
    """获取 Steam 发布日期和状态"""
    response = requests.get(
        'https://your-backend/api/steam/proxy/release-date',
        params={'appId': app_id},
        timeout=10
    )
    return response.json()


def update_game(game_id, update_data):
    """更新游戏数据"""
    response = requests.put(
        f'https://your-backend/api/games/{game_id}',
        json=update_data,
        headers={'Authorization': f'Bearer {SESSION_TOKEN}'},
        timeout=10
    )
    return response.json()


if __name__ == '__main__':
    refresh_all_games()
```

### 使用已有的 Python 脚本

项目中已提供 `update_backend_games.py` 脚本，可以参考其逻辑：

```bash
# 使用现有脚本作为定时任务
python3 update_backend_games.py <session_token>
```

**区别**：

- 现有脚本从 `games.json` 读取数据
- 定时任务应从数据库读取数据
- 定时任务应调用 Steam API 获取最新数据

---

## 监控和日志

### 建议记录的日志

1. **每次运行统计**：
   - 开始时间、结束时间
   - 处理游戏总数
   - 成功更新数量
   - 跳过数量
   - 失败数量

2. **错误日志**：
   - 游戏 ID 和名称
   - 错误类型
   - 错误详情

3. **性能指标**：
   - 平均每个游戏处理时间
   - Steam API 调用次数
   - 限流发生次数

### 日志格式示例

```
[2026-02-11 03:00:00] 开始刷新游戏数据
[2026-02-11 03:00:01] 更新游戏: Counter-Strike 2 (app_id=730)
[2026-02-11 03:00:03]   ✓ 更新成功 (好评率: 86%, 评论数: 9373155)
[2026-02-11 03:00:05] 更新游戏: Stardew Valley (app_id=413150)
[2026-02-11 03:00:07]   ✓ 更新成功 (好评率: 98%, 评论数: 975588)
...
[2026-02-11 03:02:30] ============================================================
[2026-02-11 03:02:30] 更新完成
[2026-02-11 03:02:30]   总数: 32
[2026-02-11 03:02:30]   成功: 30
[2026-02-11 03:02:30]   跳过: 2
[2026-02-11 03:02:30]   失败: 0
[2026-02-11 03:02:30]   耗时: 2 分 30 秒
[2026-02-11 03:02:30] ============================================================
```

---

## 注意事项

### 1. 数据一致性

- 使用事务确保数据更新的原子性
- 更新失败时应回滚，不留下部分更新的数据

### 2. 性能优化

- 使用批量更新减少数据库操作
- 对 Steam API 响应做缓存（1小时）
- 异步处理，避免阻塞主服务

### 3. 容错处理

- Steam API 不稳定时应有重试机制
- 记录所有失败的游戏，下次优先更新
- 不要因为个别游戏失败而中断整个任务

### 4. 扩展性

- 随着游戏数量增加，考虑分布式处理
- 按游戏状态分批（playing, queueing, completion）
- 优先更新用户当前在玩的游戏

---

## 参考资料

- [Steam Web API 文档](https://steamapi.xpaw.me/)
- [Steam Store API](https://wiki.teamfortress.com/wiki/User:RJackson/StorefrontAPI)
- 前端实现：`apps/web/src/hooks/useGameRefresh.ts`
- 现有脚本：`update_backend_games.py`
