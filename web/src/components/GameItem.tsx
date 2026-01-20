import React, { useRef, useEffect, useState } from "react";
import type { Game, GameStatus } from "../types";
import { ExternalLink } from "lucide-react";

interface GameItemProps {
  game: Game;
  onUpdate: (id: string, updates: Partial<Game>) => void;
  isHighlighted: boolean;
}

export const GameItem: React.FC<GameItemProps> = ({ game, onUpdate, isHighlighted }) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isEditingSteamUrl, setIsEditingSteamUrl] = useState(false);
  const [steamUrlInput, setSteamUrlInput] = useState(game.steamUrl || "");

  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const handleNameChange = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value !== game.name) {
      onUpdate(game.id, { name: e.target.value, lastUpdated: new Date().toISOString() });
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(game.id, {
      status: e.target.value as GameStatus,
      lastUpdated: new Date().toISOString()
    });
  };

  const handleSteamUrlClick = () => {
    if (game.steamUrl) {
      window.open(game.steamUrl, '_blank');
    } else {
      setIsEditingSteamUrl(true);
    }
  };

  const handleSteamUrlSave = () => {
    if (steamUrlInput.trim()) {
      onUpdate(game.id, { steamUrl: steamUrlInput.trim() });
    }
    setIsEditingSteamUrl(false);
  };

  const handleSteamUrlCancel = () => {
    setSteamUrlInput(game.steamUrl || "");
    setIsEditingSteamUrl(false);
  };

  return (
    <div
      ref={itemRef}
      className={`game-card ${game.status === 'playing' ? 'playing' : ''} ${isHighlighted ? 'highlight' : ''}`}
      id={`game-${game.id}`}
      style={{
        display: 'flex',
        flexDirection: 'row',
        padding: '0',
        overflow: 'hidden'
      }}
    >
      {game.coverImage ? (
        <img
          src={game.coverImage}
          alt={game.name}
          style={{
            width: '320px',
            minWidth: '320px',
            objectFit: 'cover',
            borderRadius: '8px 0 0 8px',
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          style={{
            width: '320px',
            minWidth: '320px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '8px 0 0 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            color: 'rgba(255, 255, 255, 0.3)',
            fontWeight: 'bold',
          }}
        >
          {game.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div style={{
        flex: 1,
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: 0,
        gap: '0.75rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              className="game-name"
              defaultValue={game.name}
              onBlur={handleNameChange}
              placeholder="Game Name"
              style={{
                width: '100%',
                fontSize: '1rem'
              }}
            />
            {game.positivePercentage !== undefined && game.totalReviews !== undefined && (
              <div style={{
                marginTop: '0.25rem',
                fontSize: '0.8rem',
                color: game.positivePercentage >= 80 ? '#66c0f4' : game.positivePercentage >= 60 ? '#ffa500' : '#999'
              }}>
                好评率-{game.positivePercentage}%({game.totalReviews.toLocaleString()}评论数)
              </div>
            )}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexShrink: 0
          }}>
            <button
              className="btn-steam"
              onClick={handleSteamUrlClick}
              title={game.steamUrl ? "Open Steam Page" : "Add Steam URL"}
              style={{
                color: game.steamUrl ? '#1b8dd4' : '#999',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem 0.5rem'
              }}
            >
              <ExternalLink size={16} />
            </button>
            <select
              className="game-status-select"
              value={game.status}
              onChange={handleStatusChange}
              style={{
                color: `var(--status-${game.status})`,
                padding: '0.5rem 3rem 0.5rem 1rem',
                minWidth: '140px'
              }}
            >
              <option value="playing">Playing</option>
              <option value="pending">Pending</option>
              <option value="completion">Completion</option>
            </select>
          </div>
        </div>

      {isEditingSteamUrl && (
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            className="input-primary"
            placeholder="Enter Steam URL..."
            value={steamUrlInput}
            onChange={(e) => setSteamUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSteamUrlSave();
              if (e.key === 'Escape') handleSteamUrlCancel();
            }}
            autoFocus
            style={{ flex: 1 }}
          />
          <button
            onClick={handleSteamUrlSave}
            style={{
              padding: '0.25rem 0.75rem',
              background: '#1b8dd4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Save
          </button>
          <button
            onClick={handleSteamUrlCancel}
            style={{
              padding: '0.25rem 0.75rem',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      )}
      </div>
    </div>
  );
};
