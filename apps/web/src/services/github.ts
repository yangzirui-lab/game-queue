import type { GameQueueData } from '../types'

interface GitHubConfig {
  token: string
  owner: string
  repo: string
}

interface GitHubFileResponse {
  content: string
  sha: string
}

const STORAGE_KEY = 'github_config'
const FILE_PATH = 'games.json'

export class GitHubService {
  private config: GitHubConfig | null = null

  constructor() {
    this.loadConfig()
  }

  loadConfig(): GitHubConfig | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.config = JSON.parse(stored)
        // 强制修正为正确的owner和repo
        if (
          this.config &&
          (this.config.owner !== 'catalyzer-dot' || this.config.repo !== 'game-gallery')
        ) {
          this.config.owner = 'catalyzer-dot'
          this.config.repo = 'game-gallery'
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config))
        }
      }
      return this.config
    } catch (error) {
      console.error('Failed to load GitHub config:', error)
      return null
    }
  }

  saveConfig(config: GitHubConfig): void {
    this.config = config
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }

  clearConfig(): void {
    this.config = null
    localStorage.removeItem(STORAGE_KEY)
  }

  isConfigured(): boolean {
    return this.config !== null && !!this.config.token && !!this.config.owner && !!this.config.repo
  }

  getConfig(): GitHubConfig | null {
    return this.config
  }

  private getApiUrl(path: string = ''): string {
    if (!this.config) {
      throw new Error('GitHub not configured')
    }
    return `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${path}`
  }

  private getHeaders(): HeadersInit {
    if (!this.config) {
      throw new Error('GitHub not configured')
    }
    return {
      Authorization: `Bearer ${this.config.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    }
  }

  async fetchGames(): Promise<GameQueueData> {
    if (!this.isConfigured()) {
      throw new Error('GitHub not configured. Please configure in Settings.')
    }

    try {
      const response = await fetch(this.getApiUrl(FILE_PATH), {
        headers: this.getHeaders(),
      })

      if (response.status === 404) {
        // File doesn't exist yet, return empty data
        return { games: [] }
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Decode base64 content with UTF-8 support for Chinese characters
      const content = decodeURIComponent(escape(atob(data.content)))
      const gameData: GameQueueData = JSON.parse(content)

      return gameData
    } catch (error) {
      console.error('Failed to fetch games from GitHub:', error)
      throw error
    }
  }

  async updateGames(gameData: GameQueueData, commitMessage: string): Promise<void> {
    await this.concurrentUpdateGames(() => gameData.games, commitMessage)
  }

  async concurrentUpdateGames(
    updater: (currentGames: import('../types').Game[]) => import('../types').Game[],
    commitMessage: string
  ): Promise<import('../types').Game[]> {
    if (!this.isConfigured()) {
      throw new Error('GitHub not configured. Please configure in Settings.')
    }

    try {
      // 1. Fetch latest content and SHA
      const { data, sha } = await this.fetchRawFile()

      let currentGames: import('../types').Game[] = []
      if (data) {
        const content = decodeURIComponent(escape(atob(data.content)))
        const parsed: GameQueueData = JSON.parse(content)
        currentGames = parsed.games
      }

      // 2. Apply updater
      const newGames = updater(currentGames)
      const newGameData: GameQueueData = { games: newGames }

      // 3. Save with optimistic locking (using SHA)
      const content = JSON.stringify(newGameData, null, 2)
      const base64Content = btoa(unescape(encodeURIComponent(content)))

      const response = await fetch(this.getApiUrl(FILE_PATH), {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          message: commitMessage,
          content: base64Content,
          sha: sha, // Include SHA to prevent overwriting if file changed since fetch
        }),
      })

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('Conflict detected: Remote file has changed. Please retry.')
        }
        const errorData = await response.json()
        throw new Error(
          `GitHub API error: ${response.status} ${errorData.message || response.statusText}`
        )
      }

      console.log('Successfully updated games.json on GitHub')
      return newGames
    } catch (error) {
      console.error('Failed to update games on GitHub:', error)
      throw error
    }
  }

  private async fetchRawFile(): Promise<{ data: GitHubFileResponse | null; sha?: string }> {
    try {
      const response = await fetch(this.getApiUrl(FILE_PATH), {
        headers: this.getHeaders(),
      })

      if (response.status === 404) {
        return { data: null }
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return { data, sha: data.sha }
    } catch (error) {
      console.error('Failed to fetch raw file:', error)
      throw error
    }
  }

  async getCurrentUser(token: string): Promise<string | null> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.login
    } catch (error) {
      console.error('Failed to get current user:', error)
      return null
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.config!.owner}/${this.config!.repo}`,
        {
          headers: this.getHeaders(),
        }
      )

      return response.ok
    } catch (error) {
      console.error('GitHub connection test failed:', error)
      return false
    }
  }
}

export const githubService = new GitHubService()
