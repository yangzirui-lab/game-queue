import React, { useState, useEffect, useCallback, useRef } from 'react'
import styles from './FruitCatcher.module.scss'

// 游戏常量
const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 600
const BASKET_WIDTH = 80
const BASKET_HEIGHT = 60
const ITEM_SIZE = 40
const BASKET_SPEED = 10
const INITIAL_FALL_SPEED = 3
const SPAWN_INTERVAL = 1000 // 毫秒

type ItemType =
  | 'apple'
  | 'banana'
  | 'orange'
  | 'grape'
  | 'watermelon'
  | 'star'
  | 'bomb'
  | 'freeze'
  | 'double'

interface FallingItem {
  id: number
  x: number
  y: number
  type: ItemType
  emoji: string
  speed: number
  isSpecial?: boolean
}

const FRUITS = [
  { type: 'apple' as const, emoji: '🍎', points: 10, weight: 3 },
  { type: 'banana' as const, emoji: '🍌', points: 15, weight: 3 },
  { type: 'orange' as const, emoji: '🍊', points: 10, weight: 3 },
  { type: 'grape' as const, emoji: '🍇', points: 20, weight: 2 },
  { type: 'watermelon' as const, emoji: '🍉', points: 30, weight: 1 },
]

const SPECIAL_ITEMS = [
  { type: 'star' as const, emoji: '⭐', description: '黄金水果 +50分' },
  { type: 'freeze' as const, emoji: '❄️', description: '时间减速' },
  { type: 'double' as const, emoji: '✨', description: '双倍得分' },
]

