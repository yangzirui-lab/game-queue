# Network Access Diagnostic Script
# Run this on Windows Server to check external access configuration

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Network Access Diagnostic" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Get all IP addresses
Write-Host "[1/4] Server IP Addresses:" -ForegroundColor Yellow
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notmatch 'Loopback'}

foreach ($ip in $ipAddresses) {
    $ipType = if ($ip.IPAddress -match "^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\.") {
        "Private IP"
    } else {
        "Public IP"
    }
    Write-Host "  $($ip.IPAddress) - $ipType ($($ip.InterfaceAlias))" -ForegroundColor $(if ($ipType -eq "Public IP") { 'Green' } else { 'Cyan' })
}

# 2. Check Windows Firewall
Write-Host ""
Write-Host "[2/4] Windows Firewall Status:" -ForegroundColor Yellow

$firewallProfiles = Get-NetFirewallProfile
foreach ($profile in $firewallProfiles) {
    Write-Host "  $($profile.Name): $($profile.Enabled)" -ForegroundColor White
}

$httpRule = Get-NetFirewallRule -DisplayName "HTTP (Port 80)" -ErrorAction SilentlyContinue
if ($httpRule) {
    Write-Host "  HTTP Rule (Port 80): Enabled=$($httpRule.Enabled), Action=$($httpRule.Action)" -ForegroundColor Green
} else {
    Write-Host "  WARNING: No HTTP rule found!" -ForegroundColor Red
}

# 3. Check listening ports
Write-Host ""
Write-Host "[3/4] Port 80 Status:" -ForegroundColor Yellow

$port80 = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue
if ($port80) {
    Write-Host "  OK Port 80 is listening on all interfaces" -ForegroundColor Green
    Write-Host "  Process: $(Get-Process -Id $port80.OwningProcess | Select-Object -ExpandProperty Name)" -ForegroundColor White
} else {
    Write-Host "  ERROR: Port 80 is not listening!" -ForegroundColor Red
}

# 4. Try to get public IP
Write-Host ""
Write-Host "[4/4] Detecting Public IP:" -ForegroundColor Yellow

try {
    $publicIP = (Invoke-WebRequest -Uri "http://ifconfig.me/ip" -UseBasicParsing -TimeoutSec 5).Content.Trim()
    Write-Host "  Public IP detected: $publicIP" -ForegroundColor Green
} catch {
    Write-Host "  Could not detect public IP automatically" -ForegroundColor Yellow
    $publicIP = $null
}

# Summary and Instructions
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Access Information" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Local Access (on this server):" -ForegroundColor Green
Write-Host "  http://localhost" -ForegroundColor White
Write-Host ""

$privateIPs = $ipAddresses | Where-Object {$_.IPAddress -match "^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\."}
if ($privateIPs) {
    Write-Host "Local Network Access (same LAN only):" -ForegroundColor Yellow
    foreach ($ip in $privateIPs) {
        Write-Host "  http://$($ip.IPAddress)" -ForegroundColor White
    }
    Write-Host ""
}

if ($publicIP) {
    Write-Host "Internet Access (if security group is configured):" -ForegroundColor Green
    Write-Host "  http://$publicIP" -ForegroundColor White
    Write-Host ""
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Cloud Security Configuration Required" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "To allow external access, configure your cloud provider's security group:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Aliyun:" -ForegroundColor Cyan
Write-Host "  1. Login to console: https://ecs.console.aliyun.com/" -ForegroundColor White
Write-Host "  2. Go to: Network & Security > Security Groups" -ForegroundColor White
Write-Host "  3. Click your security group > Configure Rules > Add Security Group Rule" -ForegroundColor White
Write-Host "  4. Add rule:" -ForegroundColor White
Write-Host "     - Direction: Inbound" -ForegroundColor Gray
Write-Host "     - Policy: Allow" -ForegroundColor Gray
Write-Host "     - Protocol: TCP" -ForegroundColor Gray
Write-Host "     - Port Range: 80/80" -ForegroundColor Gray
Write-Host "     - Authorization: 0.0.0.0/0" -ForegroundColor Gray
Write-Host ""

Write-Host "Tencent Cloud:" -ForegroundColor Cyan
Write-Host "  1. Login to console: https://console.cloud.tencent.com/cvm" -ForegroundColor White
Write-Host "  2. Go to: Security Groups" -ForegroundColor White
Write-Host "  3. Click Modify Rules > Inbound Rules > Add Rule" -ForegroundColor White
Write-Host "  4. Add rule:" -ForegroundColor White
Write-Host "     - Type: HTTP(80)" -ForegroundColor Gray
Write-Host "     - Source: 0.0.0.0/0" -ForegroundColor Gray
Write-Host "     - Policy: Allow" -ForegroundColor Gray
Write-Host ""

Write-Host "AWS:" -ForegroundColor Cyan
Write-Host "  1. EC2 Console > Security Groups" -ForegroundColor White
Write-Host "  2. Select your security group > Inbound rules > Edit" -ForegroundColor White
Write-Host "  3. Add rule:" -ForegroundColor White
Write-Host "     - Type: HTTP" -ForegroundColor Gray
Write-Host "     - Port: 80" -ForegroundColor Gray
Write-Host "     - Source: 0.0.0.0/0" -ForegroundColor Gray
Write-Host ""

Write-Host "Azure:" -ForegroundColor Cyan
Write-Host "  1. Portal > Network Security Groups" -ForegroundColor White
Write-Host "  2. Select NSG > Inbound security rules > Add" -ForegroundColor White
Write-Host "  3. Add rule:" -ForegroundColor White
Write-Host "     - Service: HTTP" -ForegroundColor Gray
Write-Host "     - Port: 80" -ForegroundColor Gray
Write-Host "     - Source: Any" -ForegroundColor Gray
Write-Host ""

Write-Host "After configuring security group, test access:" -ForegroundColor Green
if ($publicIP) {
    Write-Host "  http://$publicIP" -ForegroundColor Cyan
} else {
    Write-Host "  http://YOUR_PUBLIC_IP" -ForegroundColor Cyan
    Write-Host "  (Check your cloud provider console for public IP)" -ForegroundColor Yellow
}

Write-Host ""
