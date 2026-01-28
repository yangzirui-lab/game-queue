# Deploy from dist branch
# This script pulls pre-built files from the dist branch and deploys to IIS
# Run this script on the server as Administrator

param(
    [string]$IISPath = "C:\inetpub\wwwroot\game-gallery",
    [string]$TempPath = "C:\Temp\game-gallery-deploy"
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Deploy from dist branch" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "WARNING: Not running as Administrator. This may cause permission issues." -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Create temp directory
Write-Host "[1/4] Preparing temporary directory..." -ForegroundColor Yellow
if (Test-Path $TempPath) {
    Remove-Item -Path $TempPath -Recurse -Force
}
New-Item -ItemType Directory -Path $TempPath -Force | Out-Null
Write-Host "OK Temp directory ready: $TempPath" -ForegroundColor Green

# Step 2: Clone dist branch
Write-Host ""
Write-Host "[2/4] Downloading files from dist branch..." -ForegroundColor Yellow
try {
    Set-Location $TempPath
    git clone --branch dist --depth 1 https://github.com/yangzirui-lab/game-gallery.git .
    Write-Host "OK Files downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to download files: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Deploy to IIS
Write-Host ""
Write-Host "[3/4] Deploying to IIS..." -ForegroundColor Yellow

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
        Start-Sleep -Seconds 2
    }

    # Copy files
    Write-Host "Copying files to IIS directory..." -ForegroundColor Cyan
    Copy-Item -Path "$TempPath\*" -Destination $IISPath -Recurse -Force
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

# Step 4: Restart IIS website and cleanup
Write-Host ""
Write-Host "[4/4] Finalizing..." -ForegroundColor Yellow

try {
    if ($website) {
        Start-Website -Name $siteName
        Write-Host "OK Website started: $siteName" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Website '$siteName' not found in IIS" -ForegroundColor Yellow
        Write-Host "Please create the website manually" -ForegroundColor Yellow
    }
} catch {
    Write-Host "WARNING: Failed to restart website: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Cleanup
Write-Host "Cleaning up temporary files..." -ForegroundColor Cyan
Set-Location C:\
Remove-Item -Path $TempPath -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "OK Cleanup completed" -ForegroundColor Green

# Display deployment info
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IIS Path: $IISPath" -ForegroundColor White
Write-Host "Build Source: dist branch (latest)" -ForegroundColor White
Write-Host ""

$serverIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notmatch 'Loopback'} | Select-Object -First 1 -ExpandProperty IPAddress
Write-Host "Visit your website: http://$serverIP" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: To deploy the latest changes:" -ForegroundColor Cyan
Write-Host "1. Push your code to main branch" -ForegroundColor White
Write-Host "2. Wait for GitHub Actions to build (check: https://github.com/yangzirui-lab/game-gallery/actions)" -ForegroundColor White
Write-Host "3. Run this script again" -ForegroundColor White
Write-Host ""
