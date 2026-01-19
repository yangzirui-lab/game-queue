import express from 'express';
import cors from 'cors';
import { Store} from './store.js';

const app = express();
const port = 3000;
const store = new Store();

app.use(cors());
app.use(express.json());

// Get all games
app.get('/api/games', (req, res) => {
  res.json({ games: store.getGames() });
});

// Add a new game
app.post('/api/games', async (req, res) => {
  const { name, status, notes } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const game = store.addGame({
    name,
    status: status || 'to-play',
    notes,
    tags: []
  });

  await store.save(`Add game via web: ${name}`);
  res.status(201).json(game);
});

// Update a game
app.put('/api/games/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const updated = store.updateGame(id as string, updates);
  if (updated) {
    await store.save(`Update game via web: ${updated.name}`);
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Game not found' });
  }
});

// Remove a game
app.delete('/api/games/:id', async (req, res) => {
  const { id } = req.params;
  const removed = store.removeGame(id as string);
  if (removed) {
    await store.save(`Remove game via web: ${removed.name}`);
    res.json(removed);
  } else {
    res.status(404).json({ error: 'Game not found' });
  }
});

// Sync with Git
app.post('/api/git/sync', async (req, res) => {
  try {
    const result = await store.sync();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Git sync failed', details: (err as Error).message });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
