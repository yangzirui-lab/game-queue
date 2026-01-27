# Game Gallery Windows Server 2019 部署脚本

Write-Host "=== Game Gallery Windows 容器部署脚本 ===" -ForegroundColor Green

# 1. 检查 Docker 服务
Write-Host "`n[1/6] 检查 Docker 服务..." -ForegroundColor Cyan
$dockerService = Get-Service docker -ErrorAction SilentlyContinue
if ($dockerService.Status -ne 'Running') {
    Write-Host "启动 Docker 服务..." -ForegroundColor Yellow
    Start-Service docker
    Start-Sleep -Seconds 3
}
Write-Host "Docker 服务运行正常" -ForegroundColor Green

# 2. 检查环境变量文件
Write-Host "`n[2/6] 检查环境变量配置..." -ForegroundColor Cyan
if (!(Test-Path ".\backend\.env")) {
    Write-Host "未找到 .env 文件，从示例创建..." -ForegroundColor Yellow
    Copy-Item ".\backend\.env.example" ".\backend\.env"
    Write-Host "请编辑 backend\.env 文件，配置您的 STEAM_API_KEY 等信息" -ForegroundColor Red
    notepad .\backend\.env
    Read-Host "配置完成后，按回车继续"
}
Write-Host "环境变量文件存在" -ForegroundColor Green

# 3. 停止旧容器（如果存在）
Write-Host "`n[3/6] 清理旧容器..." -ForegroundColor Cyan
$oldContainer = docker ps -a -q -f name=game-gallery-backend
if ($oldContainer) {
    Write-Host "停止并删除旧容器..." -ForegroundColor Yellow
    docker stop game-gallery-backend 2>$null
    docker rm game-gallery-backend 2>$null
}
Write-Host "清理完成" -ForegroundColor Green

# 4. 构建镜像
Write-Host "`n[4/6] 构建 Windows 容器镜像..." -ForegroundColor Cyan
Write-Host "这可能需要几分钟，请耐心等待..." -ForegroundColor Yellow
docker build -f .\backend\Dockerfile -t game-gallery-backend:windows .\backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "镜像构建失败！" -ForegroundColor Red
    exit 1
}
Write-Host "镜像构建成功" -ForegroundColor Green

# 5. 运行容器
Write-Host "`n[5/6] 启动容器..." -ForegroundColor Cyan
docker run -d `
  -p 8080:8080 `
  --env-file .\backend\.env `
  --name game-gallery-backend `
  --restart unless-stopped `
  game-gallery-backend:windows

if ($LASTEXITCODE -ne 0) {
    Write-Host "容器启动失败！" -ForegroundColor Red
    exit 1
}
Write-Host "容器启动成功" -ForegroundColor Green

# 6. 验证部署
Write-Host "`n[6/6] 验证部署..." -ForegroundColor Cyan
Start-Sleep -Seconds 5
docker ps -f name=game-gallery-backend

Write-Host "`n=== 部署完成 ===" -ForegroundColor Green
Write-Host "后端地址: http://localhost:8080" -ForegroundColor Cyan
Write-Host "健康检查: http://localhost:8080/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "常用命令:" -ForegroundColor Yellow
Write-Host "  查看日志: docker logs game-gallery-backend" -ForegroundColor White
Write-Host "  查看日志(实时): docker logs -f game-gallery-backend" -ForegroundColor White
Write-Host "  停止容器: docker stop game-gallery-backend" -ForegroundColor White
Write-Host "  启动容器: docker start game-gallery-backend" -ForegroundColor White
Write-Host "  重启容器: docker restart game-gallery-backend" -ForegroundColor White
Write-Host "  删除容器: docker rm -f game-gallery-backend" -ForegroundColor White
