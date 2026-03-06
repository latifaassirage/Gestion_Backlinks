# Gestion des Backlinks - Laravel Backend

API Laravel pour la gestion des backlinks d'agence SEO.

## Installation

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

## API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/profile` - Profil utilisateur

### Clients
- `GET /api/clients` - Liste des clients
- `POST /api/clients` - Créer un client
- `GET /api/clients/{id}` - Détails client
- `PUT /api/clients/{id}` - Modifier client
- `DELETE /api/clients/{id}` - Supprimer client

### Sources
- `GET /api/source-sites` - Liste des sources
- `POST /api/source-sites` - Créer une source
- `GET /api/source-sites/{id}` - Détails source
- `PUT /api/source-sites/{id}` - Modifier source
- `DELETE /api/source-sites/{id}` - Supprimer source

### Backlinks
- `GET /api/backlinks` - Liste des backlinks
- `POST /api/backlinks` - Créer un backlink
- `GET /api/backlinks/{id}` - Détails backlink
- `PUT /api/backlinks/{id}` - Modifier backlink
- `DELETE /api/backlinks/{id}` - Supprimer backlink

### Rapports
- `GET /api/reports` - Générer rapports

## Base de données

- **users**: Utilisateurs (admin/staff)
- **clients**: Entreprises clientes
- **source_sites**: Sites sources
- **backlinks**: Backlinks créés
- **reports**: Rapports générés