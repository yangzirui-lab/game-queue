import React, { useState, useEffect, useCallback } from 'react'
import styles from './Sokoban.module.scss'

// 游戏常量
const TILE_SIZE = 40
const EMPTY = 0
const WALL = 1
const TARGET = 2
const BOX = 3

interface Position {
  x: number
  y: number
}

interface GameState {
  grid: number[][]
  playerPos: Position
  boxes: Position[]
  moves: number
  pushes: number
}

// 关卡数据
const LEVELS = [
  {
    name: '入门',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 2, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
    playerStart: { x: 3, y: 5 },
  },
  {
    name: '初级',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 3, 0, 0, 3, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 2, 0, 0, 2, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
    playerStart: { x: 3, y: 6 },
  },
  {
    name: '中级',
    grid: [
      [0, 0, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 0, 0, 0, 1, 0],
      [0, 0, 1, 3, 0, 0, 1, 0],
      [0, 1, 1, 0, 0, 3, 1, 1],
      [0, 1, 0, 3, 0, 0, 2, 1],
      [1, 1, 0, 0, 1, 2, 2, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
    playerStart: { x: 4, y: 6 },
  },
  {
    name: '高级',
    grid: [
      [0, 1, 1, 1, 1, 1, 0, 0],
      [0, 1, 0, 0, 0, 1, 1, 1],
      [1, 1, 3, 0, 3, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 3, 0, 3, 1, 0, 1],
      [1, 1, 2, 2, 2, 2, 0, 1],
      [0, 1, 0, 0, 0, 0, 0, 1],
      [0, 1, 1, 1, 1, 1, 1, 1],
    ],
    playerStart: { x: 3, y: 6 },
  },
]

export const Sokoban: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [currentLevel, setCurrentLevel] = useState(0)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [history, setHistory] = useState<GameState[]>([])
  const [isComplete, setIsComplete] = useState(false)

  // 初始化关卡
  const initLevel = useCallback((levelIndex: number) => {
    const level = LEVELS[levelIndex]
    const grid = level.grid.map((row) => [...row])
    const boxes: Position[] = []

    // 找出所有箱子的位置
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === BOX) {
          boxes.push({ x, y })
          grid[y][x] = EMPTY
        }
      }
    }

    const newState: GameState = {
      grid,
      playerPos: { ...level.playerStart },
      boxes,
      moves: 0,
      pushes: 0,
    }

    setGameState(newState)
    setHistory([newState])
    setIsComplete(false)
  }, [])

  useEffect(() => {
    initLevel(currentLevel)
  }, [currentLevel, initLevel])

  // 检查是否完成
  const checkWin = useCallback((state: GameState) => {
    return state.boxes.every((box) => {
      return state.grid[box.y][box.x] === TARGET
    })
  }, [])

  // 移动玩家
  const movePlayer = useCallback(
    (dx: number, dy: number) => {
      if (!gameState || isComplete) return

      const newX = gameState.playerPos.x + dx
      const newY = gameState.playerPos.y + dy

      // 检查边界
      if (
        newY < 0 ||
        newY >= gameState.grid.length ||
        newX < 0 ||
        newX >= gameState.grid[0].length
      ) {
        return
      }

      // 检查墙壁
      if (gameState.grid[newY][newX] === WALL) {
        return
      }

      // 检查是否推箱子
      const boxIndex = gameState.boxes.findIndex((box) => box.x === newX && box.y === newY)

      if (boxIndex !== -1) {
        // 箱子存在，检查能否推动
        const newBoxX = newX + dx
        const newBoxY = newY + dy

        // 检查箱子新位置
        if (
          newBoxY < 0 ||
          newBoxY >= gameState.grid.length ||
          newBoxX < 0 ||
          newBoxX >= gameState.grid[0].length
        ) {
          return
        }

        // 检查箱子新位置是否有墙或其他箱子
        if (gameState.grid[newBoxY][newBoxX] === WALL) {
          return
        }

        if (gameState.boxes.some((box) => box.x === newBoxX && box.y === newBoxY)) {
          return
        }

        // 推箱子
        const newBoxes = [...gameState.boxes]
        newBoxes[boxIndex] = { x: newBoxX, y: newBoxY }

        const newState: GameState = {
          ...gameState,
          playerPos: { x: newX, y: newY },
          boxes: newBoxes,
          moves: gameState.moves + 1,
          pushes: gameState.pushes + 1,
        }

        setGameState(newState)
        setHistory([...history, newState])

        // 检查是否完成
        if (checkWin(newState)) {
          setIsComplete(true)
        }
      } else {
        // 普通移动
        const newState: GameState = {
          ...gameState,
          playerPos: { x: newX, y: newY },
          moves: gameState.moves + 1,
        }

        setGameState(newState)
        setHistory([...history, newState])
      }
    },
    [gameState, history, isComplete, checkWin]
  )

  // 撤销
  const undo = useCallback(() => {
    if (history.length <= 1) return

    const newHistory = [...history]
    newHistory.pop()
    const previousState = newHistory[newHistory.length - 1]

    setGameState(previousState)
    setHistory(newHistory)
    setIsComplete(false)
  }, [history])

  // 重置关卡
  const resetLevel = useCallback(() => {
    initLevel(currentLevel)
  }, [currentLevel, initLevel])

  // 下一关
  const nextLevel = useCallback(() => {
    if (currentLevel < LEVELS.length - 1) {
      setCurrentLevel(currentLevel + 1)
    } else {
      setCurrentLevel(0)
    }
  }, [currentLevel])

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault()
        switch (e.key) {
          case 'ArrowUp':
          case 'w':
            movePlayer(0, -1)
            break
          case 'ArrowDown':
          case 's':
            movePlayer(0, 1)
            break
          case 'ArrowLeft':
          case 'a':
            movePlayer(-1, 0)
            break
          case 'ArrowRight':
          case 'd':
            movePlayer(1, 0)
            break
        }
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        undo()
      } else if (e.key === 'r') {
        e.preventDefault()
        resetLevel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [movePlayer, undo, resetLevel])

  // 渲染格子
  const renderTile = (tile: number, x: number, y: number) => {
    const isPlayer = gameState && gameState.playerPos.x === x && gameState.playerPos.y === y
    const hasBox = gameState && gameState.boxes.some((box) => box.x === x && box.y === y)
    const isTarget = tile === TARGET
    const onTarget = hasBox && isTarget

    let className = styles.tile
    if (tile === WALL) className += ` ${styles.wall}`
    else if (isTarget) className += ` ${styles.target}`

    return (
      <div
        key={`${x}-${y}`}
        className={className}
        style={{
          width: TILE_SIZE,
          height: TILE_SIZE,
          left: x * TILE_SIZE,
          top: y * TILE_SIZE,
        }}
      >
        {isPlayer && <div className={styles.player}></div>}
        {hasBox && <div className={onTarget ? styles.boxOnTarget : styles.box}></div>}
      </div>
    )
  }

  if (!gameState) return null

  const gridWidth = gameState.grid[0].length * TILE_SIZE
  const gridHeight = gameState.grid.length * TILE_SIZE

  return (
    <div className={styles.overlay}>
      <div className={styles.gameContainer}>
        <div className={styles.header}>
          <h2>推箱子</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            ✕
          </button>
        </div>

        <div className={styles.statsBar}>
          <div className={styles.stat}>关卡: {LEVELS[currentLevel].name}</div>
          <div className={styles.stat}>步数: {gameState.moves}</div>
          <div className={styles.stat}>推动: {gameState.pushes}</div>
        </div>

        <div className={styles.gameBoard}>
          <div
            className={styles.grid}
            style={{
              width: gridWidth,
              height: gridHeight,
            }}
          >
            {gameState.grid.map((row, y) => row.map((tile, x) => renderTile(tile, x, y)))}
          </div>

          {isComplete && (
            <div className={styles.messageOverlay}>
              <div className={styles.message}>
                <h3>关卡完成！🎉</h3>
                <div className={styles.scoreBox}>
                  <p>步数: {gameState.moves}</p>
                  <p>推动次数: {gameState.pushes}</p>
                </div>
                <div className={styles.btnGroup}>
                  <button onClick={resetLevel} className={styles.btn}>
                    重玩
                  </button>
                  {currentLevel < LEVELS.length - 1 ? (
                    <button onClick={nextLevel} className={styles.btn}>
                      下一关
                    </button>
                  ) : (
                    <button onClick={() => setCurrentLevel(0)} className={styles.btn}>
                      重新开始
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.controls}>
          <button onClick={undo} className={styles.controlBtn} disabled={history.length <= 1}>
            ↶ 撤销
          </button>
          <button onClick={resetLevel} className={styles.controlBtn}>
            🔄 重置
          </button>
          <div className={styles.levelSelector}>
            {LEVELS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentLevel(index)}
                className={`${styles.levelBtn} ${index === currentLevel ? styles.active : ''}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.instructions}>
          <p>方向键或WASD移动 | 推动所有箱子📦到目标点🎯</p>
          <p>Ctrl+Z撤销 | R重置关卡</p>
        </div>
      </div>
    </div>
  )
}
