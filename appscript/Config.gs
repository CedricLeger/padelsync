// =============================================================================
// PADEL SYNC — Configuration & constantes globales
// =============================================================================

var PADEL_SYNC_VERSION = "2.0.0";

var PADEL_SYNC_MARKER = "Synced by Padel Sync";
var SENDER_PATTERN = /^[\w.@-]+$/;

// Caractères interdits dans les filtres sujet (prévient l'injection de requête Gmail)
var SUBJECT_FILTER_BLACKLIST = /[""«»{}()[\]]/g;

// ===== CONFIGURATION PAR DÉFAUT ================================================

var DEFAULT_CONFIG = {
  ARENA_SENDERS: "livexperience.fr, contact@clients.fft.fr|Confirmation de votre réservation",
  MATCH_DURATION_MINUTES: "90",
  TIMEZONE: "Europe/Paris",
  CALENDAR_ID: "primary",
  LABEL_NAME: "PadelSync",
  NOTIFY_ON_CREATE: "false",
  MAX_EMAILS: "20",
  SCAN_INTERVAL_HOURS: "1",
  REMINDER_MINUTES: "60"
};

// ===== VALIDATEURS ==============================================================

var CONFIG_VALIDATORS = {
  ARENA_SENDERS: function(v) { return typeof v === "string" && v.length > 0 && v.length < 500; },
  MATCH_DURATION_MINUTES: function(v) { var n = parseInt(v, 10); return !isNaN(n) && n > 0 && n <= 480; },
  TIMEZONE: function(v) { return typeof v === "string" && /^[A-Za-z_]+(?:\/[A-Za-z_]+){1,2}$/.test(v); },
  CALENDAR_ID: function(v) { return v === "primary" || (typeof v === "string" && /^[\w.@-]+$/.test(v) && v.length < 200); },
  MAX_EMAILS: function(v) { var n = parseInt(v, 10); return !isNaN(n) && n >= 0 && n <= 500; },
  SCAN_INTERVAL_HOURS: function(v) { return [1, 2, 4, 6, 8, 12].indexOf(parseInt(v, 10)) !== -1; },
  REMINDER_MINUTES: function(v) { return [0, 60, 120, 240, 480, 1440].indexOf(parseInt(v, 10)) !== -1; },
  NOTIFY_ON_CREATE: function(v) { return v === "true" || v === "false"; }
};

// ===== FONCTIONS ================================================================

/**
 * Retourne la configuration depuis les User Properties.
 * Utilise les valeurs par défaut si non configurées.
 */
function getConfig() {
  var props = PropertiesService.getUserProperties();
  var config = {};
  for (var key in DEFAULT_CONFIG) {
    config[key] = props.getProperty(key) || DEFAULT_CONFIG[key];
  }
  return config;
}

/**
 * Résout le calendrier cible depuis la config.
 * @param {Object} config - Configuration du script.
 * @return {Calendar} Le calendrier Google.
 */
function getCalendar_(config) {
  if (config.CALENDAR_ID === "primary") {
    return CalendarApp.getDefaultCalendar();
  }
  return CalendarApp.getCalendarById(config.CALENDAR_ID);
}

/**
 * Sauvegarde la configuration depuis l'UI.
 * Valide chaque champ avant écriture (whitelist de clés + validateurs).
 * @param {Object} newConfig - Les nouvelles valeurs de configuration.
 * @return {string[]} Liste des clés avec des valeurs invalides (vide si tout est OK).
 */
function saveConfig(newConfig) {
  var props = PropertiesService.getUserProperties();
  var oldInterval = props.getProperty("SCAN_INTERVAL_HOURS") || DEFAULT_CONFIG.SCAN_INTERVAL_HOURS;
  var invalidKeys = [];

  for (var key in newConfig) {
    if (!CONFIG_VALIDATORS.hasOwnProperty(key)) {
      Logger.log("Config: clé ignorée (non autorisée) — " + key);
      continue;
    }
    if (!CONFIG_VALIDATORS[key](newConfig[key])) {
      invalidKeys.push(key);
      Logger.log("Config: valeur invalide pour " + key + " — " + String(newConfig[key]).substring(0, 50));
      continue;
    }
    props.setProperty(key, newConfig[key]);
  }

  // Recréer le trigger si l'intervalle a changé OU si aucun trigger n'existe
  var intervalChanged = newConfig.SCAN_INTERVAL_HOURS && newConfig.SCAN_INTERVAL_HOURS !== oldInterval;
  var triggerExists = ScriptApp.getProjectTriggers().some(function(t) {
    return t.getHandlerFunction() === "checkPadelEmails";
  });

  if (intervalChanged || !triggerExists) {
    var interval = parseInt(newConfig.SCAN_INTERVAL_HOURS || oldInterval, 10);
    recreateTrigger_(interval);
  }

  Logger.log("Configuration sauvegardée.");
  return invalidKeys;
}
