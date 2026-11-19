# Lets phones and tablets on this home Wi-Fi open the diary that already runs on this PC.
# Forwards only port 1989. Does not delete or replace the database.

param(
    [switch]$InstallTask
)

$ErrorActionPreference = "Stop"
$logDir = Join-Path $env:LOCALAPPDATA "OrbitPlanner"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "lan.log"

function Write-Log([string]$message) {
    Add-Content -Path $log -Value ("{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message)
}

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
    Write-Log "needs Windows permission"
    exit 1
}

Write-Log "start"

$ruleName = "Orbit Planner (phone and tablet)"
$rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $rule) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 1989 -Profile Private -RemoteAddress LocalSubnet | Out-Null
    Write-Log "firewall rule created"
} else {
    Enable-NetFirewallRule -DisplayName $ruleName
    Write-Log "firewall rule already present"
}

$tailscaleRule = "Orbit Planner (Tailscale)"
$tailscale = Get-NetFirewallRule -DisplayName $tailscaleRule -ErrorAction SilentlyContinue
if (-not $tailscale) {
    New-NetFirewallRule -DisplayName $tailscaleRule -Direction Inbound -Action Allow -Protocol TCP -LocalPort 1989 -Profile Any -RemoteAddress 100.64.0.0/10 | Out-Null
    Write-Log "tailscale firewall rule created"
} else {
    Enable-NetFirewallRule -DisplayName $tailscaleRule
    Write-Log "tailscale firewall rule already present"
}

try {
    $hvName = "Orbit-Planner-1989"
    $hv = Get-NetFirewallHyperVRule -Name $hvName -ErrorAction SilentlyContinue
    if (-not $hv) {
        New-NetFirewallHyperVRule -Name $hvName -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPorts 1989 -VMCreatorId "{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}" | Out-Null
        Write-Log "home-network rule for the app container created"
    } else {
        Write-Log "home-network rule for the app container already present"
    }
} catch {
    Write-Log "home-network container rule: $($_.Exception.Message)"
}

try {
    Set-Service -Name iphlpsvc -StartupType Automatic -ErrorAction SilentlyContinue
    if ((Get-Service iphlpsvc).Status -ne "Running") {
        Start-Service iphlpsvc
    }
} catch {
    Write-Log "ip helper: $($_.Exception.Message)"
}

function Get-HomeIp {
    $all = @(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -like "192.168.*" -and $_.PrefixOrigin -ne "WellKnown" -and $_.InterfaceAlias -notmatch "Nord|VPN|WSL|vEthernet|Hyper-V|Loopback|Bluetooth|Docker"
    })
    $wifi = $all | Where-Object { $_.InterfaceAlias -eq "Wi-Fi" } | Select-Object -First 1
    if ($wifi) { return $wifi.IPAddress }
    return ($all | Select-Object -First 1).IPAddress
}

# This address is the laptop itself. It stays when the Wi-Fi changes.
netsh interface portproxy delete v4tov4 listenaddress=127.0.0.1 listenport=1989 | Out-Null
netsh interface portproxy add v4tov4 listenaddress=127.0.0.1 listenport=1989 connectaddress=127.0.0.1 connectport=19890 | Out-Null
Write-Log "laptop site 127.0.0.1:1989"

$ip = $null
foreach ($try in 1..8) {
    $ip = Get-HomeIp
    if ($ip) { break }
    Start-Sleep -Seconds 2
}

$state = Join-Path $logDir "lan-ip.txt"
if (-not $ip) {
    if (Test-Path $state) {
        $old = (Get-Content $state -Raw).Trim()
        if ($old) {
            netsh interface portproxy delete v4tov4 listenaddress=$old listenport=1989 | Out-Null
            Write-Log "removed home forward $old"
        }
        Remove-Item $state -Force
    }
    Write-Log "no home address; the laptop site still opens"
} else {
    if (Test-Path $state) {
        $old = (Get-Content $state -Raw).Trim()
        if ($old -and $old -ne $ip) {
            netsh interface portproxy delete v4tov4 listenaddress=$old listenport=1989 | Out-Null
            Write-Log "removed old forward $old"
        }
    }
    netsh interface portproxy delete v4tov4 listenaddress=$ip listenport=1989 | Out-Null
    $add = netsh interface portproxy add v4tov4 listenaddress=$ip listenport=1989 connectaddress=127.0.0.1 connectport=19890
    Write-Log "forward $ip -> 127.0.0.1:19890 ($add)"
    Set-Content -Path $state -Value $ip -Encoding ascii
}

$tsExe = Join-Path ${env:ProgramFiles} "Tailscale\tailscale.exe"
if (Test-Path $tsExe) {
    $tip = $null
    foreach ($try in 1..10) {
        try {
            $tip = (& $tsExe ip -4 2>$null | Select-Object -First 1)
            if ($tip) { $tip = $tip.ToString().Trim() }
        } catch {
            $tip = $null
        }
        if ($tip -match "^\d+\.\d+\.\d+\.\d+$") { break }
        Start-Sleep -Seconds 2
    }
    if ($tip) {
        $tipState = Join-Path $logDir "tailscale-ip.txt"
        if (Test-Path $tipState) {
            $oldTip = (Get-Content $tipState -Raw).Trim()
            if ($oldTip -and $oldTip -ne $tip) {
                netsh interface portproxy delete v4tov4 listenaddress=$oldTip listenport=1989 | Out-Null
                Write-Log "removed old tailscale forward $oldTip"
            }
        }
        netsh interface portproxy delete v4tov4 listenaddress=$tip listenport=1989 | Out-Null
        $addTip = netsh interface portproxy add v4tov4 listenaddress=$tip listenport=1989 connectaddress=127.0.0.1 connectport=19890
        Set-Content -Path $tipState -Value $tip -Encoding ascii
        Write-Log "tailscale forward $tip -> 127.0.0.1:19890 ($addTip)"
    } else {
        Write-Log "no tailscale address"
    }
}

if ($InstallTask -and $ip) {
    $script = $PSCommandPath
    $arg = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arg
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $trigger.Delay = "PT30S"
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    Register-ScheduledTask -TaskName "Orbit Planner network" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    Write-Log "logon task installed"
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show("On your phone or tablet, open:`n`nhttp://${ip}:1989`n`nSign in with the same name and password. This PC has to stay awake.", "Orbit Planner") | Out-Null
}

Write-Log "laptop ready http://127.0.0.1:19890"
exit 0
