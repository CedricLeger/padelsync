# Workflow: Sync Padel Emails → Google Calendar

## Objectif
Détecter automatiquement les emails d'invitation et de réservation de padel (Arena, TenUp/FFT, etc.) et créer les événements correspondants dans Google Calendar.

## Solution : Google Apps Script
Le code tourne sur les serveurs Google, gratuitement, sans aucune installation locale.

## Setup
Voir le guide complet : `appscript/README.md`

**Résumé :**
1. Créer une Google Sheet "Padel Sync"
2. Extensions > Apps Script → coller `appscript/Code.gs`
3. Exécuter `setup()` → autoriser Gmail + Calendar
4. C'est prêt (scan toutes les 5 min par défaut, configurable)

## Tools

| Fichier | Rôle |
|---------|------|
| `appscript/Code.gs` | Script complet (parsing + calendar + config + log) |
| `appscript/README.md` | Guide d'installation pas à pas |

## Formats d'email supportés

### Invitation match
**Body**: "Vous avez été invité(e) sur la réservation dans votre club, le DD/MM/YYYY HH:MM:SS sur le terrain TERRAIN_NAME, par NOM_INVITEUR."
**Événement** : `Padel - TERRAIN (Invitation)` | Couleur jaune

### Confirmation de réservation (Arena)
**Body**: "Nous vous confirmons votre réservation Padel dans notre centre, le DD/MM/YYYY HH:MM:SS."
**Événement** : `Padel - TERRAIN` ou `Padel` | Couleur verte

### Confirmation de réservation (TenUp / FFT)
**Expéditeur** : `contact@clients.fft.fr|Confirmation de votre réservation`
**Body**: "réservation du court de Padel (PADEL 1) le DD/MM/YYYY de HH:MM à HH:MM au CLUB, situé à VILLE, effectuée par NOM."
**Événement** : `Padel - TERRAIN (Réservation)` | Couleur verte
**Note** : l'heure de fin est explicite (pas de durée par défaut). Le lieu est le nom du club.
**Codes** : code d'entrée et code lumière extraits si présents (ex: ASPTT Martinique).
**Exemples** : ASPTT Martinique (avec codes), Tennis Club La Plaine, Tennis Club de Saint-Joseph.

### Confirmation de réservation (DoInSport)
**Expéditeur** : `doinsport.com`
**Body**: "réservation à CLUB... le DD/MM/YYYY à HH:MM sur la zone d'activité COURT pour la réservation de Padel - DURÉEmin."
**Événement** : `Padel - TERRAIN (Réservation)` | Couleur verte
**Note** : la durée est extraite de l'email (ex: "90min"), avec fallback sur MATCH_DURATION_MINUTES. Le lieu est le nom du club.
**Codes** : code d'accès (ex: 2323#) et code barrière (ex: 0340) extraits si présents.
**Exemples** : 97 PADEL (code accès), Ti'Padel (code accès + code barrière).

## Anti-doublon et enrichissement
Les emails traités reçoivent le label Gmail "PadelSync". La recherche exclut ce label. Pour retraiter un email, retirer le label.

**Enrichissement intelligent :** si un deuxième email concerne la même réservation (même créneau) mais contient des informations supplémentaires (lieu, terrain, codes d'accès), l'événement existant est mis à jour automatiquement au lieu d'être ignoré comme doublon.

## Configuration
Menu Google Sheets : **Padel Sync > Configuration**
- Expéditeurs (liste séparée par virgules, syntaxe `sender|sujet` pour filtrer par sujet)
- Durée du match (minutes)
- Fuseau horaire
- Calendrier cible
- Notification par email (on/off)

## Partage avec un ami
L'ami crée une copie du Google Sheet → lance `setup()` → autorise → terminé (2-3 min).

## Sécurité

- Les valeurs de configuration sont validées avant sauvegarde (whitelist de clés, validation de format)
- Le dialog de configuration injecte les valeurs côté client (pas de concaténation HTML côté serveur)
- Les expéditeurs sont validés avant utilisation dans les requêtes Gmail
- Les filtres sujet sont nettoyés pour prévenir l'injection de requête Gmail (guillemets et caractères spéciaux supprimés)
- Protection contre l'injection de formules dans Google Sheets (sujets d'email commençant par =, +, -, @)
- Le contenu des emails n'est pas loggé (seuls le sujet et l'ID sont enregistrés)
- Les messages d'erreur sont tronqués à 100 caractères dans les logs
- Les logs sont limités à 500 entrées (rotation automatique)
- Validation TIMEZONE supporte les formats 2 et 3 parties (ex: America/Argentina/Buenos_Aires)
- Validation CALENDAR_ID restreinte au format email ou "primary"

## Limitations connues

- **Pas de gestion des annulations** : si Arena envoie un email d'annulation, l'événement n'est pas supprimé automatiquement
- **Formats email limités** : le parser fallback accepte tout email contenant "réservation/confirmation...le DD/MM/YYYY [à] HH:MM", mais les formats très différents pourraient nécessiter un nouveau parseur
- **Extraction du lieu** : Arena → "Arena + premier mot", TenUp → nom du club, DoInSport → nom du club depuis "réservation à CLUB"
- **Timeout sur gros volumes** : le scan s'arrête proprement après 5 minutes. Les emails restants sont traités au scan suivant

## Troubleshooting

| Problème | Solution |
|----------|----------|
| Email non reconnu | Vérifier le format, adapter les regex dans `Code.gs` |
| Mauvais fuseau | Padel Sync > Configuration |
| Retraiter un email | Retirer le label "PadelSync" dans Gmail |
| Nouveau format email | Ajouter un parseur dans `Code.gs` et le référencer dans `parseEmail()` |
| Vérifier que tout marche | Padel Sync > Health Check |
| Événement en doublon | Le script détecte les doublons automatiquement |

## Roadmap

### Phase 1 (actuelle) - Usage personnel — v1.5.0
- Google Apps Script avec polling toutes les 5 min (configurable)
- Configuration via interface Google Sheets
- Log dans la feuille "Log Sync" (rotation automatique)
- Détection de doublons avec enrichissement intelligent (lieu, terrain, codes)
- Retry automatique sur erreurs transitoires
- Health check intégré
- Validation de la configuration et protection contre les injections
- Support multi-plateforme : Arena, TenUp/FFT, DoInSport
- Extraction des codes d'accès (entrée, lumière, accès, barrière)
- Extraction automatique de la durée depuis l'email

### Phase 2 - Amis
- Partage via lien de copie Google Sheet
- Chaque ami a sa propre instance

### Phase 3 - Commercialisation
- Publier comme Google Workspace Add-on
- Support multi-plateforme (pas seulement Arena)
