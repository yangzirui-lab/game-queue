import React, { useState, useEffect } from "react";
import { Search, Plus, X } from "lucide-react";
import { steamService, type SteamGame } from "../services/steam";

interface SteamSearchProps {
  onAddGame: (name: string, steamUrl: string, coverImage: string, tags: string[]) => void;
  onClose: () => void;
}

export const SteamSearch: React.FC<SteamSearchProps> = ({ onAddGame, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SteamGame[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 实时搜索：输入时自动搜索，带防抖
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const games = await steamService.search(query);
        setResults(games);
      } catch (err) {
        setError('搜索失败，请重试');
        console.error('Steam search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms 防抖

    return () => {
      clearTimeout(timer);
      setIsSearching(false);
    };
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleAddGame = (game: SteamGame) => {
    onAddGame(game.name, game.steamUrl, game.coverImage, game.tags);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '700px',
        width: '90%',
        maxHeight: '80vh',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#999'
          }}
        >
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: '1.5rem', color: '#fff' }}>从 Steam 搜索游戏</h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input-primary"
              placeholder="输入游戏名称开始搜索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{ width: '100%', paddingRight: '3rem' }}
            />
            {isSearching && (
              <div style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#1b8dd4'
              }}>
                <Search size={18} className="animate-spin" />
              </div>
            )}
          </div>
          {query && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#999' }}>
              {isSearching ? '正在搜索...' : results.length > 0 ? `找到 ${results.length} 个结果` : '没有找到结果'}
            </div>
          )}
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            background: '#ff4444',
            color: 'white',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 'calc(80vh - 200px)', overflowY: 'auto' }}>
          {results.length > 0 && results.map((game) => (
            <div
              key={game.id}
              style={{
                display: 'flex',
                gap: '1rem',
                padding: '0.75rem',
                background: '#2a2a2a',
                borderRadius: '8px',
                alignItems: 'center',
                border: '1px solid #333'
              }}
            >
              <img
                src={game.coverImage}
                alt={game.name}
                style={{
                  width: '120px',
                  height: '45px',
                  objectFit: 'cover',
                  borderRadius: '4px'
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="45"%3E%3Crect fill="%23333" width="120" height="45"/%3E%3Ctext x="50%25" y="50%25" fill="%23666" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '0.25rem' }}>
                  {game.name}
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.85rem' }}>
                  {game.positivePercentage !== null && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: game.positivePercentage >= 80 ? '#66c0f4' : game.positivePercentage >= 60 ? '#ffa500' : '#999'
                    }}>
                      <span style={{ fontSize: '1rem' }}>👍</span>
                      <span>{game.positivePercentage}%</span>
                    </div>
                  )}
                  {game.averagePlaytime !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#999' }}>
                      <span style={{ fontSize: '1rem' }}>⏱️</span>
                      <span>{game.averagePlaytime}h</span>
                    </div>
                  )}
                  {game.tags.length > 0 && (
                    <div style={{ color: '#666' }}>
                      {game.tags.join(', ')}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleAddGame(game)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <Plus size={16} />
                添加
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
