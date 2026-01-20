export interface SteamGame {
  id: number;
  name: string;
  steamUrl: string;
  coverImage: string;
  tags: string[];
  positivePercentage: number | null;
  totalReviews: number | null;
  averagePlaytime: number | null;
}

// 使用多个 CORS 代理备用方案
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
];

// Steam store search API
const STEAM_SEARCH_API = 'https://store.steampowered.com/api/storesearch/';

export class SteamService {
  async search(query: string): Promise<SteamGame[]> {
    if (!query.trim()) {
      return [];
    }

    const searchUrl = `${STEAM_SEARCH_API}?term=${encodeURIComponent(query)}&l=schinese&cc=CN`;

    // 尝试多个代理
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const proxy = CORS_PROXIES[i];
      try {
        console.log(`Trying proxy ${i + 1}/${CORS_PROXIES.length}: ${proxy}`);

        const proxyUrl = `${proxy}${encodeURIComponent(searchUrl)}`;
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        console.log(`Proxy ${i + 1} response status:`, response.status);

        if (!response.ok) {
          console.warn(`Proxy ${i + 1} failed with status ${response.status}`);
          continue; // 尝试下一个代理
        }

        const data = await response.json();
        console.log('Steam API response:', data);

        if (!data.items || data.items.length === 0) {
          console.log('No items found in response');
          return [];
        }

        // 转换 Steam API 数据到我们的格式
        const games: SteamGame[] = data.items
          .filter((item: any) => item.type === 'app') // 只要游戏，不要 DLC 等
          .slice(0, 10); // 限制返回 10 个结果

        // 并行获取每个游戏的评论统计
        const gamesWithDetails = await Promise.all(
          games.map(async (item: any) => {
            // 获取评论统计
            const reviews = await this.getGameReviews(item.id);
            console.log(`Game ${item.id} reviews:`, reviews);

            return {
              id: item.id,
              name: item.name,
              steamUrl: `https://store.steampowered.com/app/${item.id}`,
              coverImage: item.tiny_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.id}/capsule_sm_120.jpg`,
              tags: [], // Steam search API 不返回标签
              positivePercentage: reviews.positivePercentage,
              totalReviews: reviews.totalReviews,
              averagePlaytime: null, // 游戏时长信息不在详情 API 中
            };
          })
        );

        console.log(`Successfully found ${gamesWithDetails.length} games with details`);
        return gamesWithDetails;
      } catch (error) {
        console.error(`Proxy ${i + 1} error:`, error);
        if (i === CORS_PROXIES.length - 1) {
          // 最后一个代理也失败了
          throw new Error('所有 CORS 代理都失败了。Steam 搜索暂时不可用，请稍后再试。');
        }
        // 继续尝试下一个代理
      }
    }

    throw new Error('Steam 搜索失败，请稍后再试。');
  }

  // 获取游戏详情
  async getGameDetails(appId: number): Promise<any> {
    const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=schinese&cc=CN`;

    // 尝试多个代理
    for (const proxy of CORS_PROXIES) {
      try {
        const proxyUrl = `${proxy}${encodeURIComponent(detailsUrl)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          continue;
        }

        const data = await response.json();

        if (!data[appId]?.success) {
          continue;
        }

        return data[appId].data;
      } catch (error) {
        console.error('Failed to fetch game details from proxy:', error);
        continue;
      }
    }

    return null;
  }

  // 获取游戏评论统计
  async getGameReviews(appId: number): Promise<{ positivePercentage: number | null; totalReviews: number | null }> {
    const reviewsUrl = `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`;

    // 尝试多个代理
    for (const proxy of CORS_PROXIES) {
      try {
        const proxyUrl = `${proxy}${encodeURIComponent(reviewsUrl)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          continue;
        }

        const data = await response.json();

        if (!data.query_summary) {
          continue;
        }

        const { total_positive, total_negative, total_reviews } = data.query_summary;

        let positivePercentage: number | null = null;
        const totalReviews = total_reviews || null;

        if (total_positive !== undefined && total_negative !== undefined) {
          const total = total_positive + total_negative;
          if (total > 0) {
            positivePercentage = Math.round((total_positive / total) * 100);
          }
        }

        return { positivePercentage, totalReviews };
      } catch (error) {
        console.error('Failed to fetch reviews from proxy:', error);
        continue;
      }
    }

    return { positivePercentage: null, totalReviews: null };
  }
}

export const steamService = new SteamService();
