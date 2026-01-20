import React, { useRef, useEffect, useState } from "react";
import classNames from "classnames";
import type { Game, GameStatus } from "../../types";
import { Trash2 } from "lucide-react";
import styles from "./index.module.scss";

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

  return (
    <div
      ref={itemRef}
      className={classNames(styles.gameCard, {
        [styles.playing]: game.status === 'playing',
        [styles.highlight]: isHighlighted,
      })}
      id={`game-${game.id}`}
    >
      <button
        onClick={() => onDelete(game.id)}
        className={styles.deleteBtnAbsolute}
        title="删除游戏"
      >
        <Trash2 size={16} />
      </button>

      <div className={styles.gameWrapper}>
        {game.coverImage ? (
          <img
            src={game.coverImage}
            alt={game.name}
            className={styles.gameCover}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className={styles.gameCoverPlaceholder}>
            {game.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className={styles.gameContent}>
          <div className={styles.gameHeader}>
            <div className={styles.gameTitleArea}>
              <div className={styles.gameTitleRow}>
                <a
                  href={game.steamUrl || '#'}
                  target={game.steamUrl ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  onClick={(e) => !game.steamUrl && (e.preventDefault(), setIsEditingSteamUrl(true))}
                  className={styles.gameNameLink}
                >
                  {game.name}
                </a>
              </div>
              
              <div className={styles.gameMeta}>
                <div className={styles.metaRow}>
                  {game.positivePercentage !== undefined && game.positivePercentage !== null &&
                   game.totalReviews !== undefined && game.totalReviews !== null ? (
                    <span className={styles.metaRating}>
                      <span className={classNames(styles.ratingPercentage, {
                        [styles.high]: game.positivePercentage >= 80,
                        [styles.medium]: game.positivePercentage >= 60 && game.positivePercentage < 80,
                        [styles.low]: game.positivePercentage < 60
                      })}>
                        {game.positivePercentage}% 好评
                      </span>
                      <span className={styles.reviewCount}>
                        {game.totalReviews?.toLocaleString()} 条评论
                      </span>
                    </span>
                  ) : (
                    <span className={styles.metaRatingLoading}>加载好评率中...</span>
                  )}
                </div>
                {game.releaseDate && (
                  <div className={styles.releaseInfo}>
                    {game.comingSoon ? (
                      <span className={styles.comingSoon}>{game.releaseDate}</span>
                    ) : (
                      <span className={styles.releaseDate}>发布于 {game.releaseDate}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.gameActions}>
              <select
                className={styles.gameStatusSelect}
                value={game.status}
                onChange={handleStatusChange}
                style={{
                  color: `var(--status-${game.status})`
                }}
              >
                <option value="playing">Playing</option>
                <option value="pending">Pending</option>
                <option value="completion">Completion</option>
              </select>
            </div>
          </div>

        {isEditingSteamUrl && (
          <div className={styles.steamUrlEditRow}>
            <input
              type="text"
              className={styles.inputPrimary}
              placeholder="Enter Steam URL..."
              value={steamUrlInput}
              onChange={(e) => setSteamUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSteamUrlSave();
                if (e.key === 'Escape') handleSteamUrlCancel();
              }}
              autoFocus
            />
            <button
              onClick={handleSteamUrlSave}
              className={styles.btnSave}
            >
              Save
            </button>
            <button
              onClick={handleSteamUrlCancel}
              className={styles.btnCancel}
            >
              Cancel
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
