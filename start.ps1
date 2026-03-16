# Localia - Script de lancement pour Windows
# Ce script lance Localia en mode développement

$ErrorActionPreference = "Stop"

$GREEN = "`e[32m"
$BLUE = "`e[34m"
$NC = "`e[0m"

$INSTALL_DIR = "$env:USERPROFILE\Localia"

function Write-Success {
    param([string]$Message)
    Write-Host "${GREEN}[OK]${NC} $Message" -ForegroundColor Green
}

if (-not (Test-Path $INSTALL_DIR)) {
    Write-Host "Localia n'est pas installé !" -ForegroundColor Red
    Write-Host "Exécutez d'abord: install.ps1" -ForegroundColor Yellow
    exit 1
}

Set-Location $INSTALL_DIR
Write-Success "Lancement de Localia..."
Write-Host ""
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Yellow
Write-Host ""

npm run dev
