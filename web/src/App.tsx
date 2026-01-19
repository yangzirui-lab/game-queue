import { useState, useMemo, useEffect } from 'react'
import { GameItem } from './components/GameItem'
import { SearchBar } from './components/SearchBar'
import { AddGame } from './components/AddGame'
import type { Game } from './types'
import { AnimatePresence, motion } from 'framer-motion'
import { GitBranch, Loader2 } from 'lucide-react'

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Fetch games on mount
  useEffect(() => {
    fetch('/api/games')
      .then(res => res.json())
      .then(data => setGames(data.games))
      .catch(err => console.error('Failed to fetch games:', err))
  }, [])

  // Clear highlight after a few seconds
  useEffect(() => {
    if (highlightId) {
      const timer = setTimeout(() => setHighlightId(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [highlightId])

  // Clear toast after a few seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Sorting logic: "playing" first, then by lastUpdated
  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => {
      if (a.status === 'playing' && b.status !== 'playing') return -1
      if (a.status !== 'playing' && b.status === 'playing') return 1
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    })
  }, [games])

  // Filtering logic
  const filteredGames = useMemo(() => {
    if (!searchTerm) return sortedGames
    return sortedGames.filter(g => 
      g.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [sortedGames, searchTerm])

  const handleAddGame = (name: string) => {
    const existing = games.find(g => g.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      setToast(`"${name}" is already in your queue!`)
      setHighlightId(existing.id)
      return
    }

    fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, status: 'backlog' })
    })
      .then(res => res.json())
      .then(newGame => {
        setGames(prev => [newGame, ...prev])
        setToast(`Added "${name}" to your queue.`)
        setHighlightId(newGame.id)
      })
      .catch(err => console.error('Failed to add game:', err))
  }

  const handleUpdateGame = (id: string, updates: Partial<Game>) => {
    fetch(`/api/games/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
      .then(res => res.json())
      .then(updatedGame => {
        setGames(prev => prev.map(g => g.id === id ? updatedGame : g))
      })
      .catch(err => console.error('Failed to update game:', err))
  }

  const handleDeleteGame = (id: string) => {
    const game = games.find(g => g.id === id)
    if (!game) return

    if (window.confirm(`Are you sure you want to delete "${game.name}"?`)) {
      fetch(`/api/games/${id}`, {
        method: 'DELETE'
      })
        .then(() => {
          setGames(prev => prev.filter(g => g.id !== id))
          setToast(`Removed "${game.name}" from your queue.`)
        })
        .catch(err => console.error('Failed to delete game:', err))
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (term) {
      const match = games.find(g => g.name.toLowerCase().includes(term.toLowerCase()))
      if (match) {
        setHighlightId(match.id)
      }
    }
  }

  const handleSync = () => {
    setIsSyncing(true)
    fetch('/api/git/sync', { method: 'POST' })
      .then(res => res.json())
      .then(() => {
        setToast('Successfully synced with Git!')
        setIsSyncing(false)
      })
      .catch(err => {
        console.error('Failed to sync:', err)
        setToast('Git sync failed. Check console.')
        setIsSyncing(false)
      })
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Game Queue</h1>
        <SearchBar value={searchTerm} onSearch={handleSearch} />
      </header>

      <main>
        <AddGame onAdd={handleAddGame} />
        
        <div className="game-list">
          <AnimatePresence>
            {filteredGames.length > 0 ? (
              filteredGames.map(game => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <GameItem 
                    game={game} 
                    onUpdate={handleUpdateGame} 
                    onDelete={handleDeleteGame}
                    isHighlighted={highlightId === game.id}
                  />
                </motion.div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                No games found. Add some!
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      <motion.button
        className={`fab-sync ${isSyncing ? 'syncing' : ''}`}
        onClick={handleSync}
        disabled={isSyncing}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Sync with Git"
      >
        {isSyncing ? <Loader2 className="animate-spin" size={24} /> : <GitBranch size={24} />}
      </motion.button>
    </div>
  )
}

export default App
