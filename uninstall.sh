#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "${BLUE}[1/3]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }

INSTALL_DIR="/home/pi/localia"
SERVICE_NAME="localia"

echo "========================================"
echo -e "${GREEN}  Désinstallation de Localia${NC}"
echo "========================================"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Ce script nécessite root"
    exit 1
fi

print_step "Arrêt et désactivation du service..."
systemctl stop ${SERVICE_NAME} 2>/dev/null || true
systemctl disable ${SERVICE_NAME} 2>/dev/null || true
rm -f /etc/systemd/system/${SERVICE_NAME}.service
systemctl daemon-reload > /dev/null 2>&1
print_success "Service supprimé"

print_step "Suppression des fichiers..."
rm -rf ${INSTALL_DIR}
print_success "Fichiers supprimés"

print_step "Désinstallation de Node.js..."
apt remove -y nodejs 2>/dev/null || true
apt autoremove -y > /dev/null 2>&1
print_success "Node.js désinstallé"

echo ""
echo "========================================"
echo -e "${GREEN}  Désinstallation terminée !${NC}"
echo "========================================"
echo ""
