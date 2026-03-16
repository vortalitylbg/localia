#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "${BLUE}[1/7]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

INSTALL_DIR="/home/pi/localia"
SERVICE_NAME="localia"

echo "========================================"
echo -e "${GREEN}  Installation de Localia${NC}"
echo "========================================"
echo ""

if [ "$EUID" -ne 0 ]; then
    print_warning "Ce script nécessite root. Utilisation de sudo..."
    exec sudo "$0" "$@"
fi

print_step "Mise à jour du système..."
apt update && apt upgrade -y > /dev/null 2>&1
print_success "Système mis à jour"

print_step "Installation de Node.js 18..."
if command -v node &> /dev/null; then
    print_success "Node.js déjà installé: $(node -v)"
else
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt install -y nodejs > /dev/null 2>&1
    print_success "Node.js installé"
fi

print_step "Installation de ffmpeg..."
if command -v ffmpeg &> /dev/null; then
    print_success "ffmpeg déjà installé"
else
    apt install -y ffmpeg > /dev/null 2>&1
    print_success "ffmpeg installé"
fi

print_step "Récupération du projet..."
if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR"
    git pull > /dev/null 2>&1
    print_success "Projet mis à jour"
else
    git clone https://github.com/vortalitylbg/localia.git "$INSTALL_DIR" > /dev/null 2>&1
    cd "$INSTALL_DIR"
    print_success "Projet cloné"
fi

print_step "Installation des dépendances..."
npm install > /dev/null 2>&1
cd backend && npm install > /dev/null 2>&1 && cd ..
cd frontend && npm install > /dev/null 2>&1 && npm run build > /dev/null 2>&1 && cd ..
print_success "Dépendances installées et frontend compilé"

print_step "Configuration du service systemd..."
cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=Localia Music Player
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/node ${INSTALL_DIR}/backend/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload > /dev/null 2>&1
systemctl enable ${SERVICE_NAME} > /dev/null 2>&1
systemctl start ${SERVICE_NAME}
print_success "Service systemd créé et démarré"

IP=$(hostname -I | awk '{print $1}')
echo ""
echo "========================================"
echo -e "${GREEN}  Installation terminée !${NC}"
echo "========================================"
echo ""
echo -e "L'application est accessible sur: ${GREEN}http://${IP}:5000${NC}"
echo ""
echo "Commandes utiles:"
echo "  • Status:    sudo systemctl status ${SERVICE_NAME}"
echo "  • Redémarrer: sudo systemctl restart ${SERVICE_NAME}"
echo "  • Logs:     sudo journalctl -u ${SERVICE_NAME} -f"
echo ""
