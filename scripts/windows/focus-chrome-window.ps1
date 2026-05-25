param(
  [string]$PreferredTitle = '',
  [string]$FallbackTitlePattern = 'SBI証券',
  [int]$PostActivateDelayMs = 250,
  [switch]$AsJson
)

$ErrorActionPreference = 'Stop'

$signature = @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class ChromeWindowFocusNative {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll")]
  public static extern bool IsIconic(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool BringWindowToTop(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

  [DllImport("kernel32.dll")]
  public static extern uint GetCurrentThreadId();

  [DllImport("user32.dll")]
  public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
}
"@

if (-not ('ChromeWindowFocusNative' -as [type])) {
  Add-Type -TypeDefinition $signature
}

function Get-WindowTitle([IntPtr]$Handle) {
  if ($Handle -eq [IntPtr]::Zero) {
    return ''
  }
  $builder = New-Object System.Text.StringBuilder 2048
  [void][ChromeWindowFocusNative]::GetWindowText($Handle, $builder, $builder.Capacity)
  return $builder.ToString()
}

$beforeHandle = [ChromeWindowFocusNative]::GetForegroundWindow()
$beforeTitle = Get-WindowTitle $beforeHandle
$preferred = $PreferredTitle.Trim()
$fallback = $FallbackTitlePattern.Trim()

$candidates = Get-Process chrome -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 -and -not [string]::IsNullOrWhiteSpace($_.MainWindowTitle) } |
  ForEach-Object {
    $title = $_.MainWindowTitle
    $score = 0
    if ($preferred -and $title -eq $preferred) {
      $score = 400
    } elseif ($preferred -and $title -like "*$preferred*") {
      $score = 300
    } elseif ($fallback -and $title -like "*$fallback*") {
      $score = 200
    } elseif ($title -like '*Google Chrome*') {
      $score = 100
    }

    if ($score -gt 0) {
      [pscustomobject]@{
        Id = $_.Id
        MainWindowHandle = $_.MainWindowHandle
        MainWindowTitle = $title
        Score = $score
      }
    }
  } |
  Sort-Object -Property @(
    @{ Expression = 'Score'; Descending = $true },
    @{ Expression = 'Id'; Descending = $false }
  )

$target = $candidates | Select-Object -First 1
if (-not $target) {
  $payload = [pscustomobject]@{
    success = $false
    reason = 'window-not-found'
    preferredTitle = $preferred
    fallbackTitlePattern = $fallback
    beforeTitle = $beforeTitle
    afterTitle = $beforeTitle
  }
  if ($AsJson) {
    $payload | ConvertTo-Json -Depth 4
  } else {
    Write-Output "window-not-found"
  }
  exit 1
}

$targetHandle = [IntPtr]$target.MainWindowHandle
if ([ChromeWindowFocusNative]::IsIconic($targetHandle)) {
  [void][ChromeWindowFocusNative]::ShowWindowAsync($targetHandle, 9)
}

$shell = New-Object -ComObject WScript.Shell
$shell.SendKeys('%')
$foregroundPid = [uint32]0
$targetPid = [uint32]0
$foregroundThreadId = [ChromeWindowFocusNative]::GetWindowThreadProcessId($beforeHandle, [ref]$foregroundPid)
$targetThreadId = [ChromeWindowFocusNative]::GetWindowThreadProcessId($targetHandle, [ref]$targetPid)
$currentThreadId = [ChromeWindowFocusNative]::GetCurrentThreadId()
$attachedForeground = $false
$attachedTarget = $false
if ($foregroundThreadId -ne 0 -and $foregroundThreadId -ne $currentThreadId) {
  $attachedForeground = [ChromeWindowFocusNative]::AttachThreadInput($currentThreadId, $foregroundThreadId, $true)
}
if ($targetThreadId -ne 0 -and $targetThreadId -ne $currentThreadId) {
  $attachedTarget = [ChromeWindowFocusNative]::AttachThreadInput($currentThreadId, $targetThreadId, $true)
}
$appActivated = $shell.AppActivate($target.Id)
Start-Sleep -Milliseconds 100
[void][ChromeWindowFocusNative]::ShowWindowAsync($targetHandle, 5)
[void][ChromeWindowFocusNative]::BringWindowToTop($targetHandle)
$setForeground = [ChromeWindowFocusNative]::SetForegroundWindow($targetHandle)
if ($attachedTarget) {
  [void][ChromeWindowFocusNative]::AttachThreadInput($currentThreadId, $targetThreadId, $false)
}
if ($attachedForeground) {
  [void][ChromeWindowFocusNative]::AttachThreadInput($currentThreadId, $foregroundThreadId, $false)
}
Start-Sleep -Milliseconds $PostActivateDelayMs

$afterHandle = [ChromeWindowFocusNative]::GetForegroundWindow()
$afterTitle = Get-WindowTitle $afterHandle
$afterMatchesTargetHandle = ($afterHandle -eq $targetHandle)

$result = [pscustomobject]@{
  success = ($appActivated -or $setForeground) -and $afterMatchesTargetHandle
  appActivated = [bool]$appActivated
  setForeground = [bool]$setForeground
  preferredTitle = $preferred
  fallbackTitlePattern = $fallback
  targetPid = $target.Id
  targetTitle = $target.MainWindowTitle
  beforeTitle = $beforeTitle
  afterTitle = $afterTitle
  afterMatchesTargetHandle = $afterMatchesTargetHandle
}

if ($AsJson) {
  $result | ConvertTo-Json -Depth 4
} else {
  Write-Output $result
}

if (-not $result.success) {
  exit 1
}
