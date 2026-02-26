# Changelog

## [2.0.0] - 2026-02-25

Refonte complète pour publication en tant que Google Workspace Add-on sur le Marketplace.

### Architecture
- Découpage de Code.gs (1 139 lignes) en 7 modules : Code.gs, Cards.gs, Config.gs, Parsers.gs, CalendarService.gs, Utils.gs, SyncLogger.gs
- Migration PropertiesService : ScriptProperties → UserProperties (isolation multi-utilisateur)
- Remplacement de setup() par onInstall(e) (hook lifecycle add-on)
- Runtime V8 explicite dans le manifest

### Interface
- Nouvelle interface Card Service complète (remplace le sidebar HTML Sheets)
- Homepage card : statut du système, actions rapides, historique récent
- Configuration card : formulaire natif avec validation
- Health Check intégré dans la homepage
- Confirmation de suppression sur card dédiée
- Trigger contextuel Gmail : détecte et affiche les infos d'un email padel ouvert
- Historique complet consultable et effaçable

### Logging
- Nouveau système de logging dans UserProperties (JSON, max 50 entrées)
- Suppression de la dépendance à Google Sheets / SpreadsheetApp
- Suppression du scope spreadsheets (moins de permissions demandées)

### Multi-utilisateur
- Chaque utilisateur a sa propre configuration isolée (UserProperties)
- Triggers indépendants par utilisateur
- Compatible avec le consentement OAuth granulaire

### Publication
- Manifest appsscript.json complet (scopes, triggers, Card Service)
- Pages légales : politique de confidentialité, conditions d'utilisation, support/FAQ
- Site GitHub Pages avec page d'accueil
- Configuration clasp pour déploiement

### Changements cassants
- L'interface Google Sheets (menu, sidebar, log sheet) est supprimée
- La timezone par défaut passe de "America/Martinique" à "Europe/Paris"
- La variable VALIDATORS est renommée CONFIG_VALIDATORS
- deleteAllPadelEvents() est renommée deleteAllPadelEvents_() et retourne un objet au lieu d'utiliser l'UI Sheets

## [1.5.0] - 2026-02-20

Durcissement securite et factorisation pour preparation a la distribution.

### Securite
- Fix injection de requete Gmail via le filtre sujet (sanitization des guillemets et caracteres speciaux)
- Protection contre l'injection de formules dans Google Sheets (sujets d'email commencant par =, +, -, @)
- Troncature des messages d'erreur a 100 caracteres dans les logs sheet
- Validation TIMEZONE elargie : supporte les fuseaux 3 parties (ex: America/Argentina/Buenos_Aires)
- Validation CALENDAR_ID restreinte au format email ou "primary"

### Refactoring
- Constante `PADEL_SYNC_MARKER` pour le marqueur "Synced by Padel Sync" (elimine les strings dupliquees)
- Constante `SUBJECT_FILTER_BLACKLIST` pour les caracteres interdits dans les filtres sujet
- Helper `getCalendar_(config)` : resolution du calendrier factorisee (eliminee de checkPadelEmails, deleteAllPadelEvents, healthCheck)
- Helper `sanitizeForSheet_(value)` : protection generique contre l'injection de formules

## [1.4.0] - 2026-02-20

Enrichissement des doublons et factorisation du code.

### Fonctionnalites
- Les doublons avec des informations supplementaires enrichissent l'evenement existant au lieu d'etre ignores
- Champs enrichissables : lieu (location), terrain (court), codes d'acces
- Nouveau statut "Enrichi" dans les logs et notifications email

### Refactoring
- `buildSummary_(parsed)` : construction du titre extraite de `createPadelEvent`
- `buildDescription_(parsed)` : construction de la description extraite de `createPadelEvent`
- `findExistingEvent_(calendar, start, end)` remplace `isDuplicate_()` (retourne l'evenement au lieu d'un booleen)
- `enrichEventIfNeeded_(event, parsed)` : logique de comparaison et mise a jour
- `createPadelEvent` simplifie : delegation aux helpers, flux find → enrich-or-create

