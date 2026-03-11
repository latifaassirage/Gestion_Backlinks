# Gestion des Backlinks - Application SEO Agency

Application interne complète pour la gestion des backlinks d'agence SEO spécialisée dans les services de limousine.

## Objectif

Permettre la gestion complète des clients et le suivi des backlinks réalisés, avec détection de doublons et génération de rapports PDF/Excel. Application interne uniquement - aucun accès client, pas d'API externe, pas d'automatisation.

## Stack Technique Réelle

- **Backend**: Laravel 12.0 avec Sanctum (authentification)
- **Frontend**: React 19.2.4 avec Axios 1.13.6
- **Database**: MySQL avec migrations
- **Librairies**: jsPDF 4.2.0, jsPDF-autotable 5.0.7, XLSX 0.18.5
- **Architecture**: REST API + SPA React

### Prérequis
- PHP 8.2+
- Composer
- Node.js 16+
- MySQL

### Backend
```bash
cd back-end
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```

### Frontend
```bash
cd front-end
npm install
npm start
```

### Accès par Défaut
- **Admin**: admin@agency.com / admin123
- **Staff**: staff@agency.com / staff123

### Données de Test
La commande `php artisan migrate:fresh --seed` charge automatiquement:
- 6 clients limousine (Luxury Limo, NYC Limo Service, Royal Jet Limo, Empire Chauffeurs, Blacklane VIP, Carey International)
- 6 sites sources (Medium.com, BBB.org, Bloomberg.com, Forbes.com, TripAdvisor.com, BusinessInsider.com)
- 6 backlinks exemples avec différents statuts

## API Endpoints Principaux

### Authentification
- `POST /api/login` - Connexion
- `POST /api/logout` - Déconnexion
- `GET /api/me` - Profil utilisateur
- `PUT /api/profile` - Mise à jour profil

### Clients (Admin Only)
- `GET /api/clients` - Liste des clients (tous rôles)
- `POST /api/clients` - Ajouter un client (admin only)
- `PUT /api/clients/{id}` - Modifier un client (admin only)
- `DELETE /api/clients/{id}` - Supprimer un client (admin only)

### Sites Sources (Admin Only)
- `GET /api/sources` - Liste des sites sources (tous rôles)
- `POST /api/sources` - Ajouter un site source (admin only)
- `PUT /api/sources/{id}` - Modifier un site source (admin only)
- `DELETE /api/sources/{id}` - Supprimer un site source (admin only)

### Backlinks (Staff + Admin)
- `GET /api/backlinks` - Liste des backlinks
- `POST /api/backlinks` - Ajouter un backlink
- `PUT /api/backlinks/{id}` - Modifier un backlink
- `DELETE /api/backlinks/{id}` - Supprimer un backlink

### Rapports (Admin Only)
- `GET /api/reports` - Liste des rapports
- `POST /api/reports/pdf/{clientId}` - Générer rapport PDF client
- `POST /api/reports/excel/{clientId}` - Générer rapport Excel client

## Sécurité et Permissions

### Rôles et Restrictions
- **Admin**: Accès complet à toutes les fonctionnalités
- **Staff**: Accès limité aux backlinks + lecture clients/sources pour dashboard
- **Middleware**: `AdminMiddleware` et `StaffMiddleware` activés
- **Authentification**: Sanctum avec tokens JWT

### Protection des Routes
- Routes admin protégées par middleware `admin`
- Routes staff protégées par middleware `staff` 
- Toutes les routes API protégées par `auth:sanctum`

## Structure du Projet

```
gestion-backlinks/
├── back-end/                 # API Laravel
│   ├── app/
│   │   ├── Http/Controllers/
│   │   ├── Models/
│   │   └── Middleware/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/
└── front-end/                # SPA React
    ├── src/
    │   ├── api/            # Services API
    │   ├── components/     # Composants UI
    │   ├── contexts/       # React Context
    │   └── pages/          # Pages (Admin/Staff)
    └── public/
```

## Fonctionnalités Implémentées

✅ **Gestion des Utilisateurs**
- Authentification avec rôles Admin/Staff
- Middleware de protection des routes
- Dashboard différencié par rôle

✅ **Gestion des Clients**
- CRUD complet (admin only)
- Lecture seule pour dashboard staff

✅ **Gestion des Backlinks**
- CRUD avec détection de doublons
- Alerte de confirmation pour doublons
- Auto-remplissage quality/traffic depuis source

✅ **Rapports PDF/Excel**
- Génération par client et période
- Statistiques détaillées
- Export avec jsPDF et XLSX

✅ **Sécurité**
- Middleware AdminMiddleware et StaffMiddleware
- Validation des rôles côté backend
- Protection contre accès non autorisé

## Livrables

- ✅ Repository GitHub complet
- ✅ Migrations base de données
- ✅ Compte admin par défaut configuré
- ✅ Template CSV d'import inclus
- ✅ Documentation complète
- ✅ Interface React responsive
- ✅ Gestion des rôles Admin/Staff
- ✅ Détection automatique des doublons
- ✅ Export PDF/Excel fonctionnel

## Hors Périmètre

- ❌ Accès client externe
- ❌ API SEO tierce
- ❌ Automatisation de scraping
- ❌ Système de paiement
- ❌ Notifications email automatiques

## Développement

L'application suit une architecture MVC classique avec:
- Validation Laravel côté backend
- Gestion d'état React avec Context API
- Axios configuré avec intercepteur pour authentification
- Interface responsive avec CSS personnalisé
