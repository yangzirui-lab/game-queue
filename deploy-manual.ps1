# Manual Deployment Script for Windows Server
# Run this script on the server to deploy the latest version
# Please run this script as Administrator

param(
    [string]$RepoPath = "C:\Users\Administrator\code\game-gallery",
    [string]$IISPath = "C:\inetpub\wwwroot\game-gallery",
    [string]$Branch = "main"
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Game Gallery Manual Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "WARNING: Not running as Administrator. This may cause permission issues." -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Navigate to repository
Write-Host "[1/5] Checking repository..." -ForegroundColor Yellow
if (-not (Test-Path $RepoPath)) {
    Write-Host "ERROR: Repository not found at $RepoPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please clone the repository first:" -ForegroundColor Yellow
    Write-Host "  git clone https://github.com/yangzirui-lab/game-gallery.git $RepoPath" -ForegroundColor Cyan
    exit 1
}

Set-Location $RepoPath
Write-Host "OK Repository found: $RepoPath" -ForegroundColor Green

# Step 2: Pull latest code
Write-Host ""
Write-Host "[2/5] Pulling latest code from GitHub..." -ForegroundColor Yellow
try {
    git fetch origin
    git checkout $Branch
    git pull origin $Branch
    Write-Host "OK Code updated successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to pull code: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Install dependencies and build
Write-Host ""
Write-Host "[3/5] Building frontend..." -ForegroundColor Yellow
$webPath = Join-Path $RepoPath "web"

if (-not (Test-Path $webPath)) {
    Write-Host "ERROR: Web directory not found: $webPath" -ForegroundColor Red
    exit 1
}

Set-Location $webPath

try {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
    Write-Host "OK Dependencies installed" -ForegroundColor Green

    Write-Host "Building project for IIS (base path: /)..." -ForegroundColor Cyan
    $env:VITE_BASE_PATH = "/"
    npm run build
    Write-Host "OK Build completed" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Deploy to IIS
Write-Host ""
Write-Host "[4/5] Deploying to IIS..." -ForegroundColor Yellow

$distPath = Join-Path $webPath "dist"
if (-not (Test-Path $distPath)) {
    Write-Host "ERROR: Build output not found: $distPath" -ForegroundColor Red
    exit 1
}

# Create IIS directory if not exists
if (-not (Test-Path $IISPath)) {
    New-Item -ItemType Directory -Path $IISPath -Force | Out-Null
    Write-Host "OK Created IIS directory: $IISPath" -ForegroundColor Green
}

try {
    # Stop website before copying
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    $siteName = "game-gallery"
    $website = Get-Website -Name $siteName -ErrorAction SilentlyContinue

    if ($website) {
        Stop-Website -Name $siteName -ErrorAction SilentlyContinue
        Write-Host "Stopped website: $siteName" -ForegroundColor Cyan
    }

    # Copy files
    Write-Host "Copying files to IIS directory..." -ForegroundColor Cyan
    Copy-Item -Path "$distPath\*" -Destination $IISPath -Recurse -Force
    Write-Host "OK Files deployed to: $IISPath" -ForegroundColor Green

    # Create web.config for SPA routing
    Write-Host "Creating web.config for SPA routing..." -ForegroundColor Cyan
    $webConfigContent = @'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="React Routes" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/" />
                </rule>
            </rules>
        </rewrite>
        <httpErrors errorMode="Custom" existingResponse="Replace">
            <remove statusCode="404" />
            <error statusCode="404" path="/" responseMode="ExecuteURL" />
        </httpErrors>
    </system.webServer>
</configuration>
'@
    $webConfigContent | Out-File -FilePath "$IISPath\web.config" -Encoding UTF8 -Force
    Write-Host "OK web.config created" -ForegroundColor Green

} catch {
    Write-Host "ERROR: Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Restart IIS website
Write-Host ""
Write-Host "[5/5] Restarting IIS website..." -ForegroundColor Yellow

try {
    if ($website) {
        Start-Website -Name $siteName
        Write-Host "OK Website started: $siteName" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Website '$siteName' not found in IIS" -ForegroundColor Yellow
        Write-Host "Please create the website manually or run setup-windows-server.ps1" -ForegroundColor Yellow
    }
} catch {
    Write-Host "WARNING: Failed to restart website: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Display deployment info
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Repository: $RepoPath" -ForegroundColor White
Write-Host "Branch: $Branch" -ForegroundColor White
Write-Host "IIS Path: $IISPath" -ForegroundColor White
Write-Host ""

$serverIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notmatch 'Loopback'} | Select-Object -First 1 -ExpandProperty IPAddress
Write-Host "Visit your website: http://$serverIP" -ForegroundColor Yellow
Write-Host ""
