# Localia - Script d'installation pour Windows
# Exécuter en tant qu'administrateur

param(
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$BLUE = "`e[34m"
$RED = "`e[31m"
$NC = "`e[0m"

$INSTALL_DIR = "$env:USERPROFILE\Localia"
$PROJECT_URL = "https://github.com/vortalitylbg/localia.git"

function Write-Step {
    param([string]$Message)
    Write-Host "${BLUE}[ETAPE]${NC} $Message"
}

function Write-Success {
    param([string]$Message)
    Write-Host "${GREEN}[OK]${NC} $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "${RED}[ERREUR]${NC} $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "${YELLOW}[ATTENTION]${NC} $Message" -ForegroundColor Yellow
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-NodeJS {
    Write-Step "Vérification de Node.js..."

    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Success "Node.js déjà installé: $nodeVersion"
        return
    }

    Write-Step "Installation de Node.js 18..."

    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install nodejs-lts -y
    } else {
        Write-Warning "Winget ou Chocolatey non trouvé. Veuillez installer Node.js manuellement depuis https://nodejs.org"
        Write-Host "Ou utilisez le Windows Store:-winget install OpenJS.NodeJS.LTS"
        exit 1
    }

    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Start-Sleep -Seconds 3

    if (Get-Command node -ErrorAction SilentlyContinue) {
        Write-Success "Node.js installé: $(node --version)"
    } else {
        Write-Error "L'installation de Node.js a échoué. Veuillez redémarrer votre PC et réessayer."
        exit 1
    }
}

function Install-Git {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Success "Git déjà installé: $(git --version)"
        return
    }

    Write-Step "Installation de Git..."

    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install Git.Git --accept-source-agreements --accept-package-agreements
    } else {
        Write-Warning "Git non trouvé. Veuillez installer Git manuellement depuis https://git-scm.com"
        exit 1
    }

    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Start-Sleep -Seconds 2
    Write-Success "Git installé"
}

function Install-Localia {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Installation de Localia" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    if (-not (Test-Administrator)) {
        Write-Warning "Ce script fonctionne mieux en tant qu'administrateur"
    }

    Write-Step "Vérification des prérequis..."
    Install-Git
    Install-NodeJS
    Write-Success "Prérequis vérifiés"

    Write-Step "Clone du projet..."
    if (Test-Path $INSTALL_DIR) {
        Set-Location $INSTALL_DIR
        Write-Host "Mise à jour du projet existant..."
        git pull
    } else {
        git clone $PROJECT_URL $INSTALL_DIR
        Set-Location $INSTALL_DIR
    }
    Write-Success "Projet cloné"

    Write-Step "Installation des dépendances..."
    npm install
    Set-Location "$INSTALL_DIR\backend"
    npm install
    Set-Location "$INSTALL_DIR\frontend"
    npm install
    npm run build
    Set-Location $INSTALL_DIR
    Write-Success "Dépendances installées"

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Installation terminée !" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pour lancer Localia, exécutez:" -ForegroundColor Yellow
    Write-Host "  cd $INSTALL_DIR"
    Write-Host "  npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "L'application sera disponible sur:" -ForegroundColor Yellow
    Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor Cyan
    Write-Host "  - Backend:  http://localhost:5000" -ForegroundColor Cyan
    Write-Host ""
}

function Uninstall-Localia {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  Désinstallation de Localia" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""

    if (Test-Path $INSTALL_DIR) {
        Write-Step "Suppression du dossier Localia..."
        Remove-Item -Recurse -Force $INSTALL_DIR
        Write-Success "Dossier supprimé"
    } else {
        Write-Warning "Localia n'est pas installé"
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Désinstallation terminée !" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
}

if ($Uninstall) {
    Uninstall-Localia
} else {
    Install-Localia
}
