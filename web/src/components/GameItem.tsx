import React, { useRef, useEffect, useState } from "react";
import type { Game, GameStatus } from "../types";
import { Trash2 } from "lucide-react";

interface GameItemProps {
  game: Game;
  onUpdate: (id: string, updates: Partial<Game>) => void;
  onDelete: (id: string) => void;
  isHighlighted: boolean;
}

export const GameItem: React.FC<GameItemProps> = ({ game, onUpdate, onDelete, isHighlighted }) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isEditingSteamUrl, setIsEditingSteamUrl] = useState(false);
  const [steamUrlInput, setSteamUrlInput] = useState(game.steamUrl || "");

  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(game.id, {
      status: e.target.value as GameStatus,
      lastUpdated: new Date().toISOString()
    });
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

  // 将 Steam web URL 转换为客户端 URL
  const getSteamClientUrl = (steamUrl: string | undefined): string => {
    if (!steamUrl) return '#';

    // 从 URL 中提取 appId
    const match = steamUrl.match(/\/app\/(\d+)/);
    if (match && match[1]) {
      return `steam://store/${match[1]}`;
    }

    // 如果提取失败，返回原始 URL
    return steamUrl;
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
        overflow: 'hidden',
        position: 'relative',
        width: '100%'
      }}
    >
      <button
        onClick={() => onDelete(game.id)}
        className="delete-btn-absolute"
        title="删除游戏"
      >
        <Trash2 size={16} />
      </button>

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
        padding: '1rem 0.75rem 1rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: 0,
        gap: '0.75rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <a
                href={getSteamClientUrl(game.steamUrl)}
                onClick={(e) => !game.steamUrl && (e.preventDefault(), setIsEditingSteamUrl(true))}
                className="game-name-link"
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: game.steamUrl ? 'pointer' : 'default'
                }}
              >
                {game.name}
              </a>
            </div>
            
            {(game.positivePercentage !== undefined && game.totalReviews !== undefined) || game.steamUrl ? (
              <div style={{
                marginTop: '0.25rem',
                fontSize: '0.8rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center'
              }}>
                {game.positivePercentage !== undefined && (
                   <span style={{ 
                     color: game.positivePercentage >= 80 ? '#66c0f4' : game.positivePercentage >= 60 ? '#ffa500' : '#999'
                   }}>
                    好评率-{game.positivePercentage}%({game.totalReviews?.toLocaleString()}评论数)
                  </span>
                )}
              </div>
            ) : null}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexShrink: 0
          }}>
            <select
              className="game-status-select"
              value={game.status}
              onChange={handleStatusChange}
              style={{
                color: `var(--status-${game.status})`,
                padding: '0.5rem 1rem',
                paddingRight: '2.5rem',
                minWidth: '140px',
                backgroundPosition: 'right 0.75rem center'
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
