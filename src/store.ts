import * as fs from "fs";
import * as path from "path";
import { simpleGit, type SimpleGit } from "simple-git";

const DATA_FILE = path.join(process.cwd(), "games.json");

export interface Game {
  id: string;
  name: string;
  status: "to-play" | "playing" | "finished" | "dropped";
  addedAt: string;
  lastUpdated: string;
  notes?: string | undefined;
  tags?: string[] | undefined;
}

export interface StoreData {
  games: Game[];
  config: {
    autoCommit: boolean;
  };
}

const git: SimpleGit = simpleGit();

export class Store {
  private data: StoreData;

  constructor() {
    if (fs.existsSync(DATA_FILE)) {
      this.data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    } else {
      this.data = {
        games: [],
        config: { autoCommit: true },
      };
      this.saveSync();
    }
  }

  private saveSync() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2));
  }

  async save(message: string) {
    this.updateReadme();
    this.saveSync();
    if (this.data.config.autoCommit) {
      try {
        await git.add(DATA_FILE);
        await git.add(path.join(process.cwd(), "README.md"));
        await git.commit(message);
        console.log(`[Git] Committed: ${message}`);
      } catch (err) {
        console.error("[Git] Failed to commit:", err);
      }
    }
  }

  private updateReadme() {
    const README_FILE = path.join(process.cwd(), "README.md");
    if (!fs.existsSync(README_FILE)) return;

    const content = fs.readFileSync(README_FILE, "utf-8");
    const games = this.data.games;

    const startMarker = "<!-- QUEUE_START -->";
    const endMarker = "<!-- QUEUE_END -->";

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) return;

    let table = "\n| Game | Status | Notes |\n| :--- | :--- | :--- |\n";
    games.forEach((g) => {
      table += `| ${g.name} | ${g.status} | ${g.notes || "-"} |\n`;
    });

    const newContent =
      content.substring(0, startIndex + startMarker.length) +
      table +
      content.substring(endIndex);

    fs.writeFileSync(README_FILE, newContent);
  }

  getGames() {
    return this.data.games;
  }

  addGame(game: Omit<Game, "id" | "addedAt" | "lastUpdated">) {
    const newGame: Game = {
      ...game,
      id: `game-${Date.now()}`,
      addedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    this.data.games.push(newGame);
    return newGame;
  }

  updateGame(id: string, updates: Partial<Omit<Game, "id" | "addedAt">>) {
    const index = this.data.games.findIndex(
      (g) => g.id === id || g.name === id,
    );
    if (index !== -1) {
      const currentGame = this.data.games[index];
      if (currentGame) {
        this.data.games[index] = {
          ...currentGame,
          ...updates,
          lastUpdated: new Date().toISOString(),
        };
        return this.data.games[index];
      }
    }
    return null;
  }

  removeGame(id: string) {
    const index = this.data.games.findIndex(
      (g) => g.id === id || g.name === id,
    );
    if (index !== -1) {
      const removed = this.data.games.splice(index, 1);
      return removed[0] ?? null;
    }
    return null;
  }
}
