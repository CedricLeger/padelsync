// =============================================================================
// PADEL SYNC — Système de logging
// =============================================================================
// Stocke l'historique des synchros dans les UserProperties (JSON).
// Remplace le logging Google Sheets pour fonctionner en mode add-on standalone.

var MAX_LOG_ENTRIES = 50;
var LOG_PROPERTY_KEY = "SYNC_LOG";

/**
 * Ajoute une entrée dans le log de synchronisation.
 * Stocké dans UserProperties sous forme de JSON array.
 * Rotation automatique : conserve les MAX_LOG_ENTRIES dernières entrées.
 * @param {Object} data - Données à logger (date, subject, type, matchDate, court, status).
 * @param {string} timezone - Fuseau horaire pour formater les dates.
 */
function logSync_(data, timezone) {
  try {
    var props = PropertiesService.getUserProperties();
    var logRaw = props.getProperty(LOG_PROPERTY_KEY);
    var log = logRaw ? JSON.parse(logRaw) : [];

    var entry = {
      date: Utilities.formatDate(data.date, timezone, "dd/MM/yyyy HH:mm"),
      subject: truncate_(data.subject, 80),
      type: data.type || "?",
      matchDate: data.matchDate ? Utilities.formatDate(data.matchDate, timezone, "dd/MM/yyyy HH:mm") : "",
      court: truncate_(data.court, 40),
      status: data.status
    };

    log.push(entry);

    // Rotation : garder les N dernières entrées
    if (log.length > MAX_LOG_ENTRIES) {
      log = log.slice(log.length - MAX_LOG_ENTRIES);
    }

    props.setProperty(LOG_PROPERTY_KEY, JSON.stringify(log));
  } catch (e) {
    Logger.log("Erreur logging: " + e.message);
  }
}

/**
 * Retourne l'historique de synchronisation.
 * @param {number} [limit=20] - Nombre d'entrées à retourner.
 * @return {Object[]} Les dernières entrées de log (plus récentes en premier).
 */
function getSyncLog(limit) {
  limit = limit || 20;
  try {
    var props = PropertiesService.getUserProperties();
    var logRaw = props.getProperty(LOG_PROPERTY_KEY);
    if (!logRaw) return [];
    var log = JSON.parse(logRaw);
    return log.slice(-limit).reverse();
  } catch (e) {
    Logger.log("Erreur lecture log: " + e.message);
    return [];
  }
}

/**
 * Efface tout l'historique de synchronisation.
 */
function clearSyncLog() {
  PropertiesService.getUserProperties().deleteProperty(LOG_PROPERTY_KEY);
}

/**
 * Tronque une chaîne à la longueur spécifiée.
 * @param {string} str - La chaîne à tronquer.
 * @param {number} maxLen - Longueur maximale.
 * @return {string} La chaîne tronquée.
 */
function truncate_(str, maxLen) {
  if (!str || typeof str !== "string") return "";
  return str.length > maxLen ? str.substring(0, maxLen) + "..." : str;
}
