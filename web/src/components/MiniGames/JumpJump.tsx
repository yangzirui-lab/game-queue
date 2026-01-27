import React, { useState, useEffect, useCallback, useRef } from 'react'
import Matter from 'matter-js'
import styles from './JumpJump.module.scss'

// 游戏常量
const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 600
const PLAYER_SIZE = 36
const PLATFORM_WIDTH = 80
const PLATFORM_HEIGHT = 16
const MAX_POWER = 250
const CENTER_BONUS_ZONE = 18

interface Platform {
  x: number
  y: number
  width: number
  body?: Matter.Body
}

interface Player {
  body?: Matter.Body
  charging: boolean
  power: number
  onGround: boolean
  lastPlatformIndex: number
}

export const JumpJump: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameStatus, setGameStatus] = useState<'ready' | 'playing' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem('jumpjump-best-score')
    return saved ? parseInt(saved) : 0
  })

  const engineRef = useRef<Matter.Engine | null>(null)
  const playerRef = useRef<Player>({
    charging: false,
    power: 0,
    onGround: false,
    lastPlatformIndex: 0,
  })
  const platformsRef = useRef<Platform[]>([])
  const currentPlatformRef = useRef(0)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const mouseDownRef = useRef(false)
  const comboRef = useRef(0) // 使用 ref 存储 combo，避免依赖

  // 初始化平台
  const initPlatforms = useCallback(() => {
    const platforms: Platform[] = []
    platforms.push({
      x: CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2,
      y: 400,
      width: PLATFORM_WIDTH,
    })

    for (let i = 1; i < 10; i++) {
      const lastPlatform = platforms[i - 1]
      const distance = 100 + Math.random() * 100
      const angle = (Math.random() * 60 - 30) * (Math.PI / 180)

      platforms.push({
        x: lastPlatform.x + Math.cos(angle) * distance,
        y: lastPlatform.y - 80 - Math.random() * 40,
        width: 60 + Math.random() * 40,
      })
    }

    return platforms
  }, [])

  // 初始化物理引擎
  const initPhysics = useCallback(() => {
    // 创建物理引擎
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 0.6 },
    })
    engineRef.current = engine

    // 生成平台
    const platforms = initPlatforms()
    platformsRef.current = platforms

    // 为每个平台创建刚体（使用传感器模式）
    platforms.forEach((platform) => {
      const body = Matter.Bodies.rectangle(
        platform.x + platform.width / 2,
        platform.y + PLATFORM_HEIGHT / 2,
        platform.width,
        PLATFORM_HEIGHT,
        {
          isStatic: true,
          isSensor: true, // 设置为传感器，只检测碰撞不产生物理响应
          label: 'platform',
        }
      )
      platform.body = body
      Matter.World.add(engine.world, body)
    })

    // 创建玩家刚体
    const startPlatform = platforms[0]
    const playerBody = Matter.Bodies.circle(
      startPlatform.x + startPlatform.width / 2,
      startPlatform.y - PLAYER_SIZE / 2,
      PLAYER_SIZE / 2,
      {
        friction: 0.001,
        frictionAir: 0.02, // 空气阻力，模拟原版的 vx *= 0.98
        restitution: 0,
        density: 0.04,
        label: 'player',
      }
    )
    Matter.World.add(engine.world, playerBody)
    playerRef.current.body = playerBody
    playerRef.current.onGround = true
    playerRef.current.lastPlatformIndex = 0

    // 碰撞检测（使用传感器，需要手动控制位置）
    Matter.Events.on(engine, 'collisionStart', (event: Matter.IEventCollision<Matter.Engine>) => {
      event.pairs.forEach((pair: Matter.IPair) => {
        const { bodyA, bodyB } = pair

        // 检查是否是玩家与平台的碰撞
        if (
          (bodyA.label === 'player' && bodyB.label === 'platform') ||
          (bodyB.label === 'player' && bodyA.label === 'platform')
        ) {
          const player = bodyA.label === 'player' ? bodyA : bodyB
          const platform = bodyA.label === 'platform' ? bodyA : bodyB

          // 找到对应的平台索引
          const platformIndex = platformsRef.current.findIndex((p) => p.body === platform)
          const platformData = platformsRef.current[platformIndex]

          // 计算玩家底部和平台顶部的距离
          const playerBottom = player.position.y + PLAYER_SIZE / 2
          const platformTop = platformData.y

          // 只有当玩家从上方落下，且接近平台顶部时才算落地
          if (
            player.velocity.y > 0 &&
            !playerRef.current.onGround &&
            playerBottom >= platformTop - 10 && // 提前一点触发，避免穿透
            playerBottom <= platformTop + 10 &&
            platformIndex > playerRef.current.lastPlatformIndex
          ) {
            // 记录落地瞬间的 X 位置
            const landingX = player.position.x
            const landingY = platformTop - PLAYER_SIZE / 2

            // 立即设置为静态并移动到正确位置
            Matter.Body.setStatic(player, true)
            Matter.Body.setPosition(player, { x: landingX, y: landingY })
            Matter.Body.setVelocity(player, { x: 0, y: 0 })
            Matter.Body.setAngularVelocity(player, 0)

            // 标记为在地面上
            playerRef.current.onGround = true

            // 检查是否落在中心
            const centerX = platformData.x + platformData.width / 2
            const distance = Math.abs(landingX - centerX)

            if (distance <= CENTER_BONUS_ZONE) {
              // 完美落点
              const oldCombo = comboRef.current
              const newCombo = oldCombo + 1
              comboRef.current = newCombo
              setCombo(newCombo)
              setScore((prev) => prev + 2 + oldCombo) // 使用旧的 combo 值计算分数
            } else {
              // 普通落点
              comboRef.current = 0
              setCombo(0)
              setScore((prev) => prev + 1)
            }

            playerRef.current.lastPlatformIndex = platformIndex
            currentPlatformRef.current = platformIndex
            addNewPlatform()
          }
        }
      })
    })

    currentPlatformRef.current = 0
  }, [initPlatforms]) // 移除 combo 依赖，避免重复注册事件

  // 添加新平台
  const addNewPlatform = useCallback(() => {
    if (!engineRef.current) return

    const lastPlatform = platformsRef.current[platformsRef.current.length - 1]
    const distance = 100 + Math.random() * 100
    const angle = (Math.random() * 60 - 30) * (Math.PI / 180)

    const newPlatform: Platform = {
      x: lastPlatform.x + Math.cos(angle) * distance,
      y: lastPlatform.y - 80 - Math.random() * 40,
      width: 60 + Math.random() * 40,
    }

    // 创建物理刚体（传感器模式）
    const body = Matter.Bodies.rectangle(
      newPlatform.x + newPlatform.width / 2,
      newPlatform.y + PLATFORM_HEIGHT / 2,
      newPlatform.width,
      PLATFORM_HEIGHT,
      {
        isStatic: true,
        isSensor: true, // 传感器模式
        label: 'platform',
      }
    )
    newPlatform.body = body
    Matter.World.add(engineRef.current.world, body)

    platformsRef.current.push(newPlatform)

    // 移除旧平台
    if (platformsRef.current.length > 10) {
      const oldPlatform = platformsRef.current.shift()
      if (oldPlatform?.body) {
        Matter.World.remove(engineRef.current.world, oldPlatform.body)
      }
      currentPlatformRef.current--
      playerRef.current.lastPlatformIndex--
    }
  }, [])

  // 初始化游戏
  const initGame = useCallback(() => {
    // 清理旧的物理世界
    if (engineRef.current) {
      Matter.Engine.clear(engineRef.current)
      Matter.World.clear(engineRef.current.world, false)
    }

    initPhysics()
    playerRef.current.charging = false
    playerRef.current.power = 0
    comboRef.current = 0 // 重置 combo ref
    setScore(0)
    setCombo(0)
  }, [initPhysics])

  // 开始游戏
  const startGame = useCallback(() => {
    initGame()
    setGameStatus('playing')
  }, [initGame])

  // 绘制函数
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const player = playerRef.current
    if (!player.body) return

    // 圆角矩形辅助函数
    const drawRoundRect = (x: number, y: number, width: number, height: number, radius: number) => {
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, width, height, radius)
      } else {
        ctx.moveTo(x + radius, y)
        ctx.lineTo(x + width - radius, y)
        ctx.arcTo(x + width, y, x + width, y + radius, radius)
        ctx.lineTo(x + width, y + height - radius)
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius)
        ctx.lineTo(x + radius, y + height)
        ctx.arcTo(x, y + height, x, y + height - radius, radius)
        ctx.lineTo(x, y + radius)
        ctx.arcTo(x, y, x + radius, y, radius)
      }
    }

    // 清空画布
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // 计算相机偏移（跟随玩家）
    const cameraX = player.body.position.x - CANVAS_WIDTH / 2
    const cameraY = player.body.position.y - CANVAS_HEIGHT * 0.7

    // 绘制平台
    platformsRef.current.forEach((platform, index) => {
      const x = platform.x - cameraX
      const y = platform.y - cameraY

      if (x > -100 && x < CANVAS_WIDTH + 100 && y > -50 && y < CANVAS_HEIGHT + 50) {
        const radius = 8

        // 判断平台类型
        const isCurrentPlatform = index === currentPlatformRef.current
        const isNextPlatform = index === currentPlatformRef.current + 1

        // 平台样式（先绘制底层）
        if (isCurrentPlatform) {
          // 当前平台：纯白色
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        } else if (isNextPlatform) {
          // 下一个平台：暗色
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        } else {
          // 其他平台：很暗
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
        }

        // 绘制平台底层
        ctx.beginPath()
        drawRoundRect(x, y, platform.width, PLATFORM_HEIGHT, radius)
        ctx.fill()

        // 绘制中心区域（只在下一个平台显示）
        if (isNextPlatform) {
          // 下一个平台的中心点：亮绿色高亮
          const centerX = x + platform.width / 2
          ctx.fillStyle = 'rgba(34, 197, 94, 0.9)' // 亮绿色
          ctx.shadowColor = 'rgba(34, 197, 94, 0.6)'
          ctx.shadowBlur = 12
          ctx.beginPath()
          drawRoundRect(
            centerX - CENTER_BONUS_ZONE,
            y,
            CENTER_BONUS_ZONE * 2,
            PLATFORM_HEIGHT,
            radius
          )
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }
    })

    // 绘制玩家
    const playerX = player.body.position.x - cameraX
    const playerY = player.body.position.y - cameraY
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(playerX, playerY, PLAYER_SIZE / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.closePath()

    // 绘制蓄力条
    if (player.charging) {
      const barWidth = 50
      const barHeight = 4
      const barX = playerX - barWidth / 2
      const barY = playerY - PLAYER_SIZE - 10

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.fillRect(barX, barY, barWidth, barHeight)

      const powerRatio = player.power / MAX_POWER
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(barX, barY, barWidth * powerRatio, barHeight)
    }

    // 绘制连击数
    if (combo > 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.font = '600 20px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`${combo}x`, CANVAS_WIDTH / 2, 40)
    }
  }, [combo])

  // 游戏主循环
  useEffect(() => {
    if (gameStatus !== 'playing') {
      draw()
      return
    }

    const gameLoop = () => {
      const player = playerRef.current
      const engine = engineRef.current

      if (!player.body || !engine) return

      // 蓄力
      if (player.charging && mouseDownRef.current) {
        player.power = Math.min(player.power + 5, MAX_POWER)
      }

      // 更新物理世界（只在玩家不在地面且不在蓄力时）
      if (!player.charging && !player.onGround) {
        Matter.Engine.update(engine, 1000 / 60)
      }

      // 检查失败（掉落太远）
      if (platformsRef.current.length > 0) {
        const lowestPlatformY = Math.max(...platformsRef.current.map((p) => p.y))
        if (player.body.position.y > lowestPlatformY + CANVAS_HEIGHT / 2) {
          setGameStatus('over')
          if (score > bestScore) {
            setBestScore(score)
            localStorage.setItem('jumpjump-best-score', score.toString())
          }
          return
        }
      }

      draw()
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [gameStatus, draw, score, bestScore, combo])

  // 处理跳跃
  const handleMouseDown = useCallback(() => {
    if (gameStatus !== 'playing') return

    const player = playerRef.current
    if (player.onGround && !player.charging && player.body) {
      player.charging = true
      player.power = 0
      mouseDownRef.current = true

      // 停止物理更新，保持玩家静止
      Matter.Body.setVelocity(player.body, { x: 0, y: 0 })
      Matter.Body.setStatic(player.body, true)
    }
  }, [gameStatus])

  const handleMouseUp = useCallback(() => {
    if (gameStatus !== 'playing') return

    const player = playerRef.current
    if (player.charging && player.body) {
      // 计算跳跃力度
      const angle = -75 * (Math.PI / 180)
      const power = Math.max(player.power / MAX_POWER, 0.3)
      const jumpForce = 6 + power * 9 // 降低跳跃高度

      // 恢复动态状态并施加速度
      Matter.Body.setStatic(player.body, false)
      Matter.Body.setVelocity(player.body, {
        x: Math.cos(angle) * jumpForce,
        y: Math.sin(angle) * jumpForce,
      })

      player.charging = false
      player.power = 0
      player.onGround = false
      mouseDownRef.current = false
    }
  }, [gameStatus])

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameStatus === 'playing') {
        e.preventDefault()
        handleMouseDown()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameStatus === 'playing') {
        e.preventDefault()
        handleMouseUp()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameStatus, handleMouseDown, handleMouseUp])

  // 鼠标/触摸控制
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onMouseDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      handleMouseDown()
    }

    const onMouseUp = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      handleMouseUp()
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('touchstart', onMouseDown)
    canvas.addEventListener('touchend', onMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('touchstart', onMouseDown)
      canvas.removeEventListener('touchend', onMouseUp)
    }
  }, [handleMouseDown, handleMouseUp])

  // 初始化
  useEffect(() => {
    initGame()

    return () => {
      // 清理物理引擎
      if (engineRef.current) {
        Matter.Engine.clear(engineRef.current)
      }
    }
  }, [initGame])

  return (
    <div className={styles.overlay}>
      <div className={styles.gameContainer}>
        <div className={styles.header}>
          <h2>跳一跳</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            ✕
          </button>
        </div>

        <div className={styles.statsBar}>
          <div className={styles.stat}>得分: {score}</div>
          <div className={styles.stat}>最高: {bestScore}</div>
          {combo > 1 && <div className={styles.statCombo}>{combo}x 连击</div>}
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
                <p>长按空格或屏幕蓄力，松开跳跃</p>
                <p className={styles.hint}>落在中心区域获得连击</p>
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
          <p>长按空格或屏幕蓄力，松开跳跃</p>
          <p>落在中心获得连击加分</p>
        </div>
      </div>
    </div>
  )
}
