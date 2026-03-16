#!/bin/bash

set -e

INSTALL_DIR="/home/pi/localia"
SERVICE_NAME="localia"

echo "========================================"
echo "  Désinstallation de Localia"
echo "========================================"

if [ "$EUID" -ne 0 ]; then
    echo "Ce script nécessite root. Utilisation de sudo..."
    exec sudo "$0" "$@"
fi

echo "[1/3] Arrêt et désactivation du service..."
systemctl stop ${SERVICE_NAME} 2>/dev/null || true
systemctl disable ${SERVICE_NAME} 2>/dev/null || true
rm -f /etc/systemd/system/${SERVICE_NAME}.service
systemctl daemon-reload

echo "[2/3] Suppression des fichiers..."
rm -rf ${INSTALL_DIR}

echo "[3/3] Nettoyage des paquets..."
apt remove -y nodejs 2>/dev/null || true
apt autoremove -y

echo ""
echo "========================================"
echo "  Désinstallation terminée!"
echo "========================================"
echo ""
