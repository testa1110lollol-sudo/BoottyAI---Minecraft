param(
  [Parameter(Position = 0)]
  [string]$Action,
  [string]$TargetPid,
  [string]$Port,
  [string]$Lang,
  [string]$Key
)

function Decode-B64([string]$value) {
  return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($value))
}

switch ($Action) {
  'get-minecraft-pid' {
    $windowProcess = Get-Process -Name java, javaw -ErrorAction SilentlyContinue |
      Where-Object {
        $_.MainWindowTitle -match '^Minecraft' -and
        $_.MainWindowTitle -notmatch 'Launcher'
      } |
      Sort-Object @{ Expression = { if ($_.ProcessName -eq 'javaw') { 0 } else { 1 } } }, Id |
      Select-Object -First 1

    if ($windowProcess) {
      [Console]::Write($windowProcess.Id)
      break
    }

    $process = Get-CimInstance Win32_Process |
      Where-Object { $_.Name -match '^(javaw?\.exe|Minecraft.*\.exe)$' } |
      Where-Object {
        ($_.CommandLine -match 'net\.minecraft\.client\.main\.Main|--gameDir|\.minecraft') -or
        ($_.Name -match '^Minecraft')
      } |
      Sort-Object @{
        Expression = {
          $score = 0
          if ($_.Name -match '^javaw?\.exe$') { $score += 10 }
          if ($_.Name -match '^javaw\.exe$') { $score += 10 }
          if ($_.CommandLine -match '--gameDir') { $score += 15 }
          if ($_.CommandLine -match 'net\.minecraft\.client\.main\.Main') { $score += 10 }
          if ($_.CommandLine -match '1\.13') { $score += 40 }
          -$score
        }
      }, ProcessId |
      Select-Object -First 1

    if ($process) { [Console]::Write($process.ProcessId) }
    break
  }

  'get-cmdline' {
    if (-not $TargetPid) { break }
    $cmdLine = Get-CimInstance Win32_Process |
      Where-Object { $_.ProcessId -eq [int]$TargetPid } |
      Select-Object -First 1 -ExpandProperty CommandLine
    if ($cmdLine) { [Console]::Write($cmdLine) }
    break
  }

  'get-title' {
    if (-not $TargetPid) { break }
    $windowTitle = (Get-Process -Id $TargetPid -ErrorAction SilentlyContinue).MainWindowTitle
    if ($windowTitle) { [Console]::Write($windowTitle) }
    break
  }

  'confirm-version-pid' {
    $ok = $false
    $cmdLine = ''
    $windowTitle = ''

    if ($TargetPid) {
      $proc = Get-CimInstance Win32_Process |
        Where-Object { $_.ProcessId -eq [int]$TargetPid } |
        Select-Object -First 1
      if ($proc) { $cmdLine = [string]$proc.CommandLine }
      $windowTitle = [string](Get-Process -Id $TargetPid -ErrorAction SilentlyContinue).MainWindowTitle
    }

    if ($cmdLine -like '*1.13*') { $ok = $true }
    if (-not $ok -and $windowTitle -like '*1.13*') { $ok = $true }

    if (-not $ok) {
      $log = $env:MC_LOG
      if (-not $log) { $log = Join-Path $env:APPDATA '.minecraft\logs\latest.log' }
      if (Test-Path $log) {
        $txt = Get-Content $log -Tail 400 -ErrorAction SilentlyContinue | Out-String
        if ($txt -like '*Minecraft*1.13*') { $ok = $true }
      }
    }

    if ($ok) { [Console]::Write('YES') }
    break
  }

  'port-range-ok' {
    $n = 0
    if ([int]::TryParse($Port, [ref]$n) -and $n -ge 1 -and $n -le 65535) {
      [Console]::Write('YES')
    }
    break
  }

  'port-open' {
    $n = 0
    if (-not [int]::TryParse($Port, [ref]$n)) { break }
    $ok = $false
    try {
      $client = New-Object Net.Sockets.TcpClient
      $iar = $client.BeginConnect('127.0.0.1', $n, $null, $null)
      if ($iar.AsyncWaitHandle.WaitOne(1500)) {
        $client.EndConnect($iar)
        $ok = $true
      }
      $client.Close()
    } catch {}
    if ($ok) { [Console]::Write('YES') }
    break
  }

  'text' {
    $language = if ($Lang -eq 'ru') { 'ru' } else { 'en' }
    $en = @{
      TITLE_TXT = 'Minecraft 1.13 AI Bot Launcher'
      BANNER_TXT = 'Minecraft 1.13 AI Bot Launcher'
      ERR_NODE = '[ERROR] Node.js was not found in PATH. Install Node.js 18+ and try again.'
      ERR_PROC = '[ERROR] Minecraft Java process was not found.'
      OPEN_MC = 'Open Minecraft Java 1.13.x first, then run this BAT again.'
      ERR_VER1 = '[ERROR] Could not confirm Minecraft version 1.13.x.'
      ERR_VER2 = 'This bot supports Minecraft 1.13.x only.'
      OK_FOUND = '[OK] Minecraft process found and version 1.13.x confirmed.'
      OPEN_LAN = 'Open your world to LAN now:'
      LAN_STEP = 'ESC > Open to LAN > Start LAN World'
      LAN_AUTO = '[OK] Auto-detected LAN port from log:'
      ASK_PORT = 'Enter LAN port from Minecraft chat: '
      WARN_NUM = '[WARN] Port must be numbers only.'
      WARN_RANGE = '[WARN] Port must be in range 1..65535.'
      WARN_CONN1 = '[WARN] Cannot connect to 127.0.0.1:'
      WARN_CONN2 = 'Check that world is open to LAN and the port is correct.'
      BOT_NAME_TXT = 'Bot username is fixed to:'
      INSTALLING = 'Installing dependencies on first run...'
      ERR_INSTALL = '[ERROR] Failed to install npm dependencies.'
      STARTING = 'Starting bot...'
      ENDED = 'Bot session ended. Exit code:'
      DISCONNECT_HINT = 'If the bot disconnected immediately, read Kicked/Error/Disconnected above.'
    }
    $ru = @{
      TITLE_TXT = Decode-B64('0JvQsNGD0L3Rh9C10YAg0JjQmC3QsdC+0YLQsCBNaW5lY3JhZnQgMS4xMw==')
      BANNER_TXT = Decode-B64('0JvQsNGD0L3Rh9C10YAg0JjQmC3QsdC+0YLQsCBNaW5lY3JhZnQgMS4xMw==')
      ERR_NODE = Decode-B64('W9Ce0KjQmNCR0JrQkF0gTm9kZS5qcyDQvdC1INC90LDQudC00LXQvSDQsiBQQVRILiDQo9GB0YLQsNC90L7QstC4IE5vZGUuanMgMTgrINC4INC/0L7Qv9GA0L7QsdGD0Lkg0YHQvdC+0LLQsC4=')
      ERR_PROC = Decode-B64('W9Ce0KjQmNCR0JrQkF0g0J/RgNC+0YbQtdGB0YEgTWluZWNyYWZ0IEphdmEg0L3QtSDQvdCw0LnQtNC10L0u')
      OPEN_MC = Decode-B64('0KHQvdCw0YfQsNC70LAg0L7RgtC60YDQvtC5IE1pbmVjcmFmdCBKYXZhIDEuMTMueCwg0L/QvtGC0L7QvCDRgdC90L7QstCwINC30LDQv9GD0YHRgtC4INGN0YLQvtGCIEJBVC4=')
      ERR_VER1 = Decode-B64('W9Ce0KjQmNCR0JrQkF0g0J3QtSDRg9C00LDQu9C+0YHRjCDQv9C+0LTRgtCy0LXRgNC00LjRgtGMINCy0LXRgNGB0LjRjiBNaW5lY3JhZnQgMS4xMy54Lg==')
      ERR_VER2 = Decode-B64('0K3RgtC+0YIg0LHQvtGCINC/0L7QtNC00LXRgNC20LjQstCw0LXRgiDRgtC+0LvRjNC60L4gTWluZWNyYWZ0IDEuMTMueC4=')
      OK_FOUND = Decode-B64('W09LXSDQn9GA0L7RhtC10YHRgSBNaW5lY3JhZnQg0L3QsNC50LTQtdC9LCDQstC10YDRgdC40Y8gMS4xMy54INC/0L7QtNGC0LLQtdGA0LbQtNC10L3QsC4=')
      OPEN_LAN = Decode-B64('0KLQtdC/0LXRgNGMINC+0YLQutGA0L7QuSDQvNC40YAg0LTQu9GPIExBTjo=')
      LAN_STEP = Decode-B64('RVNDID4gT3BlbiB0byBMQU4gPiBTdGFydCBMQU4gV29ybGQ=')
      LAN_AUTO = Decode-B64('W09LXSBMQU4t0L/QvtGA0YIg0L3QsNC50LTQtdC9INCw0LLRgtC+0LzQsNGC0LjRh9C10YHQutC4INC40Lcg0LvQvtCz0LA6')
      ASK_PORT = Decode-B64('0JLQstC10LTQuCBMQU4t0L/QvtGA0YIg0LjQtyDRh9Cw0YLQsCBNaW5lY3JhZnQ6IA==')
      WARN_NUM = Decode-B64('W9Cf0KDQldCU0KPQn9Cg0JXQltCU0JXQndCY0JVdINCf0L7RgNGCINC00L7Qu9C20LXQvSDRgdC+0YHRgtC+0Y/RgtGMINGC0L7Qu9GM0LrQviDQuNC3INGG0LjRhNGALg==')
      WARN_RANGE = Decode-B64('W9Cf0KDQldCU0KPQn9Cg0JXQltCU0JXQndCY0JVdINCf0L7RgNGCINC00L7Qu9C20LXQvSDQsdGL0YLRjCDQsiDQtNC40LDQv9Cw0LfQvtC90LUgMS4uNjU1MzUu')
      WARN_CONN1 = Decode-B64('W9Cf0KDQldCU0KPQn9Cg0JXQltCU0JXQndCY0JVdINCd0LUg0YPQtNCw0LvQvtGB0Ywg0L/QvtC00LrQu9GO0YfQuNGC0YzRgdGPINC6IDEyNy4wLjAuMTo=')
      WARN_CONN2 = Decode-B64('0J/RgNC+0LLQtdGA0YwsINGH0YLQviDQvNC40YAg0L7RgtC60YDRi9GCINC00LvRjyBMQU4g0Lgg0L/QvtGA0YIg0YPQutCw0LfQsNC9INC/0YDQsNCy0LjQu9GM0L3Qvi4=')
      BOT_NAME_TXT = Decode-B64('0J3QuNC6INCx0L7RgtCwINGE0LjQutGB0LjRgNC+0LLQsNC9Og==')
      INSTALLING = Decode-B64('0KPRgdGC0LDQvdCw0LLQu9C40LLQsNGOINC30LDQstC40YHQuNC80L7RgdGC0Lgg0L/RgNC4INC/0LXRgNCy0L7QvCDQt9Cw0L/Rg9GB0LrQtS4uLg==')
      ERR_INSTALL = Decode-B64('W9Ce0KjQmNCR0JrQkF0g0J3QtSDRg9C00LDQu9C+0YHRjCDRg9GB0YLQsNC90L7QstC40YLRjCBucG0t0LfQsNCy0LjRgdC40LzQvtGB0YLQuC4=')
      STARTING = Decode-B64('0JfQsNC/0YPRgdC60LDRjiDQsdC+0YLQsC4uLg==')
      ENDED = Decode-B64('0KHQtdGB0YHQuNGPINCx0L7RgtCwINC30LDQstC10YDRiNC10L3QsC4g0JrQvtC0INCy0YvRhdC+0LTQsDo=')
      DISCONNECT_HINT = Decode-B64('0JXRgdC70Lgg0LHQvtGCINGB0YDQsNC30YMg0L7RgtC60LvRjtGH0LjQu9GB0Y8sINGB0LzQvtGC0YDQuCDRgdGC0YDQvtC60LggS2lja2VkL0Vycm9yL0Rpc2Nvbm5lY3RlZCDQstGL0YjQtS4=')
    }
    if ($language -eq 'ru') { [Console]::Write($ru[$Key]) } else { [Console]::Write($en[$Key]) }
    break
  }
}
