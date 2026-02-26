# Padel Sync

Add-on Google Workspace qui synchronise automatiquement vos emails de réservation et d'invitation de padel vers Google Calendar.

## Comment ça marche

Padel Sync tourne sur Google Apps Script (gratuit, zéro infrastructure). Il scanne périodiquement votre boîte Gmail, détecte les emails de réservation/invitation padel, et crée les événements correspondants dans votre calendrier.

- **Invitations** → événement jaune avec le nom de l'inviteur
- **Réservations** → événement vert avec terrain, lieu et codes d'accès

## Fournisseurs supportés

| Fournisseur | Type | Expéditeur |
|-------------|------|------------|
| Arena | Invitations + Réservations | livexperience.fr |
| TenUp / FFT | Réservations | contact@clients.fft.fr |
| DoInSport | Réservations | doinsport.com |

## Installation

**Depuis le Google Workspace Marketplace :**
1. Installer Padel Sync depuis le Marketplace
2. Ouvrir Gmail — la sidebar Padel Sync apparaît
3. Configurer vos expéditeurs et préférences
4. C'est prêt (scan automatique toutes les 5 minutes)

## Architecture

```
appscript/
├── appsscript.json       # Manifest add-on (scopes, triggers, UI)
├── Code.gs               # Point d'entrée, orchestration
├── Cards.gs              # Interface Card Service (homepage, config, historique)
├── Config.gs             # Configuration, constantes, validateurs
├── Parsers.gs            # Parseurs d'emails (Arena, TenUp/FFT, DoInSport)
├── CalendarService.gs    # Création/enrichissement d'événements Calendar
├── Utils.gs              # Fonctions utilitaires
└── SyncLogger.gs         # Logging dans UserProperties
docs/
├── index.html            # Page d'accueil du site
├── privacy-policy.html   # Politique de confidentialité
├── terms-of-service.html # Conditions d'utilisation
└── support.html          # Support / FAQ
workflows/
└── sync_arena_emails.md  # Spécification du workflow
```

## Version

v2.0.0

## Liens

- [Politique de confidentialité](docs/privacy-policy.html)
- [Conditions d'utilisation](docs/terms-of-service.html)
- [Support / FAQ](docs/support.html)

## Licence

Open source — usage libre.
