import React, { useState } from 'react'
import { SnakeGame } from './SnakeGame'
import { Game2048 } from './Game2048'
import { MemoryGame } from './MemoryGame'
import { TowerDefense } from './TowerDefense'
import { Breakout } from './Breakout'
import { FlappyBird } from './FlappyBird'
import { Match3 } from './Match3'
import { JumpJump } from './JumpJump'
import { FruitCatcher } from './FruitCatcher'
import { Sokoban } from './Sokoban'
import { GameIcon } from './GameIcon'
import styles from './index.module.scss'

interface MiniGame {
  id: string
  name: string
  description: string
  color: string
}

const miniGames: MiniGame[] = [
  {
    id: 'snake',
    name: '贪吃蛇',
    description: '经典贪吃蛇游戏，控制蛇吃食物并避免撞墙',
    color: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
  },
  {
    id: '2048',
    name: '2048',
    description: '滑动方块合并相同数字，挑战达到 2048',
    color: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  {
    id: 'memory',
    name: '记忆翻牌',
    description: '翻开卡片找出所有配对，挑战你的记忆力',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'tower',
    name: '塔防',
    description: '建造防御塔抵御敌人，通过三个关卡',
    color: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
  },
  {
    id: 'breakout',
    name: '打砖块',
    description: '经典街机游戏，用挡板接球打碎砖块',
    color: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  },
  {
    id: 'flappy',
    name: 'Flappy Bird',
    description: '点击屏幕控制小鸟飞行，躲避管道障碍',
    color: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  },
  {
    id: 'match3',
    name: '连连看',
    description: '找到相同图案配对消除，挑战你的眼力',
    color: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
  },
  {
    id: 'jump',
    name: '跳一跳',
    description: '长按蓄力跳跃，落在中心获得连击加分',
    color: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
  },
  {
    id: 'fruit',
    name: '接水果',
    description: '控制篮子接住水果得分，躲避炸弹',
    color: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
  },
  {
    id: 'sokoban',
    name: '推箱子',
    description: '经典益智游戏，推动箱子到目标位置',
    color: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
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
                  <div className={styles.gameIcon}>
                    <GameIcon gameId={game.id} color={game.color} />
                  </div>
                  <div className={styles.gameInfo}>
                    <h3 className={styles.gameName}>{game.name}</h3>
                    <p className={styles.gameDescription}>{game.description}</p>
                  </div>
                  <button
                    className={styles.playBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePlayGame(game.id)
                    }}
                  >
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
      {activeGame === 'flappy' && <FlappyBird onClose={handleCloseGame} />}
      {activeGame === 'match3' && <Match3 onClose={handleCloseGame} />}
      {activeGame === 'jump' && <JumpJump onClose={handleCloseGame} />}
      {activeGame === 'fruit' && <FruitCatcher onClose={handleCloseGame} />}
      {activeGame === 'sokoban' && <Sokoban onClose={handleCloseGame} />}
    </>
  )
}
