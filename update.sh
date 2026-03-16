#!/bin/bash

set -e

INSTALL_DIR="/home/pi/localia"
SERVICE_NAME="localia"

echo "========================================"
echo "  Mise à jour de Localia"
echo "========================================"

if [ "$EUID" -ne 0 ]; then
    echo "Ce script nécessite root. Utilisation de sudo..."
    exec sudo "$0" "$@"
fi

echo "[1/4] Arrêt du service..."
systemctl stop ${SERVICE_NAME}

echo "[2/4] Mise à jour du code..."
cd ${INSTALL_DIR}
git pull

echo "[3/4] Reinstallation des dépendances et rebuild..."
npm install
cd backend && npm install && cd ..
cd frontend && npm install && npm run build && cd ..

echo "[4/4] Redémarrage du service..."
systemctl start ${SERVICE_NAME}

IP=$(hostname -I | awk '{print $1}')
echo ""
echo "========================================"
echo "  Mise à jour terminée!"
echo "========================================"
echo "Application disponible sur: http://${IP}:5000"
echo ""
