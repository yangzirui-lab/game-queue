import React, { useState, useEffect, useCallback, useRef } from 'react'
import styles from './FlappyBird.module.scss'

// 游戏常量
const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 600
const BIRD_SIZE = 34
const BIRD_X = 80
const GRAVITY = 0.12
const JUMP_STRENGTH = -4.2
const PIPE_WIDTH = 70
const PIPE_GAP = 210
const PIPE_SPEED = 1.3

interface Bird {
  y: number
  velocity: number
}

interface Pipe {
  x: number
  topHeight: number
  passed: boolean
}

export const FlappyBird: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameStatus, setGameStatus] = useState<'ready' | 'playing' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem('flappybird-best-score')
    return saved ? parseInt(saved) : 0
  })

  const birdRef = useRef<Bird>({
    y: CANVAS_HEIGHT / 2,
    velocity: 0,
  })
  const pipesRef = useRef<Pipe[]>([])
  const animationFrameRef = useRef<number | undefined>(undefined)
  const frameCountRef = useRef(0)

  // 初始化游戏
  const initGame = useCallback(() => {
    birdRef.current = {
      y: CANVAS_HEIGHT / 2,
      velocity: 0,
    }
    pipesRef.current = [
      {
        x: CANVAS_WIDTH,
        topHeight: Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 100) + 50,
        passed: false,
      },
    ]
    setScore(0)
    frameCountRef.current = 0
  }, [])

  // 开始游戏
  const startGame = useCallback(() => {
    initGame()
    setGameStatus('playing')
  }, [initGame])

  // 小鸟跳跃
  const jump = useCallback(() => {
    if (gameStatus === 'ready') {
      startGame()
      birdRef.current.velocity = JUMP_STRENGTH
    } else if (gameStatus === 'playing') {
      birdRef.current.velocity = JUMP_STRENGTH
    }
  }, [gameStatus, startGame])

  // 绘制函数
  const draw = useCallback((currentScore?: number, status?: string) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // 绘制管道
    pipesRef.current.forEach((pipe) => {
      // 上管道
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight)
      ctx.strokeStyle = '#166534'
      ctx.lineWidth = 3
      ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight)

      // 下管道
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(
        pipe.x,
        pipe.topHeight + PIPE_GAP,
        PIPE_WIDTH,
        CANVAS_HEIGHT - pipe.topHeight - PIPE_GAP
      )
      ctx.strokeStyle = '#166534'
      ctx.lineWidth = 3
      ctx.strokeRect(
        pipe.x,
        pipe.topHeight + PIPE_GAP,
        PIPE_WIDTH,
        CANVAS_HEIGHT - pipe.topHeight - PIPE_GAP
      )
    })

    // 绘制小鸟 - 极简风格
    const birdCenterX = BIRD_X + BIRD_SIZE / 2
    const birdCenterY = birdRef.current.y

    // 鸟身体（椭圆）
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.ellipse(birdCenterX, birdCenterY, BIRD_SIZE / 2.2, BIRD_SIZE / 2.8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#d97706'
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.closePath()

    // 翅膀（椭圆，稍微倾斜）
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.ellipse(birdCenterX - 2, birdCenterY + 3, BIRD_SIZE / 4.5, BIRD_SIZE / 3.5, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#d97706'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.closePath()

    // 眼睛（白色底）
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(birdCenterX + 6, birdCenterY - 3, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.closePath()

    // 眼珠（黑色）
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(birdCenterX + 7, birdCenterY - 3, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.closePath()

    // 嘴巴（三角形）
    ctx.fillStyle = '#f97316'
    ctx.beginPath()
    ctx.moveTo(birdCenterX + BIRD_SIZE / 2.5, birdCenterY)
    ctx.lineTo(birdCenterX + BIRD_SIZE / 1.5, birdCenterY - 2)
    ctx.lineTo(birdCenterX + BIRD_SIZE / 1.5, birdCenterY + 2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#ea580c'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 绘制分数（在游戏进行时）
    if (status === 'playing' && currentScore !== undefined) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.lineWidth = 4
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'center'
      ctx.strokeText(currentScore.toString(), CANVAS_WIDTH / 2, 80)
      ctx.fillText(currentScore.toString(), CANVAS_WIDTH / 2, 80)
    }
  }, [])

  // 碰撞检测
  const checkCollision = useCallback(() => {
    const bird = birdRef.current

    // 检测边界
    if (bird.y - BIRD_SIZE / 2 <= 0 || bird.y + BIRD_SIZE / 2 >= CANVAS_HEIGHT) {
      return true
    }

    // 检测管道碰撞
    for (const pipe of pipesRef.current) {
      const birdLeft = BIRD_X
      const birdRight = BIRD_X + BIRD_SIZE
      const pipeLeft = pipe.x
      const pipeRight = pipe.x + PIPE_WIDTH

      // 检测水平重叠
      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        // 检测垂直碰撞
        const birdTop = bird.y - BIRD_SIZE / 2
        const birdBottom = bird.y + BIRD_SIZE / 2
        const gapTop = pipe.topHeight
        const gapBottom = pipe.topHeight + PIPE_GAP

        if (birdTop < gapTop || birdBottom > gapBottom) {
          return true
        }
      }
    }

    return false
  }, [])

  // 游戏主循环
  useEffect(() => {
    if (gameStatus !== 'playing') {
      draw(score, gameStatus)
      return
    }

    let currentScore = score
    const gameLoop = () => {
      const bird = birdRef.current

      // 更新小鸟
      bird.velocity += GRAVITY
      bird.y += bird.velocity

      // 更新管道
      frameCountRef.current++
      if (frameCountRef.current % 150 === 0) {
        pipesRef.current.push({
          x: CANVAS_WIDTH,
          topHeight: Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 150) + 75,
          passed: false,
        })
      }

      pipesRef.current.forEach((pipe) => {
        pipe.x -= PIPE_SPEED

        // 计分
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.passed = true
          currentScore++
          setScore(currentScore)
        }
      })

      // 移除离开屏幕的管道
      pipesRef.current = pipesRef.current.filter((pipe) => pipe.x > -PIPE_WIDTH)

      // 碰撞检测
      if (checkCollision()) {
        setGameStatus('over')
        if (currentScore > bestScore) {
          setBestScore(currentScore)
          localStorage.setItem('flappybird-best-score', currentScore.toString())
        }
        return
      }

      draw(currentScore, 'playing')
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [gameStatus, draw, checkCollision, score, bestScore])

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        jump()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [jump])

  // 鼠标控制
  const handleClick = () => {
    jump()
  }

  // 触摸控制
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    jump()
  }

  // 重新开始
  const restart = () => {
    initGame()
    setGameStatus('ready')
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.gameContainer}>
        <div className={styles.header}>
          <h2>Flappy Bird</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            ✕
          </button>
        </div>

        <div className={styles.statsBar}>
          <div className={styles.stat}>得分: {score}</div>
          <div className={styles.stat}>最高: {bestScore}</div>
        </div>

        <div className={styles.gameBoard}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className={styles.canvas}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
          />

          {gameStatus === 'ready' && (
            <div className={styles.messageOverlay}>
              <div className={styles.message}>
                <h3>🐦 准备起飞</h3>
                <p>触摸/点击屏幕或按空格键开始</p>
                <div className={styles.hintBox}>
                  <p className={styles.hint}>💡 持续触摸/点击保持飞行高度</p>
                  <p className={styles.hint}>💡 通过绿色管道间隙得分</p>
                </div>
              </div>
            </div>
          )}

          {gameStatus === 'over' && (
            <div className={styles.messageOverlay}>
              <div className={styles.message}>
                <h3>游戏结束</h3>
                <div className={styles.scoreBox}>
                  <p className={styles.finalScore}>
                    本次得分: <strong>{score}</strong>
                  </p>
                  <p className={styles.bestScoreText}>
                    最高分: <strong>{bestScore}</strong>
                  </p>
                </div>
                {score === bestScore && score > 0 && <p className={styles.congrats}>🎉 新纪录！</p>}
                <button onClick={restart} className={styles.btn}>
                  再来一次
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.instructions}>
          <p>🎮 触摸/点击屏幕或按空格键控制小鸟飞行</p>
          <p>🏆 通过管道间隙获得分数，挑战更高纪录</p>
        </div>
      </div>
    </div>
  )
}
