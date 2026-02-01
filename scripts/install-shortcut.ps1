# install-shortcut.ps1
# Creates a Windows Start Menu shortcut for Nebula

$WshShell = New-Object -ComObject WScript.Shell

# Get absolute paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$ExePath = Join-Path $ProjectDir "src-tauri\target\release\nebula.exe"
$IconPath = Join-Path $ProjectDir "src-tauri\icons\icon.ico"

# Verify exe exists
if (-not (Test-Path $ExePath)) {
    Write-Host "ERROR: nebula.exe not found at $ExePath"
    Write-Host "Please run 'npm run tauri build' first."
    exit 1
}

# Start Menu shortcut
$StartMenuPath = [System.IO.Path]::Combine(
    [Environment]::GetFolderPath("StartMenu"),
    "Programs",
    "Nebula.lnk"
)

$Shortcut = $WshShell.CreateShortcut($StartMenuPath)
$Shortcut.TargetPath = $ExePath
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.Description = "Nebula IDE - Agentic Development Environment"
$Shortcut.IconLocation = $IconPath
$Shortcut.Save()

Write-Host "Start Menu shortcut created at: $StartMenuPath"

# Also create a Desktop shortcut
$DesktopPath = [System.IO.Path]::Combine(
    [Environment]::GetFolderPath("Desktop"),
    "Nebula.lnk"
)

$Shortcut2 = $WshShell.CreateShortcut($DesktopPath)
$Shortcut2.TargetPath = $ExePath
$Shortcut2.WorkingDirectory = $ProjectDir
$Shortcut2.Description = "Nebula IDE - Agentic Development Environment"
$Shortcut2.IconLocation = $IconPath
$Shortcut2.Save()

Write-Host "Desktop shortcut created at: $DesktopPath"
Write-Host ""
Write-Host "Nebula is now accessible from your Start Menu and Desktop!"
Write-Host "Icon: $IconPath"
