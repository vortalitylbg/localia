#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "${BLUE}[1/4]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }

INSTALL_DIR="/home/pi/localia"
SERVICE_NAME="localia"

echo "========================================"
echo -e "${GREEN}  Mise à jour de Localia${NC}"
echo "========================================"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Ce script nécessite root"
    exit 1
fi

print_step "Arrêt du service..."
systemctl stop ${SERVICE_NAME}
print_success "Service arrêté"

print_step "Mise à jour du code..."
cd ${INSTALL_DIR}
git pull > /dev/null 2>&1
print_success "Code mis à jour"

print_step "Reinstallation et rebuild..."
npm install > /dev/null 2>&1
cd backend && npm install > /dev/null 2>&1 && cd ..
cd frontend && npm install > /dev/null 2>&1 && npm run build > /dev/null 2>&1 && cd ..
print_success "Dépendances reinstallées et rebuild"

print_step "Redémarrage du service..."
systemctl start ${SERVICE_NAME}
print_success "Service démarré"

IP=$(hostname -I | awk '{print $1}')
echo ""
echo "========================================"
echo -e "${GREEN}  Mise à jour terminée !${NC}"
echo "========================================"
echo ""
echo -e "Application disponible sur: ${GREEN}http://${IP}:5000${NC}"
echo ""
