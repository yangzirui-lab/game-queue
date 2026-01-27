import React, { useState } from 'react'
import { SnakeGame } from './SnakeGame'
import { Game2048 } from './Game2048'
import { MemoryGame } from './MemoryGame'
import { TowerDefense } from './TowerDefense'
import { Breakout } from './Breakout'
import styles from './index.module.scss'

interface MiniGame {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

const miniGames: MiniGame[] = [
  {
    id: 'snake',
    name: '贪吃蛇',
    description: '经典贪吃蛇游戏，控制蛇吃食物并避免撞墙',
    icon: '🐍',
    color: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
  },
  {
    id: '2048',
    name: '2048',
    description: '滑动方块合并相同数字，挑战达到 2048',
    icon: '🎯',
    color: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  {
    id: 'memory',
    name: '记忆翻牌',
    description: '翻开卡片找出所有配对，挑战你的记忆力',
    icon: '🧠',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'tower',
    name: '塔防',
    description: '建造防御塔抵御敌人，通过三个关卡',
    icon: '🗼',
    color: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
  },
  {
    id: 'breakout',
    name: '打砖块',
    description: '经典街机游戏，用挡板接球打碎砖块',
    icon: '🧱',
    color: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  },
]

interface MiniGamesProps {
  onClose: () => void
}

export const MiniGames: React.FC<MiniGamesProps> = ({ onClose: _onClose }) => {
  const [activeGame, setActiveGame] = useState<string | null>(null)

  const handlePlayGame = (gameId: string) => {
    setActiveGame(gameId)
  }

  const handleCloseGame = () => {
    setActiveGame(null)
  }

  return (
    <>
      <div className={styles.playgroundContainer}>
        <div className={styles.gamesSection}>
          <div className={styles.gamesGrid}>
            {miniGames.map((game) => (
              <div
                key={game.id}
                className={styles.gameCard}
                onClick={() => handlePlayGame(game.id)}
              >
                <div className={styles.cardInner}>
                  <div className={styles.gameIcon}>{game.icon}</div>
                  <div className={styles.gameInfo}>
                    <h3 className={styles.gameName}>{game.name}</h3>
                    <p className={styles.gameDescription}>{game.description}</p>
                  </div>
                  <button className={styles.playBtn} onClick={(e) => { e.stopPropagation(); handlePlayGame(game.id) }}>
                    开始游戏 <span className={styles.playIcon}>▶</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {activeGame === 'snake' && <SnakeGame onClose={handleCloseGame} />}
      {activeGame === '2048' && <Game2048 onClose={handleCloseGame} />}
      {activeGame === 'memory' && <MemoryGame onClose={handleCloseGame} />}
      {activeGame === 'tower' && <TowerDefense onClose={handleCloseGame} />}
      {activeGame === 'breakout' && <Breakout onClose={handleCloseGame} />}
    </>
  )
}
