#!/bin/bash

set -e

echo "========================================"
echo "  Installation de Localia"
echo "========================================"

INSTALL_DIR="/home/pi/localia"
SERVICE_NAME="localia"
GIT_REPO="https://github.com/vortalitylbg/localia.git"

echo ""
echo "[1/7] Vérification des privilèges root..."
if [ "$EUID" -ne 0 ]; then
    echo "Ce script nécessite root. Utilisation de sudo..."
    exec sudo "$0" "$@"
fi

echo "[2/7] Mise à jour du système..."
apt update && apt upgrade -y

echo "[3/7] Installation de Node.js 18..."
if command -v node &> /dev/null; then
    echo "Node.js déjà installé: $(node -v)"
else
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

echo "[4/7] Installation des dépendances système..."
apt install -y ffmpeg

echo "[5/7] Récupération du projet..."
if [ -d "$INSTALL_DIR" ]; then
    echo "Le dossier existe déjà. Mise à jour..."
    cd "$INSTALL_DIR"
    git pull
else
    git clone "$GIT_REPO" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

echo "[6/7] Installation des dépendances npm..."
npm install
cd backend && npm install && cd ..
cd frontend && npm install && npm run build && cd ..

echo "[7/7] Configuration du service systemd..."
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

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl start ${SERVICE_NAME}

echo ""
echo "========================================"
echo "  Installation terminée!"
echo "========================================"
echo ""
echo "L'application est accessible sur: http://$(hostname -I | awk '{print $1}'):5000"
echo ""
echo "Commandes utiles:"
echo "  - Status: systemctl status ${SERVICE_NAME}"
echo "  - Redémarrer: sudo systemctl restart ${SERVICE_NAME}"
echo "  - Arrêter: sudo systemctl stop ${SERVICE_NAME}"
echo "  - Logs: sudo journalctl -u ${SERVICE_NAME} -f"
echo ""
