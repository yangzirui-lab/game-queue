// ==================== Types ====================

interface BackendConfig {
  apiKey: string
  apiUrl: string
}

// ==================== Constants ====================

const STORAGE_KEY = 'backend_config'

// ==================== Main Class ====================

class ConfigService {
  private config: BackendConfig | null = null

  constructor() {
    this.loadConfig()
  }

  /**
   * 从 localStorage 加载配置
   * @returns 成功时返回配置对象，失败时返回 null
   */
  loadConfig(): BackendConfig | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)

      // Happy Path: 没有配置直接返回
      if (!stored) {
        return null
      }

      this.config = JSON.parse(stored)

      // Happy Path: 配置解析失败
      if (!this.config) {
        return null
      }

      return this.config
    } catch (error) {
      console.error('[ConfigService] Failed to load config:', error)
      return null
    }
  }

  /**
   * 保存配置到 localStorage
   * @param config - 配置对象
   */
  saveConfig(config: BackendConfig): void {
    this.config = config
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }

  /**
   * 清除配置
   */
  clearConfig(): void {
    this.config = null
    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * 检查配置是否完整
   * @returns 配置完整返回 true，否则返回 false
   */
  isConfigured(): boolean {
    return this.config !== null && !!this.config.apiKey && !!this.config.apiUrl
  }

  /**
   * 获取当前配置
   * @returns 配置对象或 null
   */
  getConfig(): BackendConfig | null {
    return this.config
  }

  /**
   * 获取 API Key
   * @returns API Key 或 null
   */
  getApiKey(): string | null {
    if (!this.config) {
      return null
    }

    return this.config.apiKey
  }

  /**
   * 获取 API URL
   * @returns API URL 或 null
   */
  getApiUrl(): string | null {
    if (!this.config) {
      return null
    }

    return this.config.apiUrl
  }
}

// ==================== Service Instance ====================

const configService = new ConfigService()

// ==================== Exports ====================

export type { BackendConfig }
export { ConfigService, configService }
