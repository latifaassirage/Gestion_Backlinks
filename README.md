# Gestion des Backlinks - Agence SEO

Application complète de gestion des backlinks pour agence SEO spécialisée dans les services de limousines.

## 🚀 Fonctionnalités

### Gestion des Clients
- **Company Name**: Nom de l'entreprise de limousine
- **Website**: Site web du client
- **City/State**: Localisation (optionnel)
- **Notes**: Notes internes (optionnel)
- **CRUD complet**: Créer, modifier, supprimer, rechercher
- **Pagination**: Navigation efficace

### Gestion des Sources
- **Domain**: Nom de domaine du site source
- **Quality Score**: Score de qualité 1-5 (obligatoire)
- **DR**: Domain Rating manuel (optionnel)
- **Traffic Estimé**: Traffic estimé manuel (optionnel)
- **Notes**: Notes internes (optionnel)
- **Visualisation**: Badges de qualité colorés

### Gestion des Backlinks
- **Client**: Sélection du client existant
- **Source**: Sélection du site source avec qualité affichée
- **Type**: Guest Post, Directory, Profile, Comment, Other
- **Target URL**: URL cible du backlink
- **Anchor Text**: Texte d'ancre utilisé
- **Placement URL**: URL exacte du placement
- **Date Ajout**: Date de création du backlink
- **Status**: Pending, Live, Lost
- **Coût**: Coût du backlink (0 = gratuit)

### ⚠️ Détection de Doublons
- **Alerte automatique**: Détecte si un client a déjà un backlink sur le même site source
- **Confirmation**: Permet de continuer ou d'annuler l'ajout
- **Prévention**: Évite les doublons dans la base de données

### 📊 Génération de Rapports
- **Par Client**: Sélection du client spécifique
- **Par Période**: Mois, trimestre, année, ou toutes périodes
- **Statistiques**: Total, Live, Lost, Pending, Payants, Gratuits
- **Export CSV**: Téléchargement en format CSV
- **Export Excel**: Téléchargement en format Excel (.xls)
- **Export PDF**: Impression formatée pour envoi aux clients
- **Résumé détaillé**: Coûts totaux et statistiques complètes

### 📁 Import/Export CSV/Excel
- **Import CSV**: Importation de backlinks depuis fichier CSV
- **Template CSV**: Template d'import fourni
- **Validation**: Vérification des données avant import
- **Export Excel**: Export des données en format Excel
- **Export CSV**: Export des données en format CSV
- **Export PDF**: Rapports formatés pour impression

### 👥 Dashboard
- **Statistiques en temps réel**: Clients, Sources, Backlinks, Coûts
- **Répartition par statut**: Live, Pending, Lost
- **Navigation rapide**: Accès direct à toutes les sections
- **Informations utilisateur**: Nom et rôle affichés

## 🔐 Gestion des Utilisateurs

### Admin
- **Accès complet**: Gestion de toutes les fonctionnalités
- **Clients**: Ajout, modification, suppression
- **Sources**: Ajout, modification, suppression
- **Backlinks**: Ajout, modification, suppression, import/export
- **Rapports**: Génération complète

### Staff
- **Backlinks**: Ajout et modification uniquement
- **Consultation**: Accès en lecture seule aux clients et sources
- **Rapports**: Génération autorisée

## 🛠 Stack Technique

### Backend
- **Framework**: Laravel 12
- **Base de données**: MySQL
- **Authentification**: Laravel Sanctum (JWT)
- **API**: RESTful avec validation
- **Permissions**: Gestion des rôles et permissions

### Frontend
- **Framework**: React 19
- **Routing**: React Router
- **HTTP Client**: Axios
- **State Management**: React Context
- **Styling**: CSS inline (responsive)

## 📁 Structure du Projet

```
gestion-backlinks/
├── back-end/                 # API Laravel
│   ├── app/
│   │   ├── Http/Controllers/
│   │   ├── Models/
│   │   └── Http/Middleware/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/
│   └── .env
├── front-end/               # Application React
│   ├── src/
│   │   ├── api/         # Services API
│   │   ├── components/  # Composants React
│   │   ├── context/     # AuthContext
│   │   ├── pages/       # Pages principales
│   │   ├── utils/       # Utilitaires CSV/Excel
│   │   └── utils/       # Utilitaires
│   └── public/
│       ├── index.html
│       ├── backlinks_template.csv
│       └── backlinks_import_template.csv
└── README.md
```

## 🚀 Installation

### Backend
```bash
cd back-end
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

### Frontend
```bash
cd front-end
npm install
npm start
```

## 🔑 Comptes par Défaut

### Admin
- **Email**: admin@backlinks.com
- **Password**: password
- **Rôle**: Accès complet à toutes les fonctionnalités

### Staff
- **Email**: staff@backlinks.com
- **Password**: password
- **Rôle**: Gestion des backlinks uniquement

## 📊 Templates

### Import CSV
Template disponible dans `/front-end/public/backlinks_import_template.csv` :

```csv
company_name,source_domain,type,target_url,anchor_text,placement_url,status,cost,added_date,notes
"Luxury Limousine NYC","forbes.com","Guest Post","https://luxurylimousinenyc.com/services","luxury limousine service nyc","https://forbes.com/luxury-transportation-guide","Live","500.00","2024-01-15","High authority placement"
```

### Format CSV Attendu
- **company_name**: Nom du client (doit exister dans la base)
- **source_domain**: Domaine de la source (doit exister dans la base)
- **type**: Guest Post, Directory, Profile, Comment, Other
- **target_url**: URL cible du backlink
- **anchor_text**: Texte d'ancre
- **placement_url**: URL exacte du placement
- **status**: Pending, Live, Lost
- **cost**: Coût numérique (ex: 500.00)
- **added_date**: Date (YYYY-MM-DD)
- **notes**: Notes optionnelles

## 🌐 Accès à l'Application

- **Backend API**: http://localhost:8000/api
- **Frontend**: http://localhost:3000
- **Login**: http://localhost:3000/login

## 📋 Fonctionnalités Clés

### ✅ Implémentées
- [x] Authentification JWT sécurisée
- [x] Gestion complète des clients
- [x] Gestion complète des sources avec scores de qualité
- [x] Gestion complète des backlinks avec détection de doublons
- [x] Importation CSV/Excel avec validation
- [x] Exportation en CSV, Excel et PDF
- [x] Génération de rapports détaillés
- [x] Dashboard avec statistiques en temps réel
- [x] Gestion des rôles et permissions
- [x] Interface responsive et moderne
- [x] Template d'import CSV fourni

### ❌ Hors Périmètre
- [ ] Accès client externe
- [ ] API SEO externes
- [ ] Automatisation externe
- [ ] Notifications par email

## 📞 Support

Pour toute question ou problème technique, consultez la documentation ou contactez l'équipe de développement.

---

**Application 100% fonctionnelle selon le cahier des charges** ✅
