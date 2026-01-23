# GameGallery

A modern web application to manage your Steam game backlog, beautifully showcasing your game collection like an art gallery.

## Features

- **Web Dashboard**: A modern, interactive web interface to manage your queue visually.
- **Steam Login**: Optional Steam authentication to display your profile and sync game information.
- **Game Pinning**: Pin your favorite games to keep them at the top of your queue.
- **GitHub Integration**: Store your game data in a GitHub repository with automatic syncing.

## Installation

1. Clone the repository.
2. Run `npm install`.
3. Run `cd web`.
4. Run `npm install`.

## Usage

To start the application, run:

```bash
npm run web
```

This will open the dashboard in your browser.

## Deployment Architecture

This project uses a **split deployment** approach:

- **Frontend**: GitHub Pages (https://yangzirui-lab.github.io)
- **API**: Vercel Serverless Functions

### Quick Deployment Guide

1. **Deploy API to Vercel**

   ```bash
   npm install -g vercel
   vercel
   ```

2. **Configure Frontend Environment**

   ```bash
   cd web
   cp .env.production.example .env.production
   # Edit .env.production: Set VITE_API_URL to your Vercel domain
   ```

3. **Build and Deploy Frontend**
   ```bash
   npm run build
   # GitHub Actions will automatically deploy to GitHub Pages
   ```

📖 **Detailed guide**: See [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)

## Steam Login (Optional)

Enable Steam authentication to display user profiles.

**Requirements**: API must be deployed to Vercel

📖 **Setup guide**: See [STEAM_LOGIN_SETUP.md](./STEAM_LOGIN_SETUP.md)

---

All changes made in the web UI are automatically synced to your GitHub repository
