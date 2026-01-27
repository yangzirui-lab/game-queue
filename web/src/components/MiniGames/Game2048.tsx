import React, { useState, useEffect, useCallback } from 'react'
import styles from './Game2048.module.scss'

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Board = number[][]

const GRID_SIZE = 4

export const Game2048: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [board, setBoard] = useState<Board>(() => initializeBoard())
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [gameWon, setGameWon] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [mergedTiles, setMergedTiles] = useState<Set<string>>(new Set())
  const [newTiles, setNewTiles] = useState<Set<string>>(new Set())

  function initializeBoard(): Board {
    const newBoard = Array(GRID_SIZE)
      .fill(0)
      .map(() => Array(GRID_SIZE).fill(0))
    addRandomTile(newBoard)
    addRandomTile(newBoard)
    return newBoard
  }

  function addRandomTile(board: Board): string | null {
    const emptyCells: [number, number][] = []
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (board[i][j] === 0) {
          emptyCells.push([i, j])
        }
      }
    }
    if (emptyCells.length > 0) {
      const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)]
      board[row][col] = Math.random() < 0.9 ? 2 : 4
      return `${row}-${col}`
    }
    return null
  }

  function move(
    board: Board,
    direction: Direction
  ): { newBoard: Board; moved: boolean; scoreGained: number; mergedPositions: Set<string> } {
    const newBoard = board.map((row) => [...row])
    let moved = false
    let scoreGained = 0
    const mergedPositions = new Set<string>()

    const moveLeft = (
      row: number[],
      rowIndex: number,
      isVertical: boolean
    ): { row: number[]; score: number } => {
      const filtered = row.filter((val) => val !== 0)
      let score = 0
      const merged: number[] = []
      let mergeIndex = 0

      for (let i = 0; i < filtered.length; i++) {
        if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
          merged.push(filtered[i] * 2)
          score += filtered[i] * 2
          // 记录合并位置
          if (isVertical) {
            mergedPositions.add(`${mergeIndex}-${rowIndex}`)
          } else {
            mergedPositions.add(`${rowIndex}-${mergeIndex}`)
          }
          mergeIndex++
          i++
        } else {
          merged.push(filtered[i])
          mergeIndex++
        }
      }

      while (merged.length < GRID_SIZE) {
        merged.push(0)
      }

      return { row: merged, score }
    }

    if (direction === 'LEFT') {
      for (let i = 0; i < GRID_SIZE; i++) {
        const { row: newRow, score } = moveLeft(newBoard[i], i, false)
        if (JSON.stringify(newRow) !== JSON.stringify(newBoard[i])) {
          moved = true
        }
        newBoard[i] = newRow
        scoreGained += score
      }
    } else if (direction === 'RIGHT') {
      for (let i = 0; i < GRID_SIZE; i++) {
        const reversed = [...newBoard[i]].reverse()
        const { row: newRow, score } = moveLeft(reversed, i, false)
        const finalRow = newRow.reverse()
        if (JSON.stringify(finalRow) !== JSON.stringify(newBoard[i])) {
          moved = true
        }
        // 需要调整合并位置的列索引（因为是反转的）
        const tempMerged = new Set<string>()
        mergedPositions.forEach((pos) => {
          const [row, col] = pos.split('-').map(Number)
          if (row === i) {
            tempMerged.add(`${row}-${GRID_SIZE - 1 - col}`)
            mergedPositions.delete(pos)
          } else {
            tempMerged.add(pos)
          }
        })
        tempMerged.forEach((pos) => mergedPositions.add(pos))
        newBoard[i] = finalRow
        scoreGained += score
      }
    } else if (direction === 'UP') {
      for (let j = 0; j < GRID_SIZE; j++) {
        const column = newBoard.map((row) => row[j])
        const { row: newColumn, score } = moveLeft(column, j, true)
        if (JSON.stringify(newColumn) !== JSON.stringify(column)) {
          moved = true
        }
        for (let i = 0; i < GRID_SIZE; i++) {
          newBoard[i][j] = newColumn[i]
        }
        scoreGained += score
      }
    } else if (direction === 'DOWN') {
      for (let j = 0; j < GRID_SIZE; j++) {
        const column = newBoard.map((row) => row[j]).reverse()
        const { row: newColumn, score } = moveLeft(column, j, true)
        const finalColumn = newColumn.reverse()
        if (JSON.stringify(finalColumn) !== JSON.stringify(newBoard.map((row) => row[j]))) {
          moved = true
        }
        // 需要调整合并位置的行索引（因为是反转的）
        const tempMerged = new Set<string>()
        mergedPositions.forEach((pos) => {
          const [row, col] = pos.split('-').map(Number)
          if (col === j) {
            tempMerged.add(`${GRID_SIZE - 1 - row}-${col}`)
            mergedPositions.delete(pos)
          } else {
            tempMerged.add(pos)
          }
        })
        tempMerged.forEach((pos) => mergedPositions.add(pos))
        for (let i = 0; i < GRID_SIZE; i++) {
          newBoard[i][j] = finalColumn[i]
        }
        scoreGained += score
      }
    }

    return { newBoard, moved, scoreGained, mergedPositions }
  }

  function isGameOver(board: Board): boolean {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (board[i][j] === 0) return false
        if (j < GRID_SIZE - 1 && board[i][j] === board[i][j + 1]) return false
        if (i < GRID_SIZE - 1 && board[i][j] === board[i + 1][j]) return false
      }
    }
    return true
  }

  function hasWon(board: Board): boolean {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (board[i][j] === 2048) return true
      }
    }
    return false
  }

  const handleMove = useCallback(
    (direction: Direction) => {
      if (gameOver || !gameStarted) return

      const { newBoard, moved, scoreGained, mergedPositions } = move(board, direction)

      if (moved) {
        const newTilePos = addRandomTile(newBoard)
        setBoard(newBoard)
        setScore((prev) => prev + scoreGained)

        // 设置合并动画
        setMergedTiles(mergedPositions)
        // 设置新方块动画
        if (newTilePos) {
          setNewTiles(new Set([newTilePos]))
        }

        // 200ms后清除新方块标记（与tileAppear动画时长一致）
        setTimeout(() => {
          setNewTiles(new Set())
        }, 200)

        // 300ms后清除合并标记（与tileMerge动画时长一致）
        setTimeout(() => {
          setMergedTiles(new Set())
        }, 300)

        if (hasWon(newBoard) && !gameWon) {
          setGameWon(true)
        }

        if (isGameOver(newBoard)) {
          setGameOver(true)
        }
      }
    },
    [board, gameOver, gameStarted, gameWon]
  )

  const handleRestart = () => {
    setBoard(initializeBoard())
    setScore(0)
    setGameOver(false)
    setGameWon(false)
    setGameStarted(true)
    setMergedTiles(new Set())
    setNewTiles(new Set())
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted && e.key === ' ') {
        e.preventDefault()
        setGameStarted(true)
        return
      }

      if (gameOver) return

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          handleMove('UP')
          break
        case 'ArrowDown':
          e.preventDefault()
          handleMove('DOWN')
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleMove('LEFT')
          break
        case 'ArrowRight':
          e.preventDefault()
          handleMove('RIGHT')
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleMove, gameOver, gameStarted])

  const getTileColor = (value: number): string => {
    const colors: Record<number, string> = {
      2: '#eee4da',
      4: '#ede0c8',
      8: '#f2b179',
      16: '#f59563',
      32: '#f67c5f',
      64: '#f65e3b',
      128: '#edcf72',
      256: '#edcc61',
      512: '#edc850',
      1024: '#edc53f',
      2048: '#edc22e',
    }
    return colors[value] || '#cdc1b4'
  }

  const getTileTextColor = (value: number): string => {
    return value <= 4 ? '#776e65' : '#f9f6f2'
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.gameContainer}>
        <div className={styles.header}>
          <h2>2048</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            ✕
          </button>
        </div>

        <div className={styles.scoreBoard}>
          <div className={styles.score}>得分: {score}</div>
          <button onClick={handleRestart} className={styles.restartBtn}>
            重新开始
          </button>
        </div>

        <div className={styles.board}>
          {board.map((row, i) =>
            row.map((value, j) => {
              const tileKey = `${i}-${j}`
              const isMerged = mergedTiles.has(tileKey)
              const isNew = newTiles.has(tileKey)

              // 只有新生成的方块才有.filled动画，合并的方块只有.merged动画
              const tileClasses = [styles.tile, isNew && styles.filled, isMerged && styles.merged]
                .filter(Boolean)
                .join(' ')

              // 根据数字大小调整字体
              const getFontSize = (val: number) => {
                if (val === 0) return '2rem'
                const digits = val.toString().length
                if (digits <= 3) return '2rem'
                if (digits === 4) return '1.75rem'
                if (digits === 5) return '1.5rem'
                return '1.25rem'
              }

              return (
                <div
                  key={tileKey}
                  className={tileClasses}
                  style={{
                    backgroundColor:
                      value !== 0 ? getTileColor(value) : 'rgba(238, 228, 218, 0.35)',
                    color: getTileTextColor(value),
                    fontSize: getFontSize(value),
                  }}
                >
                  {value !== 0 && value}
                </div>
              )
            })
          )}

          {!gameStarted && (
            <div className={styles.messageOverlay}>
              <div className={styles.message}>
                <h3>2048</h3>
                <p>使用方向键移动方块</p>
                <p>相同数字的方块会合并</p>
                <p>按空格键开始游戏</p>
              </div>
            </div>
          )}

          {gameWon && !gameOver && (
            <div className={styles.messageOverlay}>
              <div className={styles.message}>
                <h3>你赢了！</h3>
                <p>达到了 2048！</p>
                <button onClick={() => setGameWon(false)} className={styles.continueBtn}>
                  继续游戏
                </button>
              </div>
            </div>
          )}

          {gameOver && (
            <div className={styles.messageOverlay}>
              <div className={styles.message}>
                <h3>游戏结束</h3>
                <p>最终得分: {score}</p>
                <button onClick={handleRestart} className={styles.restartBtn}>
                  重新开始
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.controls}>
          <div className={styles.instructions}>
            <p>🎮 方向键: 移动方块</p>
            <p>⏸️ 空格键: 开始游戏</p>
          </div>
        </div>
      </div>
    </div>
  )
}
