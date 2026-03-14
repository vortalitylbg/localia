# Plan: Refonte UI style Spotify

## Objectif
Transformer l'interface de Localify pour ressembler davantage à Spotify avec:
- Sidebar sombre fixe à gauche
- Zone principale avec coins arrondis
- Couleurs Spotify (#121212, #181828, #1db954)
- Cartes d'albums/artistes avec boutons play au survol
- Meilleure hiérarchie visuelle

## Fichiers à modifier
- `frontend/src/App.jsx` - Principales modifications de structure et styles

## Étapes d'implémentation

### 1. Structure principale
- Sidebar fixe à gauche (240px) avec fond #121212
- Zone principale avec fond #121212 et coins arrondis en haut
- Padding et marges inspirés de Spotify

### 2. Sidebar (gauche)
- Fond #121212
- Logo "Localify" en haut
- Navigation: Home, Search, Library
- Section playlists avec scroll
- Style hover: fond #282828

### 3. Zone principale
- Fond global #121212
- En-tête avec dégradé subtil
- Grilles d'albums/artistes avec espacement
- Cards avec fond #181818 et hover #282828

### 4. Boutons play
- Bouton circulaire vert (#1db954) qui apparaît au survol des cards
- Position absolute sur les pochettes d'albums

### 5. Lectures des chansons
- Icône play/pause ronde verte
- Améliorer le player en bas

### 6. Autres ajustements
- Retirer les不必要的 bordures
- Uniformiser les espacements
- Améliorer la typographie

## Vérification
- Build du projet: `npm run build`
- Lancer l'app et vérifier l'affichage
