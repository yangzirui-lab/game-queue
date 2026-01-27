# Game Gallery 全栈部署脚本 - Windows Server 2019

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("iis", "docker")]
    [string]$FrontendMode = "iis"  # 前端部署方式：iis 或 docker
)

Write-Host "=== Game Gallery 全栈部署 ===" -ForegroundColor Green
Write-Host "后端: Windows 容器" -ForegroundColor Cyan
Write-Host "前端: $FrontendMode" -ForegroundColor Cyan
Write-Host ""

# ============= 部署后端 =============
Write-Host "`n========== 第一部分：部署后端 ==========" -ForegroundColor Magenta

# 1. 检查 Docker 服务
Write-Host "`n[后端 1/5] 检查 Docker 服务..." -ForegroundColor Cyan
$dockerService = Get-Service docker -ErrorAction SilentlyContinue
if ($dockerService.Status -ne 'Running') {
    Start-Service docker
    Start-Sleep -Seconds 3
}
Write-Host "Docker 服务运行正常" -ForegroundColor Green

# 2. 检查后端环境变量
Write-Host "`n[后端 2/5] 检查后端环境变量..." -ForegroundColor Cyan
if (!(Test-Path ".\backend\.env")) {
    Copy-Item ".\backend\.env.example" ".\backend\.env"
    Write-Host "请编辑 backend\.env 文件，配置 STEAM_API_KEY 等信息" -ForegroundColor Red
    notepad .\backend\.env
    Read-Host "配置完成后，按回车继续"
}
Write-Host "后端环境变量配置完成" -ForegroundColor Green

# 3. 停止旧后端容器
Write-Host "`n[后端 3/5] 清理旧容器..." -ForegroundColor Cyan
$oldBackend = docker ps -a -q -f name=game-gallery-backend
if ($oldBackend) {
    docker stop game-gallery-backend 2>$null
    docker rm game-gallery-backend 2>$null
}
Write-Host "清理完成" -ForegroundColor Green

# 4. 构建后端镜像
Write-Host "`n[后端 4/5] 构建后端镜像（Windows 容器）..." -ForegroundColor Cyan
docker build -f .\backend\Dockerfile -t game-gallery-backend:windows .\backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "后端镜像构建失败！" -ForegroundColor Red
    exit 1
}
Write-Host "后端镜像构建成功" -ForegroundColor Green

# 5. 运行后端容器
Write-Host "`n[后端 5/5] 启动后端容器..." -ForegroundColor Cyan
docker run -d `
  -p 8080:8080 `
  --env-file .\backend\.env `
  --name game-gallery-backend `
  --restart unless-stopped `
  game-gallery-backend:windows

if ($LASTEXITCODE -ne 0) {
    Write-Host "后端容器启动失败！" -ForegroundColor Red
    exit 1
}
Write-Host "后端容器启动成功" -ForegroundColor Green

# ============= 部署前端 =============
Write-Host "`n========== 第二部分：部署前端 ==========" -ForegroundColor Magenta

if ($FrontendMode -eq "iis") {
    # IIS 部署方式

    # 1. 检查 Node.js
    Write-Host "`n[前端 1/5] 检查 Node.js..." -ForegroundColor Cyan
    $nodeVersion = node --version 2>$null
    if (!$nodeVersion) {
        Write-Host "未安装 Node.js，无法构建前端" -ForegroundColor Red
        exit 1
    }
    Write-Host "Node.js 版本: $nodeVersion" -ForegroundColor Green

    # 2. 安装依赖
    Write-Host "`n[前端 2/5] 安装前端依赖..." -ForegroundColor Cyan
    cd .\web
    npm install
    cd ..
    Write-Host "依赖安装完成" -ForegroundColor Green

    # 3. 配置环境变量
    Write-Host "`n[前端 3/5] 配置前端环境变量..." -ForegroundColor Cyan
    $backendUrl = Read-Host "请输入后端地址（例如 http://你的服务器IP:8080，或按回车使用 http://localhost:8080）"
    if ([string]::IsNullOrWhiteSpace($backendUrl)) {
        $backendUrl = "http://localhost:8080"
    }
    @"
# 生产环境配置
VITE_API_URL=$backendUrl
"@ | Out-File -FilePath ".\web\.env.production" -Encoding UTF8 -Force
    Write-Host "API 地址已设置为: $backendUrl" -ForegroundColor Green

    # 4. 构建前端
    Write-Host "`n[前端 4/5] 构建前端应用..." -ForegroundColor Cyan
    cd .\web
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "前端构建失败！" -ForegroundColor Red
        exit 1
    }
    cd ..
    Write-Host "前端构建完成" -ForegroundColor Green

    # 5. 部署到 IIS
    Write-Host "`n[前端 5/5] 部署到 IIS..." -ForegroundColor Cyan

    # 安装 IIS（如果未安装）
    $iisInstalled = Get-WindowsFeature Web-Server
    if ($iisInstalled.Installed -eq $false) {
        Write-Host "安装 IIS..." -ForegroundColor Yellow
        Install-WindowsFeature -Name Web-Server -IncludeManagementTools
    }

    # 安装 URL Rewrite 模块（支持 SPA 路由）
    Write-Host "请手动安装 IIS URL Rewrite 模块（如未安装）" -ForegroundColor Yellow
    Write-Host "下载地址: https://www.iis.net/downloads/microsoft/url-rewrite" -ForegroundColor Yellow

    Import-Module WebAdministration
    $siteName = "GameGallery"
    $sitePath = "C:\inetpub\wwwroot\game-gallery"

    # 删除旧站点
    if (Test-Path "IIS:\Sites\$siteName") {
        Remove-WebSite -Name $siteName
    }

    # 创建目录并复制文件
    if (!(Test-Path $sitePath)) {
        New-Item -ItemType Directory -Path $sitePath -Force
    }
    Copy-Item -Path ".\web\dist\*" -Destination $sitePath -Recurse -Force

    # 创建 web.config（支持 Vue Router）
    $webConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="Handle History Mode" stopProcessing="true">
                    <match url="(.*)" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/" />
                </rule>
            </rules>
        </rewrite>
        <staticContent>
            <mimeMap fileExtension=".json" mimeType="application/json" />
            <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
            <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
        </staticContent>
        <httpProtocol>
            <customHeaders>
                <add name="Cache-Control" value="no-cache" />
            </customHeaders>
        </httpProtocol>
    </system.webServer>
