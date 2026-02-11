#!/usr/bin/env tsx

/**
 * 游戏数据迁移脚本
 * 从 GitHub games.json 迁移到后端数据库
 */

import { githubService } from '../services/github'
import { migrateFromGitHub } from '../utils/dataMigration'

// 配置
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const USERNAME = process.env.API_USERNAME || 'admin'
const PASSWORD = process.env.API_PASSWORD || ''

async function main() {
  console.log('=== 游戏数据迁移工具 ===\n')

  // 1. 检查环境变量
  if (!GITHUB_TOKEN) {
    console.error('❌ 错误：缺少 GITHUB_TOKEN 环境变量')
    console.log('使用方法：GITHUB_TOKEN=ghp_xxx API_PASSWORD=xxx npm run migrate')
    process.exit(1)
  }

  if (!PASSWORD) {
    console.error('❌ 错误：缺少 API_PASSWORD 环境变量')
    console.log('使用方法：GITHUB_TOKEN=ghp_xxx API_PASSWORD=xxx npm run migrate')
    process.exit(1)
  }

  // 2. 配置 GitHub
  console.log('📝 配置 GitHub...')
  githubService.saveConfig({
    token: GITHUB_TOKEN,
    owner: 'catalyzer-dot',
    repo: 'game-gallery',
  })

  // 3. 测试 GitHub 连接
  console.log('🔗 测试 GitHub 连接...')
  const githubConnected = await githubService.testConnection()
  if (!githubConnected) {
    console.error('❌ GitHub 连接失败，请检查 Token')
    process.exit(1)
  }
  console.log('✅ GitHub 连接成功\n')

  // 4. 登录后端
  console.log('🔐 登录后端...')
  const { login } = await import('../services/auth')
  const user = await login({ username: USERNAME, password: PASSWORD })

  if (!user) {
    console.error('❌ 登录失败，请检查用户名和密码')
    process.exit(1)
  }
  console.log(`✅ 登录成功: ${user.username}\n`)

  // 5. 开始迁移
  console.log('🚀 开始迁移...\n')
  const result = await migrateFromGitHub((current, total, gameName) => {
    console.log(`[${current}/${total}] ${gameName}`)
  })

  // 6. 显示结果
  console.log('\n=== 迁移结果 ===')
  console.log(`总计: ${result.totalGames} 个游戏`)
  console.log(`✅ 成功: ${result.migratedGames} 个`)
  console.log(`❌ 失败: ${result.failedGames} 个`)
  console.log(`⏭️  跳过: ${result.skippedGames} 个`)

  if (result.errors.length > 0) {
    console.log('\n错误详情:')
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`)
    })
  }

  if (result.success) {
    console.log('\n🎉 迁移完成！')
    process.exit(0)
  } else {
    console.log('\n⚠️  迁移部分失败，请查看错误详情')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('💥 迁移过程中发生错误:', error)
  process.exit(1)
})
