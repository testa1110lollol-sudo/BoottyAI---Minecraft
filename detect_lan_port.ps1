param(
  [string]$LogPath
)

$candidates = New-Object System.Collections.Generic.List[string]

if ($LogPath -and (Test-Path $LogPath)) {
  $candidates.Add($LogPath)
}

try {
  $procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^(javaw?\.exe|Minecraft.*\.exe)$' }

  foreach ($p in $procs) {
    $cmd = [string]$p.CommandLine
    if (-not $cmd) { continue }

    $gameDir = $null
    if ($cmd -match '--gameDir\s+"([^"]+)"') {
      $gameDir = $matches[1]
    } elseif ($cmd -match '--gameDir\s+(\S+)') {
      $gameDir = $matches[1]
    }

    if ($gameDir) {
      $log = Join-Path $gameDir 'logs\latest.log'
      if (Test-Path $log) {
        $candidates.Add($log)
      }
    }
  }
} catch {
}

$appDataLog = Join-Path $env:APPDATA '.minecraft\logs\latest.log'
if (Test-Path $appDataLog) {
  $candidates.Add($appDataLog)
}

$uniqueExisting = $candidates | Select-Object -Unique
if (-not $uniqueExisting) {
  return
}

$ordered = $uniqueExisting | Sort-Object { (Get-Item $_).LastWriteTimeUtc } -Descending

foreach ($path in $ordered) {
  $lines = Get-Content -Path $path -Tail 3000 -ErrorAction SilentlyContinue
  if (-not $lines) { continue }

  for ($i = $lines.Count - 1; $i -ge 0; $i--) {
    $line = [string]$lines[$i]

    if ($line -match '(?i)started serving on\s+(\d{4,5})') {
      $p = [int]$matches[1]
      if ($p -ge 1024 -and $p -le 65535) { Write-Output $p; return }
    }

    if ($line -match '(?i)local game hosted on port\s+(\d{4,5})') {
      $p = [int]$matches[1]
      if ($p -ge 1024 -and $p -le 65535) { Write-Output $p; return }
    }

    if ($line -match '(?i)hosted on port\s+(\d{4,5})') {
      $p = [int]$matches[1]
      if ($p -ge 1024 -and $p -le 65535) { Write-Output $p; return }
    }
  }
}
