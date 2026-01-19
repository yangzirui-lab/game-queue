# Game Queue Manager (Git-backed)

A Node.js CLI tool to manage your Steam game backlog, using Git for version control of your data.

## Features

- **Git integration**: Every change is automatically committed to your local Git repository.
- **Easy management**: Add, list, update, and remove games from your queue.
- **JSON storage**: Data is stored in a simple `games.json` file.

## Installation

1. Clone the repository.
2. Run `npm install`.

## Current Queue

<!-- QUEUE_START -->
| Game | Status | Notes |
| :--- | :--- | :--- |
| Cyberpunk 2077 | to-play | Need to finish Phantom Liberty |
| 雾锁王国 | playing | - |
<!-- QUEUE_END -->

## Usage

Add a game (interactive):

```bash
npm start -- add "Elden Ring"
```

_If `--status` is omitted, you will be prompted to select one._

Add a game with status and notes:

```bash
npm start -- add "Elden Ring" --status playing --notes "Exploring Limgrave"
```

List games:

```bash
npm start -- list
```

Update status (interactive):

```bash
npm start -- update "Elden Ring"
```

Update status via CLI:

```bash
npm start -- update "Elden Ring" --status finished
```

Remove a game:

```bash
npm start -- remove "Elden Ring"
```

## Configuration

The tool automatically commits changes if `config.autoCommit` is set to `true` in `games.json`.
