# Game Queue Manager (Git-backed)

A modern web application to manage your Steam game backlog, using Git for version control of your data.

## Features

- **Web Dashboard**: A modern, interactive web interface to manage your queue visually.
- **Git integration**: Every change is automatically committed to your local Git repository.

## Installation

1. Clone the repository.
2. Run `npm install`.
3. Run `cd web`.
4. Run `npm install`.
5. Run `cd ..`.
6. Run `npm run web`.

## Usage

To start the application, run:

```bash
npm run web
```

This will open the dashboard in your browser.

All changes made in the web UI are automatically committed to Git

## Configuration

The tool automatically commits changes if `config.autoCommit` is set to `true` in `games.json`.
