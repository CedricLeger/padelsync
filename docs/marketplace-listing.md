# Padel Sync — Textes pour le Marketplace Listing

> Copier-coller ces textes dans la console GCP > Marketplace SDK > Store Listing

---

## Nom de l'application
Padel Sync

## Description courte (max 80 caractères)
Synchronise vos réservations de padel dans Google Calendar automatiquement.

## Description longue

Padel Sync synchronise automatiquement vos emails de réservation et d'invitation de padel dans Google Calendar.

**Fournisseurs supportés :**
- Arena (réservations et invitations)
- TenUp / FFT (confirmations de réservation)
- DoInSport (réservations)

**Fonctionnalités :**
- Scan automatique des emails (intervalle configurable : 1 à 30 min)
- Détection intelligente des réservations et invitations
- Extraction automatique : date, heure, terrain, lieu, codes d'accès
- Détection de doublons et enrichissement des événements existants
- Rappels configurables (1h, 2h, 4h, 8h ou 24h avant le match)
- Notification email optionnelle à chaque match ajouté
- Trigger contextuel Gmail : aperçu immédiat quand vous ouvrez un email padel
- Suppression et re-scan en un clic

**Vie privée :**
- Aucun serveur externe — tout reste dans votre compte Google
- Aucune donnée partagée avec des tiers
- Configuration stockée dans vos User Properties (isolée et privée)

**Gratuit et open source.**

## Catégorie
Productivity

## Langue principale
Français

---

## Justification des scopes OAuth

> À fournir dans la section "OAuth Consent Screen" ou lors du review Google.

| Scope | Justification |
|-------|---------------|
| `gmail.modify` | Lire les emails de réservation padel et gérer le label "PadelSync" pour marquer les emails traités. L'add-on n'envoie jamais d'emails au nom de l'utilisateur via ce scope. |
| `gmail.addons.execute` | Requis pour l'exécution de l'add-on dans Gmail (homepage et actions). |
| `gmail.addons.current.message.readonly` | Lire le contenu de l'email actuellement ouvert pour le trigger contextuel (détection de match padel). |
| `calendar` | Créer, modifier et supprimer les événements padel dans le calendrier de l'utilisateur. |
| `script.scriptapp` | Créer et gérer les triggers automatiques (scan périodique des emails). |

---

## URLs à renseigner

| Champ | URL |
|-------|-----|
| Site web | https://cedricleger.github.io/padelsync/ |
| Support | https://cedricleger.github.io/padelsync/support.html |
| Politique de confidentialité | https://cedricleger.github.io/padelsync/privacy-policy.html |
| Conditions d'utilisation | https://cedricleger.github.io/padelsync/terms-of-service.html |
