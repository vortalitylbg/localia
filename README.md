# Localia

Un lecteur de musique local moderne avec interface web, gestion multi-utilisateurs et contrôle Gamepad.

![Localia](https://img.shields.io/badge/version-1.0.0-purple)
![React](https://img.shields.io/badge/React-18.x-blue)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green)

## Fonctionnalités

- 🎵 **Lecture musicale locale** - Supporte MP3, FLAC, M4A, WAV, OGG
- 👥 **Multi-utilisateurs** - Chaque membre de la famille peut avoir son propre profil
- 🎮 **Contrôle Gamepad** - Navigation avec manette PS4/Xbox
- 📊 **Statistiques d'écoute** - Suivi du temps d'écoute, titres/artistes/albums favoris
- ❤️ **Favoris** - Likez vos titres préférés
- 🔀 **File d'attente** - Gestion flexible de la lecture
- 🔍 **Recherche** - Filtres par titre, artiste, album
- ⚙️ **Égaliseur** - Personnalisez le son
- 📱 **Interface responsive** - Fonctionne sur mobile et desktop
- 🌐 **TV Mode** - Mode console pour TV

## Installation

### Prérequis

- Node.js 18+
- NPM ou Yarn

### Installation rapide

```bash
# Cloner le projet
git clone https://github.com/vortalitylbg/localia.git
cd localia

# Installer les dépendances
npm install

# Lancer en développement
npm run dev
```

L'application sera disponible sur:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Déploiement sur Raspberry Pi

### 1. Préparation du Raspberry Pi

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Déployer l'application

```bash
# Cloner le projet sur le Raspberry
git clone https://github.com/vortalitylbg/localia.git
cd localia
npm install

# Construire le frontend
cd frontend && npm install && npm run build && cd ..

# Configuration pour la production
# Le backend sert les fichiers statiques en production
```

### 3. Lancer au démarrage

Créez un service systemd:

```bash
sudo nano /etc/systemd/system/localia.service
```

Contenu:
```ini
[Unit]
Description=Localia Music Player
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/localia
ExecStart=/usr/bin/node backend/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Activez le service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable localia
sudo systemctl start localia
```

### 4. Accéder depuis d'autres appareils

L'application est accessible via l'adresse IP du Raspberry:
```
http://192.168.x.x:5000
```

## Structure du projet

```
localia/
├── backend/           # Serveur Express
│   ├── index.js       # Point d'entrée API
│   ├── database.js    # Base de données SQLite
│   └── music/         # Vos fichiers musicaux
├── frontend/          # Application React
│   ├── src/
│   │   └── App.jsx   # Interface principale
│   └── dist/          # Fichiers buildés
├── localia-web/       # Site web de présentation
└── package.json       # Configuration npm
```

## Ajouter de la musique

Placez vos fichiers musicaux dans le dossier:
```
backend/music/
```

L'application scannera automatiquement les nouveaux fichiers au démarrage.

## Configuration

### Variables d'environnement

Créez un fichier `.env` dans le dossier `backend/`:

```env
PORT=5000
JWT_SECRET=votre-secret-tres-securise
```

### Port par défaut

Le backend utilise le port 5000 par défaut. Modifiez `backend/index.js` pour changer le port.

## Contribution

Les contributions sont les bienvenues ! Veuillez créer une issue ou pull request sur GitHub.

## Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

## Auteurs

- Développé par Timothée Charruau

---

Pour plus d'informations, consultez le site web: [localia-web](localia-web/)
