export interface SteamGame {
  id: number;
  name: string;
  steamUrl: string;
  coverImage: string;
  tags: string[];
  positivePercentage: number | null;
  totalReviews: number | null;
  averagePlaytime: number | null;
  releaseDate: string | null;
  comingSoon: boolean | null;
  isEarlyAccess: boolean | null;
}

interface SteamSearchItem {
  id: number;
  type: string;
  name: string;
  tiny_image: string;
  steamUrl: string;
  coverImage: string;
  tags: string[];
}

interface SteamSearchResponse {
  items: SteamSearchItem[];
}

interface SteamReviewSummary {
  total_positive: number;
  total_negative: number;
  total_reviews: number;
}

interface SteamReviewsResponse {
  query_summary: SteamReviewSummary;
}

interface SteamAppDetails {
  [appId: string]: {
    success: boolean;
    data: {
      name: string;
      steam_appid: number;
      header_image: string;
      short_description: string;
      background: string;
      genres: { id: string; description: string }[];
      categories: { id: number; description: string }[];
      release_date: {
        coming_soon: boolean;
        date: string;
      };
    };
  };
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

        const data = await response.json() as SteamSearchResponse;
        console.log('Steam API response:', data);

        if (!data.items || data.items.length === 0) {
          console.log('No items found in response');
          return [];
        }

        // 转换 Steam API 数据到我们的格式 - 先返回基本信息
        const games: SteamGame[] = data.items
          .filter((item) => item.type === 'app') // 只要游戏，不要 DLC 等
          .slice(0, 10) // 限制返回 10 个结果
          .map((item) => ({
            id: item.id,
            name: item.name,
            steamUrl: `https://store.steampowered.com/app/${item.id}`,
            coverImage: item.tiny_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.id}/capsule_sm_120.jpg`,
            tags: [], // Steam search API 不返回标签
            positivePercentage: null, // 后续异步加载
            totalReviews: null, // 后续异步加载
            averagePlaytime: null,
            releaseDate: null, // 后续异步加载
            comingSoon: null, // 后续异步加载
            isEarlyAccess: null, // 后续异步加载
          }));

        console.log(`Successfully found ${games.length} games`);
        return games;
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
  async getGameDetails(appId: number): Promise<SteamAppDetails[string]['data'] | null> {
    const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=schinese&cc=CN`;

    // 尝试多个代理
    for (const proxy of CORS_PROXIES) {
      try {
        const proxyUrl = `${proxy}${encodeURIComponent(detailsUrl)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          continue;
        }

        const data = await response.json() as SteamAppDetails;

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

  // 获取游戏发布日期和抢先体验状态
  async getGameReleaseDate(appId: number): Promise<{ releaseDate: string | null; comingSoon: boolean | null; isEarlyAccess: boolean | null }> {
    const details = await this.getGameDetails(appId)

    if (!details) {
      return { releaseDate: null, comingSoon: null, isEarlyAccess: null }
    }

    // 检查是否为抢先体验（category id = 29）
    const isEarlyAccess = details.categories?.some(cat => cat.id === 29) || false

    return {
      releaseDate: details.release_date?.date || null,
      comingSoon: details.release_date?.coming_soon || null,
      isEarlyAccess,
    }
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

        const data = await response.json() as SteamReviewsResponse;

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