## [1.3.0] - 2026-02-19

Support DoInSport et extraction des codes d'acces.

### Fonctionnalites
- Support des emails DoInSport (97 PADEL, Ti'Padel, etc.) via le parser fallback elargi
- Extraction des codes d'acces dans la description Calendar : code d'entree, code lumiere (FFT), code d'acces, code barriere (DoInSport)
- Extraction automatique de la duree depuis l'email (ex: "90min"), priorite sur la config MATCH_DURATION_MINUTES
- Extraction du nom du club comme lieu pour les emails DoInSport (ex: "97 PADEL", "Ti'Padel")

### Parsing
- Regex du parser fallback `parseReservation_` elargie : accepte "a" entre date et heure, secondes optionnelles
- Nouveau helper `extractCodes_()` : detecte 4 types de codes (entree, lumiere, acces, barriere)
- Nouveau helper `extractDuration_()` : extrait la duree avec gardes (30-480 min, tiret obligatoire)
- `extractCourtFromText_()` : support du pattern "zone d'activite" (DoInSport)
- `extractLocation_()` : extraction du nom du club, fallback Arena conditionnel
- Ajout de `&rsquo;` dans le decodeur HTML

### Description des evenements
- Codes d'acces affiches dans la description (chaque code sur sa propre ligne)
- Lieu conditionnel (n'affiche plus "Lieu: Arena" par defaut quand non pertinent)

## [1.2.0] - 2026-02-19

Support multi-fournisseurs avec architecture unifiee.

### Fonctionnalites
- Support des emails TenUp/FFT (contact@clients.fft.fr) en plus d'Arena
- Parser TenUp : extrait terrain, horaires explicites (debut + fin), lieu (nom du club), reservant
- Syntaxe `sender|sujet` pour filtrer par sujet (ex: `contact@clients.fft.fr|Confirmation de votre reservation`)
- Migration automatique v1.1 → v1.2 dans setup() (fusion des anciens champs TenUp)

### Simplification
- Config unifiee : liste d'expediteurs unique au lieu de champs Arena + TenUp separes (11 → 9 cles)
- Parser unifie `parseEmail()` remplace `parseArenaEmail()` + `parseTenUpEmail()` (auto-detection par regex)
- Boucle de scan unique avec parsing du pipe pour le filtre sujet
- Dialog de configuration simplifie (10 → 8 champs)
- Constante `SENDER_PATTERN` pour la validation des expediteurs

### Description des evenements
- Label contextuel : "Invite par" (invitation) vs "Reserve par" (reservation)

## [1.0.0] - 2026-02-19

Premiere release production apres audit complet de securite, performance et robustesse.

### Securite
- Fix XSS dans le dialog de configuration (valeurs injectees cote client via JS)
- Validation stricte de la configuration au save (whitelist de cles + validateurs par champ)
- Protection contre l'injection Gmail query (validation du format des expediteurs)
- Suppression du log de contenu email (seuls sujet et ID sont logges)
- Rotation automatique des logs (max 500 entrees)

### Optimisation
- Elimination des appels redondants a `getConfig()` (~40+ appels inutiles par scan)
- Objet Calendar instancie une seule fois par scan (au lieu d'une fois par evenement)
- Simplification de `htmlToText_()` avec map d'entites (plus maintenable)
- Validation des dates/heures parsees (gardes NaN + verification de plages)

### Robustesse
- Detection des doublons d'evenements (evite la recreation si le label est retire)
- Retry automatique sur erreurs transitoires (2 tentatives avec delai)
- Garde de temps d'execution (arret propre a 5 min pour eviter le timeout de 6 min)
- Fonction Health Check dans le menu (verifie trigger, label, calendrier, dernier log)
- Constante de version incluse dans la description des evenements

### Documentation
- Creation du README racine
- Correction des intervalles de scan dans la doc (1 min → 5 min par defaut)
- Ajout section Health Check dans le guide d'installation
- Ajout sections Securite et Limitations connues dans le workflow
- Note projet dans CLAUDE.md (Apps Script, pas Python)
- Creation du CHANGELOG
