import React from 'react'
import styles from './GameIcon.module.scss'

interface GameIconProps {
  gameId: string
  color: string
}

export const GameIcon: React.FC<GameIconProps> = ({ gameId, color }) => {
  const renderIcon = () => {
    switch (gameId) {
      case 'snake':
        return (
          <div className={styles.snakeIcon}>
            <div className={styles.snakeBody}></div>
            <div className={styles.snakeHead}></div>
          </div>
        )
      case '2048':
        return (
          <div className={styles.grid2048}>
            <div className={styles.tile}></div>
            <div className={styles.tile}></div>
            <div className={styles.tile}></div>
            <div className={styles.tile}></div>
          </div>
        )
      case 'memory':
        return (
          <div className={styles.memoryIcon}>
            <div className={styles.card}></div>
            <div className={styles.card}></div>
          </div>
        )
      case 'tower':
        return (
          <div className={styles.towerIcon}>
            <div className={styles.towerTop}></div>
            <div className={styles.towerMid}></div>
            <div className={styles.towerBase}></div>
          </div>
        )
      case 'breakout':
        return (
          <div className={styles.breakoutIcon}>
            <div className={styles.bricks}>
              <div className={styles.brick}></div>
              <div className={styles.brick}></div>
              <div className={styles.brick}></div>
            </div>
            <div className={styles.paddle}></div>
            <div className={styles.ball}></div>
          </div>
        )
      case 'flappy':
        return (
          <div className={styles.flappyIcon}>
            <div className={styles.bird}></div>
            <div className={styles.wing}></div>
          </div>
        )
      case 'match3':
        return (
          <div className={styles.match3Icon}>
            <div className={styles.gem}></div>
            <div className={styles.gem}></div>
            <div className={styles.gem}></div>
          </div>
        )
      case 'jump':
        return (
          <div className={styles.jumpIcon}>
            <div className={styles.platform}></div>
            <div className={styles.jumper}></div>
            <div className={styles.arc}></div>
          </div>
        )
      case 'fruit':
        return (
          <div className={styles.fruitIcon}>
            <div className={styles.basket}></div>
            <div className={styles.fruit}></div>
          </div>
        )
      case 'sokoban':
        return (
          <div className={styles.sokobanIcon}>
            <div className={styles.box}></div>
            <div className={styles.target}></div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={styles.iconWrapper} style={{ background: color }}>
      {renderIcon()}
    </div>
  )
}
