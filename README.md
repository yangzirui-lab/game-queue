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

## Steam Login Setup (Optional)

To enable Steam login functionality, you need to deploy the application to Vercel. See [STEAM_LOGIN_SETUP.md](./STEAM_LOGIN_SETUP.md) for detailed instructions.

Quick steps:

1. Deploy to Vercel
2. Get a Steam API Key
3. Configure environment variables in Vercel Dashboard
4. Users can now login with Steam to display their profile

## Deployment

### Deploy to Vercel (Recommended)

1. Install Vercel CLI: `npm install -g vercel`
2. Run: `vercel`
3. Follow the prompts
4. Configure environment variables (see [STEAM_LOGIN_SETUP.md](./STEAM_LOGIN_SETUP.md))

The application will be deployed with:

- Frontend: Static site from `web/dist`
- API: Serverless functions from `api/` directory

All changes made in the web UI are automatically synced to your GitHub repository
