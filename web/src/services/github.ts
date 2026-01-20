import type { GameQueueData } from '../types';

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

const STORAGE_KEY = 'github_config';
const FILE_PATH = 'games.json';

export class GitHubService {
  private config: GitHubConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  loadConfig(): GitHubConfig | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.config = JSON.parse(stored);
      }
      return this.config;
    } catch (error) {
      console.error('Failed to load GitHub config:', error);
      return null;
    }
  }

  saveConfig(config: GitHubConfig): void {
    this.config = config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  clearConfig(): void {
    this.config = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  isConfigured(): boolean {
    return this.config !== null &&
           !!this.config.token &&
           !!this.config.owner &&
           !!this.config.repo;
  }

  getConfig(): GitHubConfig | null {
    return this.config;
  }

  private getApiUrl(path: string = ''): string {
    if (!this.config) {
      throw new Error('GitHub not configured');
    }
    return `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
  }

  private getHeaders(): HeadersInit {
    if (!this.config) {
      throw new Error('GitHub not configured');
    }
    return {
      'Authorization': `Bearer ${this.config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  async fetchGames(): Promise<GameQueueData> {
    if (!this.isConfigured()) {
      throw new Error('GitHub not configured. Please configure in Settings.');
    }

    try {
      const response = await fetch(this.getApiUrl(FILE_PATH), {
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        // File doesn't exist yet, return empty data
        return { games: [] };
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Decode base64 content with UTF-8 support for Chinese characters
      const content = decodeURIComponent(escape(atob(data.content)));
      const gameData: GameQueueData = JSON.parse(content);

      return gameData;
    } catch (error) {
      console.error('Failed to fetch games from GitHub:', error);
      throw error;
    }
  }

  async updateGames(gameData: GameQueueData, commitMessage: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('GitHub not configured. Please configure in Settings.');
    }

    try {
      // First, get the current file SHA (required for updates)
      let sha: string | undefined;

      try {
        const currentFile = await fetch(this.getApiUrl(FILE_PATH), {
          headers: this.getHeaders(),
        });

        if (currentFile.ok) {
          const data = await currentFile.json();
          sha = data.sha;
        }
      } catch {
        // File might not exist yet, that's okay
        console.log('File does not exist yet, will create new file');
      }

      // Encode content as base64
      const content = JSON.stringify(gameData, null, 2);
      const base64Content = btoa(unescape(encodeURIComponent(content)));

      // Create or update the file
      const response = await fetch(this.getApiUrl(FILE_PATH), {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          message: commitMessage,
          content: base64Content,
          sha: sha,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API error: ${response.status} ${errorData.message || response.statusText}`);
      }

      console.log('Successfully updated games.json on GitHub');
    } catch (error) {
      console.error('Failed to update games on GitHub:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.config!.owner}/${this.config!.repo}`,
        {
          headers: this.getHeaders(),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('GitHub connection test failed:', error);
      return false;
    }
  }
}

export const githubService = new GitHubService();
