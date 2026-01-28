# Windows Server 2019 Deployment Setup Script
# Please run this script as Administrator

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Game Gallery Windows Server Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Install IIS
Write-Host "[1/5] Installing IIS..." -ForegroundColor Yellow
$iisInstalled = Get-WindowsFeature -Name Web-Server | Select-Object -ExpandProperty Installed
if (-not $iisInstalled) {
    Install-WindowsFeature -name Web-Server -IncludeManagementTools
    Write-Host "OK IIS installed successfully" -ForegroundColor Green
} else {
    Write-Host "OK IIS already installed" -ForegroundColor Green
}

# 2. Install OpenSSH Server
Write-Host "[2/5] Configuring OpenSSH Server..." -ForegroundColor Yellow
$sshCapability = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
if ($sshCapability.State -ne "Installed") {
    Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
    Write-Host "OK OpenSSH Server installed successfully" -ForegroundColor Green
} else {
    Write-Host "OK OpenSSH Server already installed" -ForegroundColor Green
}

# Start and set to automatic startup
Start-Service sshd -ErrorAction SilentlyContinue
Set-Service -Name sshd -StartupType 'Automatic'
Write-Host "OK OpenSSH Server started and set to automatic" -ForegroundColor Green

# 3. Configure Firewall
Write-Host "[3/5] Configuring firewall rules..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -Name "sshd" -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
    Write-Host "OK Firewall rule added (Port 22)" -ForegroundColor Green
} else {
    Write-Host "OK Firewall rule already exists (Port 22)" -ForegroundColor Green
}

# HTTP Port 80
$httpRule = Get-NetFirewallRule -DisplayName "HTTP (Port 80)" -ErrorAction SilentlyContinue
if (-not $httpRule) {
    New-NetFirewallRule -DisplayName "HTTP (Port 80)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
    Write-Host "OK Firewall rule added (Port 80)" -ForegroundColor Green
} else {
    Write-Host "OK Firewall rule already exists (Port 80)" -ForegroundColor Green
}

# 4. Create website directory
Write-Host "[4/5] Creating website directory..." -ForegroundColor Yellow
$webPath = "C:\inetpub\wwwroot\game-gallery"
if (-not (Test-Path $webPath)) {
    New-Item -ItemType Directory -Path $webPath -Force | Out-Null
    Write-Host "OK Website directory created: $webPath" -ForegroundColor Green
} else {
    Write-Host "OK Website directory already exists: $webPath" -ForegroundColor Green
}

# Set directory permissions (allow IIS access)
$acl = Get-Acl $webPath
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($rule)
Set-Acl $webPath $acl
Write-Host "OK Directory permissions configured" -ForegroundColor Green

# 5. Create IIS website
Write-Host "[5/5] Configuring IIS website..." -ForegroundColor Yellow
Import-Module WebAdministration

$siteName = "game-gallery"
$existingSite = Get-Website -Name $siteName -ErrorAction SilentlyContinue

if ($existingSite) {
    Write-Host "! Website '$siteName' already exists, updating configuration..." -ForegroundColor Yellow
    Set-ItemProperty "IIS:\Sites\$siteName" -Name physicalPath -Value $webPath
    Set-ItemProperty "IIS:\Sites\$siteName" -Name serverAutoStart -Value $true
} else {
    # Stop default website to avoid port conflict
    Stop-Website -Name "Default Web Site" -ErrorAction SilentlyContinue

    # Create new website
    New-Website -Name $siteName -Port 80 -PhysicalPath $webPath -Force | Out-Null
    Write-Host "OK IIS website created: $siteName" -ForegroundColor Green
}

Start-Website -Name $siteName
Write-Host "OK Website started" -ForegroundColor Green

# Display configuration information
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Website Name: $siteName" -ForegroundColor White
Write-Host "Website Path: $webPath" -ForegroundColor White
Write-Host "Access Port: 80" -ForegroundColor White
Write-Host "SSH Port: 22" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Configure the following Secrets in your GitHub repository:"
Write-Host "   - WINDOWS_SERVER_HOST: $(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notmatch 'Loopback'} | Select-Object -First 1 -ExpandProperty IPAddress)" -ForegroundColor Cyan
Write-Host "   - WINDOWS_SERVER_USERNAME: $env:USERNAME" -ForegroundColor Cyan
Write-Host "   - WINDOWS_SERVER_PASSWORD: [your password]" -ForegroundColor Cyan
Write-Host "   - DEPLOY_PATH: $webPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Push code to main branch, GitHub Actions will deploy automatically" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Visit website: http://$(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notmatch 'Loopback'} | Select-Object -First 1 -ExpandProperty IPAddress)" -ForegroundColor Yellow
Write-Host ""
