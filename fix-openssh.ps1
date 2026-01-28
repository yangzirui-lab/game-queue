# Fix OpenSSH Server Installation on Windows Server 2019
# Please run this script as Administrator

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "OpenSSH Server Installation Fix" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    exit 1
}

# Method 1: Try to install from online source with source parameter
Write-Host "[Method 1] Attempting to install OpenSSH from Windows Update..." -ForegroundColor Yellow

try {
    # Check current state
    $sshCapability = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'

    if ($sshCapability.State -eq "Installed") {
        Write-Host "OK OpenSSH Server is already installed" -ForegroundColor Green
    } else {
        Write-Host "Current State: $($sshCapability.State)" -ForegroundColor Cyan
        Write-Host "Attempting installation..." -ForegroundColor Yellow

        # Try with LimitAccess parameter
        Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0 -LimitAccess -ErrorAction Stop
        Write-Host "OK OpenSSH Server installed successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "Method 1 failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""

    # Method 2: Download and install manually
    Write-Host "[Method 2] Downloading OpenSSH from GitHub..." -ForegroundColor Yellow

    $downloadUrl = "https://github.com/PowerShell/Win32-OpenSSH/releases/download/v9.5.0.0p1-Beta/OpenSSH-Win64.zip"
    $downloadPath = "$env:TEMP\OpenSSH-Win64.zip"
    $extractPath = "C:\Program Files\OpenSSH"

    try {
        # Download OpenSSH
        Write-Host "Downloading from GitHub..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath -UseBasicParsing
        Write-Host "OK Download complete" -ForegroundColor Green

        # Extract
        Write-Host "Extracting files..." -ForegroundColor Cyan
        if (Test-Path $extractPath) {
            Remove-Item $extractPath -Recurse -Force
        }
        Expand-Archive -Path $downloadPath -DestinationPath "C:\Program Files" -Force
        Rename-Item -Path "C:\Program Files\OpenSSH-Win64" -NewName "OpenSSH" -Force
        Write-Host "OK Files extracted to $extractPath" -ForegroundColor Green

        # Run install script
        Write-Host "Installing OpenSSH Server..." -ForegroundColor Cyan
        Set-Location $extractPath
        powershell.exe -ExecutionPolicy Bypass -File install-sshd.ps1
        Write-Host "OK OpenSSH Server installed" -ForegroundColor Green

        # Add to PATH
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
        if ($currentPath -notlike "*$extractPath*") {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$extractPath", "Machine")
            Write-Host "OK Added OpenSSH to system PATH" -ForegroundColor Green
        }

        # Configure firewall
        Write-Host "Configuring firewall..." -ForegroundColor Cyan
        $firewallRule = Get-NetFirewallRule -Name "sshd" -ErrorAction SilentlyContinue
        if (-not $firewallRule) {
            New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
            Write-Host "OK Firewall rule added" -ForegroundColor Green
        }

    } catch {
        Write-Host "ERROR: Method 2 failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Manual installation required:" -ForegroundColor Yellow
        Write-Host "1. Download OpenSSH from: $downloadUrl" -ForegroundColor White
        Write-Host "2. Extract to C:\Program Files\OpenSSH" -ForegroundColor White
        Write-Host "3. Run: powershell.exe -ExecutionPolicy Bypass -File install-sshd.ps1" -ForegroundColor White
        exit 1
    }
}

# Start and configure the service
Write-Host ""
Write-Host "Configuring SSH service..." -ForegroundColor Yellow

try {
    # Check if service exists
    $sshService = Get-Service sshd -ErrorAction SilentlyContinue

    if (-not $sshService) {
        Write-Host "ERROR: sshd service not found after installation" -ForegroundColor Red
        Write-Host "Please restart the computer and run this script again" -ForegroundColor Yellow
        exit 1
    }

    # Start service
    if ($sshService.Status -ne "Running") {
        Start-Service sshd
        Write-Host "OK Started sshd service" -ForegroundColor Green
    } else {
        Write-Host "OK sshd service is already running" -ForegroundColor Green
    }

    # Set to automatic startup
    Set-Service -Name sshd -StartupType 'Automatic'
    Write-Host "OK Set sshd to automatic startup" -ForegroundColor Green

    # Also configure ssh-agent
    $agentService = Get-Service ssh-agent -ErrorAction SilentlyContinue
    if ($agentService) {
        Set-Service -Name ssh-agent -StartupType 'Automatic'
        Start-Service ssh-agent -ErrorAction SilentlyContinue
        Write-Host "OK Configured ssh-agent service" -ForegroundColor Green
    }

} catch {
    Write-Host "ERROR: Failed to configure service: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Verify installation
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Verifying Installation" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$sshdService = Get-Service sshd -ErrorAction SilentlyContinue
if ($sshdService -and $sshdService.Status -eq "Running") {
    Write-Host "OK OpenSSH Server is installed and running" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service Status: $($sshdService.Status)" -ForegroundColor White
    Write-Host "Startup Type: $($sshdService.StartType)" -ForegroundColor White
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Run setup-ssh-key.ps1 to configure SSH key authentication" -ForegroundColor White
    Write-Host "2. Or continue with setup-windows-server.ps1 if not completed" -ForegroundColor White
} else {
    Write-Host "ERROR: Installation verification failed" -ForegroundColor Red
    Write-Host "Please restart the computer and check the service status" -ForegroundColor Yellow
}

Write-Host ""