export const FruitCatcher: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameStatus, setGameStatus] = useState<'ready' | 'playing' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [combo, setCombo] = useState(0)
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem('fruitcatcher-best-score')
    return saved ? parseInt(saved) : 0
  })

  const basketXRef = useRef(CANVAS_WIDTH / 2 - BASKET_WIDTH / 2)
  const itemsRef = useRef<FallingItem[]>([])
  const nextItemIdRef = useRef(0)
  const lastSpawnTimeRef = useRef(0)
  const keysRef = useRef<{ [key: string]: boolean }>({})
  const animationFrameRef = useRef<number | undefined>(undefined)
  const comboRef = useRef(0)
  const doubleScoreRef = useRef(false)
  const doubleScoreEndTimeRef = useRef(0)
  const freezeEndTimeRef = useRef(0)
  const gameStartTimeRef = useRef(0)
  const [doubleScoreActive, setDoubleScoreActive] = useState(false)
  const [freezeActive, setFreezeActive] = useState(false)

  // 生成掉落物品
  const spawnItem = useCallback((timestamp: number) => {
    const rand = Math.random()
    const difficulty = Math.min(1 + (timestamp - gameStartTimeRef.current) / 30000, 2.5) // 难度随时间增加

    let item: FallingItem

    // 15% 特殊道具
    if (rand < 0.15) {
      const special = SPECIAL_ITEMS[Math.floor(Math.random() * SPECIAL_ITEMS.length)]
      item = {
        id: nextItemIdRef.current++,
        x: Math.random() * (CANVAS_WIDTH - ITEM_SIZE),
        y: -ITEM_SIZE,
        type: special.type,
        emoji: special.emoji,
        speed: INITIAL_FALL_SPEED * difficulty * 0.8,
        isSpecial: true,
      }
    }
    // 20% 炸弹
    else if (rand < 0.35) {
      item = {
        id: nextItemIdRef.current++,
        x: Math.random() * (CANVAS_WIDTH - ITEM_SIZE),
        y: -ITEM_SIZE,
        type: 'bomb',
        emoji: '💣',
        speed: INITIAL_FALL_SPEED * difficulty,
      }
    }
    // 65% 普通水果（使用权重）
    else {
      const totalWeight = FRUITS.reduce((sum, f) => sum + f.weight, 0)
      let random = Math.random() * totalWeight
      let selectedFruit = FRUITS[0]

      for (const fruit of FRUITS) {
        random -= fruit.weight
        if (random <= 0) {
          selectedFruit = fruit
          break
        }
      }

      item = {
        id: nextItemIdRef.current++,
        x: Math.random() * (CANVAS_WIDTH - ITEM_SIZE),
        y: -ITEM_SIZE,
        type: selectedFruit.type,
        emoji: selectedFruit.emoji,
        speed: INITIAL_FALL_SPEED * difficulty,
      }
    }

    itemsRef.current.push(item)
  }, [])

  // 碰撞检测
  const checkCollision = useCallback((item: FallingItem) => {
    const basketLeft = basketXRef.current
    const basketRight = basketXRef.current + BASKET_WIDTH
    const basketTop = CANVAS_HEIGHT - BASKET_HEIGHT

    const itemLeft = item.x
    const itemRight = item.x + ITEM_SIZE
    const itemBottom = item.y + ITEM_SIZE

    return (
      itemBottom >= basketTop &&
      itemBottom <= CANVAS_HEIGHT &&
      itemRight > basketLeft &&
      itemLeft < basketRight
    )
  }, [])

  // 绘制函数
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // 绘制背景
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    gradient.addColorStop(0, '#87ceeb')
    gradient.addColorStop(1, '#e0f6ff')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // 绘制篮子
    const basketX = basketXRef.current
    const basketY = CANVAS_HEIGHT - BASKET_HEIGHT

    // 篮子主体 - 使用圆弧底部
    ctx.fillStyle = 'rgba(160, 82, 45, 0.95)'
    ctx.beginPath()
    ctx.moveTo(basketX + 5, basketY + 10)
    ctx.lineTo(basketX, basketY + BASKET_HEIGHT - 15)
    ctx.quadraticCurveTo(
      basketX + BASKET_WIDTH / 2,
      basketY + BASKET_HEIGHT + 5,
      basketX + BASKET_WIDTH,
      basketY + BASKET_HEIGHT - 15
    )
    ctx.lineTo(basketX + BASKET_WIDTH - 5, basketY + 10)
    ctx.lineTo(basketX + 5, basketY + 10)
    ctx.closePath()
    ctx.fill()

    // 篮子顶部边缘 - 深色
    ctx.fillStyle = 'rgba(101, 67, 33, 0.9)'
    ctx.beginPath()
    ctx.ellipse(
      basketX + BASKET_WIDTH / 2,
      basketY + 10,
      BASKET_WIDTH / 2 - 5,
      8,
      0,
      0,
      Math.PI * 2
    )
    ctx.fill()

    // 篮子编织纹理 - 竖条纹
    ctx.strokeStyle = 'rgba(101, 67, 33, 0.4)'
    ctx.lineWidth = 2
    for (let i = 1; i < 6; i++) {
      const x = basketX + i * (BASKET_WIDTH / 6)
      ctx.beginPath()
      ctx.moveTo(x, basketY + 15)
      ctx.lineTo(x, basketY + BASKET_HEIGHT - 10)
      ctx.stroke()
    }

    // 篮子轮廓
    ctx.strokeStyle = 'rgba(101, 67, 33, 0.8)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(basketX + 5, basketY + 10)
    ctx.lineTo(basketX, basketY + BASKET_HEIGHT - 15)
    ctx.quadraticCurveTo(
      basketX + BASKET_WIDTH / 2,
      basketY + BASKET_HEIGHT + 5,
      basketX + BASKET_WIDTH,
      basketY + BASKET_HEIGHT - 15
    )
    ctx.lineTo(basketX + BASKET_WIDTH - 5, basketY + 10)
    ctx.stroke()

    // 绘制掉落物品
    itemsRef.current.forEach((item) => {
      const centerX = item.x + ITEM_SIZE / 2
      const centerY = item.y + ITEM_SIZE / 2
      const radius = ITEM_SIZE * 0.4

      if (item.type === 'bomb') {
        // 炸弹 - 黑色圆形
        ctx.fillStyle = '#1a1a1a'
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.fill()

        // 引信
        ctx.strokeStyle = '#8b7355'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(centerX, centerY - radius)
        ctx.lineTo(centerX, centerY - radius - 8)
        ctx.stroke()
      } else if (item.type === 'star') {
        // 星星 - 黄色五角星
        ctx.fillStyle = '#fbbf24'
        ctx.shadowColor = '#fbbf24'
        ctx.shadowBlur = 8
        ctx.beginPath()
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.shadowBlur = 0
      } else if (item.type === 'freeze') {
        // 冰冻 - 蓝色雪花
        ctx.strokeStyle = '#60a5fa'
        ctx.lineWidth = 3
        ctx.shadowColor = '#60a5fa'
        ctx.shadowBlur = 6

        // 十字
        ctx.beginPath()
        ctx.moveTo(centerX, centerY - radius)
        ctx.lineTo(centerX, centerY + radius)
        ctx.moveTo(centerX - radius, centerY)
        ctx.lineTo(centerX + radius, centerY)

        // 对角线
        const diagR = radius * 0.7
        ctx.moveTo(centerX - diagR, centerY - diagR)
        ctx.lineTo(centerX + diagR, centerY + diagR)
        ctx.moveTo(centerX + diagR, centerY - diagR)
        ctx.lineTo(centerX - diagR, centerY + diagR)
        ctx.stroke()
        ctx.shadowBlur = 0
      } else if (item.type === 'double') {
        // 双倍 - 紫色钻石
        ctx.fillStyle = '#a855f7'
        ctx.shadowColor = '#a855f7'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.moveTo(centerX, centerY - radius)
        ctx.lineTo(centerX + radius * 0.6, centerY)
        ctx.lineTo(centerX, centerY + radius)
        ctx.lineTo(centerX - radius * 0.6, centerY)
        ctx.closePath()
        ctx.fill()
        ctx.shadowBlur = 0
      } else {
        // 水果 - 圆形，根据类型设置颜色
        let color = '#ef4444'
        if (item.type === 'banana') color = '#fbbf24'
        else if (item.type === 'orange') color = '#fb923c'
        else if (item.type === 'grape') color = '#a855f7'
        else if (item.type === 'watermelon') color = '#22c55e'

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.fill()

        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.beginPath()
        ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.3, 0, Math.PI * 2)
        ctx.fill()

        // 叶子/茎
        if (item.type !== 'banana') {
          ctx.strokeStyle = '#22c55e'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(centerX, centerY - radius)
          ctx.lineTo(centerX, centerY - radius - 5)
          ctx.stroke()
        }
      }
    })
  }, [])

  // 游戏主循环
  useEffect(() => {
    if (gameStatus !== 'playing') {
      draw()
      return
    }

    const gameLoop = (timestamp: number) => {
      // 移动篮子
      if (keysRef.current['ArrowLeft'] || keysRef.current['a']) {
        basketXRef.current = Math.max(0, basketXRef.current - BASKET_SPEED)
      }
      if (keysRef.current['ArrowRight'] || keysRef.current['d']) {
        basketXRef.current = Math.min(
          CANVAS_WIDTH - BASKET_WIDTH,
          basketXRef.current + BASKET_SPEED
        )
      }

      // 生成新物品
      const currentSpawnInterval =
        freezeEndTimeRef.current > timestamp ? SPAWN_INTERVAL * 1.5 : SPAWN_INTERVAL
      if (timestamp - lastSpawnTimeRef.current > currentSpawnInterval) {
        spawnItem(timestamp)
        lastSpawnTimeRef.current = timestamp
      }

      // 检查并更新增益状态
      if (doubleScoreEndTimeRef.current > 0 && timestamp > doubleScoreEndTimeRef.current) {
        doubleScoreRef.current = false
        doubleScoreEndTimeRef.current = 0
        setDoubleScoreActive(false)
      }
      if (freezeEndTimeRef.current > 0 && timestamp > freezeEndTimeRef.current) {
        freezeEndTimeRef.current = 0
        setFreezeActive(false)
      }

      // 更新物品位置
      const speedMultiplier = freezeEndTimeRef.current > timestamp ? 0.5 : 1
      itemsRef.current = itemsRef.current.filter((item) => {
        item.y += item.speed * speedMultiplier

        // 检查碰撞
        if (checkCollision(item)) {
          if (item.type === 'bomb') {
            // 炸弹 - 失去生命
            setLives((prev) => {
              const newLives = prev - 1
              if (newLives <= 0) {
                setGameStatus('over')
                if (score > bestScore) {
                  setBestScore(score)
                  localStorage.setItem('fruitcatcher-best-score', score.toString())
                }
              }
              return newLives
            })
            comboRef.current = 0
            setCombo(0)
          } else if (item.type === 'star') {
            // 星星 - 50分
            const points = 50 * (doubleScoreRef.current ? 2 : 1)
            setScore((prev) => prev + points)
            comboRef.current += 1
            setCombo(comboRef.current)
          } else if (item.type === 'freeze') {
            // 冰冻 - 减速5秒
            freezeEndTimeRef.current = timestamp + 5000
            setFreezeActive(true)
            comboRef.current += 1
            setCombo(comboRef.current)
          } else if (item.type === 'double') {
            // 双倍 - 10秒双倍得分
            doubleScoreRef.current = true
            doubleScoreEndTimeRef.current = timestamp + 10000
            setDoubleScoreActive(true)
            comboRef.current += 1
            setCombo(comboRef.current)
          } else {
            // 普通水果
            const fruit = FRUITS.find((f) => f.type === item.type)
            const basePoints = fruit?.points || 10
            const comboBonus = Math.floor(comboRef.current * 0.5)
            const points = (basePoints + comboBonus) * (doubleScoreRef.current ? 2 : 1)
            setScore((prev) => prev + points)
            comboRef.current += 1
            setCombo(comboRef.current)
          }
          return false // 移除该物品
        }

        // 移除掉出屏幕的物品
        if (item.y > CANVAS_HEIGHT) {
          // 水果掉落没接到，重置连击
          if (item.type !== 'bomb' && !item.isSpecial) {
            comboRef.current = 0
            setCombo(0)
          }
          return false
        }

        return true
      })

      draw()
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [gameStatus, draw, checkCollision, spawnItem, score, bestScore])

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) {
        e.preventDefault()
        keysRef.current[e.key] = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) {
        e.preventDefault()
        keysRef.current[e.key] = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // 鼠标/触摸控制
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (gameStatus !== 'playing') return

      const rect = canvas.getBoundingClientRect()
      let clientX: number

      if (e instanceof MouseEvent) {
        clientX = e.clientX
      } else {
        clientX = e.touches[0].clientX
      }

      const x = clientX - rect.left
      basketXRef.current = Math.max(0, Math.min(CANVAS_WIDTH - BASKET_WIDTH, x - BASKET_WIDTH / 2))
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('touchmove', handleMouseMove)

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('touchmove', handleMouseMove)
    }
  }, [gameStatus])

  // 开始游戏
  const startGame = useCallback(() => {
    basketXRef.current = CANVAS_WIDTH / 2 - BASKET_WIDTH / 2
    itemsRef.current = []
    nextItemIdRef.current = 0
    lastSpawnTimeRef.current = 0
    keysRef.current = {}
    comboRef.current = 0
    doubleScoreRef.current = false
    doubleScoreEndTimeRef.current = 0
    freezeEndTimeRef.current = 0
    gameStartTimeRef.current = performance.now()
    setScore(0)
    setLives(3)
    setCombo(0)
    setDoubleScoreActive(false)
    setFreezeActive(false)
    setGameStatus('playing')
  }, [])

  return (
    <div className={styles.overlay}>
      <div className={styles.gameContainer}>
        <div className={styles.header}>
          <h2>接水果</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            ✕
          </button>
        </div>

        <div className={styles.statsBar}>
          <div className={styles.stat}>得分: {score}</div>
          <div className={styles.stat}>
            {lives > 0 ? (
              <div className={styles.lives}>
                {Array.from({ length: lives }).map((_, i) => (
                  <div key={i} className={styles.heart}></div>
                ))}
              </div>
            ) : (
              <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>×</span>
            )}
          </div>
          <div className={styles.stat}>最高: {bestScore}</div>
          {combo > 0 && <div className={styles.stat}>连击: {combo}x</div>}
        </div>

        <div className={styles.buffsBar}>
          {doubleScoreActive && <div className={styles.buff}>✨ 双倍得分</div>}
          {freezeActive && <div className={styles.buff}>❄️ 时间减速</div>}
        </div>

        <div className={styles.gameBoard}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className={styles.canvas}
          />

          {gameStatus === 'ready' && (
            <div className={styles.messageOverlay}>
              <div className={styles.message}>
                <h3>准备开始</h3>
                <p>使用方向键或鼠标移动篮子</p>
                <p className={styles.hint}>接住水果得分，躲避炸弹💣</p>
                <p className={styles.hint}>⭐黄金水果 ❄️时间减速 ✨双倍得分</p>
                <button onClick={startGame} className={styles.btn}>
                  开始游戏
                </button>
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
                {score === bestScore && score > 0 && <p className={styles.congrats}>新纪录</p>}
                <button onClick={startGame} className={styles.btn}>
                  再来一次
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.instructions}>
          <p>方向键或鼠标移动篮子 | 接住水果得分，躲避炸弹💣</p>
          <p>特殊道具: ⭐+50分 | ❄️减速 | ✨双倍 | 连续接住累积连击奖励</p>
        </div>
      </div>
    </div>
  )
}