</configuration>
"@
    $webConfig | Out-File -FilePath "$sitePath\web.config" -Encoding UTF8

    # 创建 IIS 站点
    New-WebSite -Name $siteName -Port 80 -PhysicalPath $sitePath -Force
    Start-WebSite -Name $siteName

    Write-Host "IIS 部署完成" -ForegroundColor Green

} else {
    # Docker 部署方式（需要 Linux 容器支持）

    Write-Host "`n[前端 1/3] 清理旧容器..." -ForegroundColor Cyan
    $oldFrontend = docker ps -a -q -f name=game-gallery-frontend
    if ($oldFrontend) {
        docker stop game-gallery-frontend 2>$null
        docker rm game-gallery-frontend 2>$null
    }

    Write-Host "`n[前端 2/3] 构建前端镜像（Linux 容器）..." -ForegroundColor Cyan
    docker build -f .\web\Dockerfile -t game-gallery-frontend:latest .\web
    if ($LASTEXITCODE -ne 0) {
        Write-Host "前端镜像构建失败！" -ForegroundColor Red
        exit 1
    }

    Write-Host "`n[前端 3/3] 启动前端容器..." -ForegroundColor Cyan
    docker run -d `
      -p 80:80 `
      --name game-gallery-frontend `
      --restart unless-stopped `
      game-gallery-frontend:latest

    if ($LASTEXITCODE -ne 0) {
        Write-Host "前端容器启动失败！" -ForegroundColor Red
        exit 1
    }
}

# 配置防火墙
Write-Host "`n配置防火墙..." -ForegroundColor Cyan
$httpRule = Get-NetFirewallRule -DisplayName "HTTP" -ErrorAction SilentlyContinue
if (!$httpRule) {
    New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80
}
$backendRule = Get-NetFirewallRule -DisplayName "Game Gallery Backend" -ErrorAction SilentlyContinue
if (!$backendRule) {
    New-NetFirewallRule -DisplayName "Game Gallery Backend" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080
}

# 显示部署信息
Write-Host "`n=== 全栈部署完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "服务状态:" -ForegroundColor Yellow
docker ps --filter "name=game-gallery"
Write-Host ""
Write-Host "访问地址:" -ForegroundColor Cyan
Write-Host "  前端: http://localhost 或 http://你的服务器IP" -ForegroundColor White
Write-Host "  后端: http://localhost:8080 或 http://你的服务器IP:8080" -ForegroundColor White
Write-Host "  健康检查: http://localhost:8080/health" -ForegroundColor White
Write-Host ""
Write-Host "常用命令:" -ForegroundColor Yellow
Write-Host "  查看所有容器: docker ps -a" -ForegroundColor White
Write-Host "  查看后端日志: docker logs game-gallery-backend" -ForegroundColor White
Write-Host "  查看前端日志: docker logs game-gallery-frontend" -ForegroundColor White
Write-Host "  重启后端: docker restart game-gallery-backend" -ForegroundColor White
Write-Host "  重启前端: docker restart game-gallery-frontend" -ForegroundColor White
