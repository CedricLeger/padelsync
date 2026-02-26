// =============================================================================
// PADEL SYNC — Fonctions utilitaires
// =============================================================================

/**
 * Exécute une fonction avec retry automatique en cas d'erreur transitoire.
 * @param {Function} fn - Fonction à exécuter.
 * @param {number} [maxRetries=2] - Nombre max de tentatives après le premier échec.
 * @return {*} Le résultat de fn().
 */
function withRetry_(fn, maxRetries) {
  maxRetries = maxRetries || 2;
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return fn();
    } catch (e) {
      if (attempt === maxRetries) throw e;
      Logger.log("Tentative " + (attempt + 1) + " échouée, retry dans 2s: " + e.message);
      Utilities.sleep(2000);
    }
  }
}

/**
 * Convertit du HTML en texte brut.
 * Utilise une map d'entités pour un décodage maintenable.
 */
function htmlToText_(html) {
  if (!html) return "";

  var text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "");

  var ENTITIES = {
    "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">",
    "&#39;": "'", "&quot;": '"',
    "&eacute;": "é", "&egrave;": "è", "&agrave;": "à", "&ccedil;": "ç",
    "&ocirc;": "ô", "&ucirc;": "û", "&icirc;": "î", "&acirc;": "â",
    "&ecirc;": "ê", "&uuml;": "ü", "&Eacute;": "É",
    "&rsquo;": "'"
  };
  text = text.replace(/&[a-zA-Z]+;|&#\d+;/g, function(match) {
    if (ENTITIES[match]) return ENTITIES[match];
    var num = match.match(/^&#(\d+);$/);
    if (num) return String.fromCharCode(parseInt(num[1], 10));
    return match;
  });

  return text.replace(/\s+/g, " ").trim();
}

/**
 * Parse une date DD/MM/YYYY et une heure HH:MM:SS en objet Date,
 * en interprétant l'heure dans le fuseau horaire spécifié.
 */
function parseDateTime_(dateStr, timeStr, timezone) {
  var dateParts = dateStr.split("/");
  var timeParts = timeStr.split(":");

  if (dateParts.length !== 3 || timeParts.length < 2) return null;

  var day = parseInt(dateParts[0], 10);
  var month = parseInt(dateParts[1], 10) - 1;
  var year = parseInt(dateParts[2], 10);
  var hour = parseInt(timeParts[0], 10);
  var minute = parseInt(timeParts[1], 10);
  var second = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;

  if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(minute) || isNaN(second)) return null;
  if (day < 1 || day > 31 || month < 0 || month > 11 || year < 2020 || year > 2100) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;

  var naiveDate = new Date(year, month, day, hour, minute, second);
  if (isNaN(naiveDate.getTime())) return null;

  var inTargetTz = Utilities.formatDate(naiveDate, timezone, "yyyy/MM/dd/HH/mm/ss");
  var p = inTargetTz.split("/");
  var asSeenInTarget = new Date(
    parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10),
    parseInt(p[3], 10), parseInt(p[4], 10), parseInt(p[5], 10)
  );

  var offsetMs = naiveDate.getTime() - asSeenInTarget.getTime();
  return new Date(naiveDate.getTime() + offsetMs);
}

/**
 * Ajoute N minutes à une date.
 */
function addMinutes_(date, minutes) {
  return new Date(date.getTime() + parseInt(minutes, 10) * 60 * 1000);
}

/**
 * Nettoie le nom du terrain (supprime emojis et suffixe ARENA).
 */
function cleanCourtName_(raw) {
  return raw
    .replace(/[\u{1F3D3}\u{1F3BE}\u{26BD}\u{1F3F8}]/gu, "")
    .replace(/\s*ARENA\s*$/i, "")
    .trim();
}

/**
 * Extrait tous les codes d'accès trouvés dans le texte de l'email.
 * @param {string} text - Le texte de l'email.
 * @return {string[]} Tableau de lignes formatées.
 */
function extractCodes_(text) {
  var codes = [];

  var entryMatch = text.match(/code\s+d['\u2019]entr[ée]e\s*:\s*(\w+)/i);
  if (entryMatch) codes.push("Code d\u2019entr\u00e9e: " + entryMatch[1]);

  var lightMatch = text.match(/code\s+lumi[èe]re[^:]*:\s*(\w+)/i);
  if (lightMatch) codes.push("Code lumi\u00e8re: " + lightMatch[1]);

  var accessMatch = text.match(/code[\s\S]{0,60}?r[ée]servation\s*:\s*\b(\d{3,6}#?)/i);
  if (accessMatch) codes.push("Code d\u2019acc\u00e8s: " + accessMatch[1]);

  var barrierMatch = text.match(/(?:code\s+(?:barri[èe]re|[àa]\s+saisir))\s*:\s*(\w+)/i);
  if (barrierMatch) codes.push("Code barri\u00e8re: " + barrierMatch[1]);

  return codes;
}

/**
 * Extrait la durée d'un match depuis le texte de l'email.
 * @param {string} text - Le texte de l'email.
 * @return {number|null} Durée en minutes, ou null si non trouvée.
 */
function extractDuration_(text) {
  var match = text.match(/[-\u2013\u2014]\s*(\d+)\s*min/i);
  if (match) {
    var mins = parseInt(match[1], 10);
    if (mins >= 30 && mins <= 480) return mins;
  }
  match = text.match(/[-\u2013\u2014]\s*(\d+)\s*h\s*(\d{1,2})/i);
  if (match) {
    var hm = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    if (hm >= 30 && hm <= 480) return hm;
  }
  match = text.match(/[-\u2013\u2014]\s*(\d+)\s*h(?:\s|$|[.,])/i);
  if (match) {
    var h = parseInt(match[1], 10) * 60;
    if (h >= 30 && h <= 480) return h;
  }
  return null;
}

/**
 * Tente d'extraire le nom du terrain depuis le texte complet.
 */
function extractCourtFromText_(text) {
  var match = text.match(/terrain\s+([\s\S]+?)(?:\s*[,.]|\s*ARENA)/i);
  if (match) return cleanCourtName_(match[1]);
  match = text.match(/zone\s+d['\u2019]activit[ée]\s+(.+?)(?:\s+pour|\s*[,.])/i);
  if (match) return match[1].trim();
  return "";
}

/**
 * Extrait le lieu depuis le texte.
 */
function extractLocation_(text) {
  var match = text.match(/Arena\s+(\w+)/);
  if (match) return "Arena " + match[1];
  match = text.match(/r[ée]servation\s+[àa]\s+(.+?)\s+a\s+bien/i);
  if (match) return match[1].trim();
  if (/Arena/i.test(text)) return "Arena";
  return "";
}

/**
 * Capitalise la première lettre.
 */
function capitalize_(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
