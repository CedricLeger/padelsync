# Padel Sync — Guide d'installation

Synchronise automatiquement les emails de padel (Arena, TenUp/FFT, etc.) vers Google Calendar.

## Installation (5 minutes)

### Étape 1 : Créer la Google Sheet

1. Va sur [Google Sheets](https://sheets.google.com) et crée une nouvelle feuille
2. Nomme-la **"Padel Sync"**

### Étape 2 : Ajouter le script

1. Dans la Google Sheet, clique sur **Extensions > Apps Script**
2. L'éditeur de code s'ouvre dans un nouvel onglet
3. **Supprime tout** le contenu du fichier `Code.gs`
4. Copie-colle le contenu complet du fichier `Code.gs` de ce dossier
5. Clique sur **💾 Enregistrer** (ou Ctrl+S)

### Étape 3 : Lancer le setup

1. Dans l'éditeur Apps Script, sélectionne la fonction **`setup`** dans le menu déroulant en haut
2. Clique sur **▶ Exécuter**
3. Google va te demander d'autoriser l'accès :
   - Clique **"Examiner les autorisations"**
   - Choisis ton compte Google
   - Clique **"Avancé"** puis **"Accéder à Padel Sync (non sécurisé)"**
     (c'est normal — le script n'est pas vérifié par Google car c'est ton propre script)
   - Autorise l'accès Gmail + Calendar
4. Le setup va :
   - Créer un label Gmail **"PadelSync"**
   - Créer un trigger automatique (toutes les 5 minutes par défaut, configurable)
   - Créer une feuille de log "Log Sync" dans le Sheet

### Étape 4 : Vérifier

1. Retourne sur ta Google Sheet → tu devrais voir un onglet **"Log Sync"**
2. Dans le menu en haut de la Sheet, tu devrais voir **"Padel Sync"**
3. Clique sur **Padel Sync > Scanner maintenant** pour un premier test
4. Vérifie ton Google Calendar : les matchs devraient apparaître !

## C'est prêt !

Le script tourne maintenant en arrière-plan. Toutes les 5 minutes (par défaut), il vérifie s'il y a de nouveaux emails de padel et crée les événements automatiquement.

## Configuration

- Dans Google Sheets : **Padel Sync > Configuration**
- Tu peux modifier : les expéditeurs (syntaxe `sender|sujet` pour filtrer), la durée du match, le fuseau horaire, le calendrier cible

## Partager avec un ami

1. Ouvre ta Google Sheet "Padel Sync"
2. Fais **Fichier > Créer une copie**
3. Partage le lien de la copie à ton ami
4. L'ami ouvre le Sheet, va dans **Extensions > Apps Script**, lance **setup()**, autorise, et c'est parti

Ou plus simple : donne-lui ce guide + le fichier `Code.gs`.

## Événements créés

| Type | Titre | Couleur |
|------|-------|---------|
| Invitation (Arena) | Padel - TERRAIN (Invitation) | 🟡 Jaune (Banane) |
| Réservation (Arena) | Padel - TERRAIN (Réservation) | 🟢 Vert (Sauge) |
| Réservation (TenUp/FFT) | Padel - TERRAIN (Réservation) | 🟢 Vert (Sauge) |

Chaque événement inclut :
- Durée : 1h30 (Arena) ou horaires explicites (TenUp)
- Lieu : Arena Martinique (Arena) ou nom du club (TenUp)
- Rappel : 1h avant (notification popup)
- Description : type, terrain, inviteur (si invitation)

## Health Check

Pour vérifier que tout fonctionne : **Padel Sync > Health Check**

Le health check vérifie :
- Le trigger automatique est actif
- Le label Gmail "PadelSync" existe
- Le calendrier est accessible
- La date du dernier scan

## Troubleshooting

| Problème | Solution |
|----------|----------|
| Pas d'événement créé | Vérifie dans Gmail que le label "PadelSync" n'est PAS sur l'email (sinon il a déjà été traité) |
| Le menu "Padel Sync" n'apparaît pas | Recharge la page du Sheet (F5) |
| Erreur d'autorisation | Relance `setup()` et ré-autorise |
| Mauvais fuseau horaire | Padel Sync > Configuration > modifier le fuseau |
| Trop de triggers | Dans Apps Script, va dans ⏰ Déclencheurs (menu gauche), supprime les doublons |
| Retraiter un email | Dans Gmail, retire le label "PadelSync" de l'email concerné |
| Événement en doublon | Le script détecte les doublons automatiquement. Si un doublon apparaît, supprimer l'événement manuellement |

## Désinstallation

1. Dans Apps Script : ⏰ Déclencheurs → supprime le trigger `checkPadelEmails`
2. Dans Gmail : supprime le label "PadelSync" (optionnel)
3. Supprime la Google Sheet
