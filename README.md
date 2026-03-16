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

## Installation automatique (Linux/Raspberry Pi)

### Option 1: Script automatique (recommandé)

```bash
# Download le script d'installation
curl -O https://raw.githubusercontent.com/vortalitylbg/localia/main/install.sh

# Exécute le script
chmod +x install.sh
./install.sh
```

### Option 2: Installation manuelle

Si vous préférez installer manuellement:

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Installer ffmpeg (pour les métadonnées audio)
sudo apt install -y ffmpeg

# Cloner et installer
git clone https://github.com/vortalitylbg/localia.git
cd localia
npm install
cd backend && npm install && cd ..
cd frontend && npm install && npm run build && cd ..

# Créer le service systemd (voir section "Lancer au démarrage")
```

## Commandes utiles

Après l'installation automatique:

```bash
# Voir le status
sudo systemctl status localia

# Redémarrer l'application
sudo systemctl restart localia

# Voir les logs en temps réel
sudo journalctl -u localia -f
```

L'application est accessible via l'adresse IP du Raspberry:
```
http://192.168.1.x:5000
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

Pour plus d'informations, consultez le site web: [localia-web](https://www.localia.online)
