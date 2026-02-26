// =============================================================================
// PADEL SYNC — Parseurs d'emails
// =============================================================================

/**
 * Parse un email de padel et retourne les données du match.
 * Essaie tous les parseurs sur chaque source (plain text puis HTML converti).
 * Ordre : plus spécifique d'abord, plus générique en dernier.
 * @param {string} plainBody - Le corps texte brut de l'email.
 * @param {string} htmlBody - Le corps HTML de l'email.
 * @param {string} subject - Le sujet de l'email.
 * @param {Object} config - Configuration du script.
 * @return {Object|null} Les données parsées ou null si non reconnu.
 */
function parseEmail(plainBody, htmlBody, subject, config) {
  var sources = [plainBody, htmlToText_(htmlBody)];
  var parsers = [parseInvitation_, parseTenUpReservation_, parseReservation_];

  for (var i = 0; i < sources.length; i++) {
    var text = sources[i];
    if (!text) continue;

    for (var p = 0; p < parsers.length; p++) {
      var result = parsers[p](text, config);
      if (result) return result;
    }
  }

  return null;
}

/**
 * Parse un email d'invitation.
 * Pattern: "invité(e) sur la réservation dans votre club, le 18/02/2026 09:00:00
 *           sur le terrain PADEL 5 PANORAMIQUE 🏓 ARENA, par Jean Dupont."
 * @param {string} text - Le texte de l'email.
 * @param {Object} config - Configuration du script.
 */
function parseInvitation_(text, config) {
  var pattern = /invit[ée][\s\S]*?le\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})\s+sur\s+le\s+terrain\s+([\s\S]+?),\s*par\s+([\s\S]+?)\./i;
  var match = text.match(pattern);

  if (!match) return null;

  var dateStr = match[1];
  var timeStr = match[2];
  var courtRaw = match[3];
  var inviter = match[4].trim();

  var start = parseDateTime_(dateStr, timeStr, config.TIMEZONE);
  if (!start) return null;

  return {
    start: start,
    end: addMinutes_(start, config.MATCH_DURATION_MINUTES),
    court: cleanCourtName_(courtRaw),
    type: "invitation",
    inviter: inviter,
    location: extractLocation_(text)
  };
}

/**
 * Parse un email de confirmation de réservation.
 * Pattern: "confirmons votre réservation Padel dans notre centre, le 16/02/2026 12:00:00."
 * @param {string} text - Le texte de l'email.
 * @param {Object} config - Configuration du script.
 */
function parseReservation_(text, config) {
  var pattern = /(?:confirm|r[ée]servation)[\s\S]*?le\s+(\d{2}\/\d{2}\/\d{4})\s+(?:[àa]\s+)?(\d{2}:\d{2}(?::\d{2})?)/i;
  var match = text.match(pattern);

  if (!match) return null;

  var dateStr = match[1];
  var timeStr = match[2];

  var start = parseDateTime_(dateStr, timeStr, config.TIMEZONE);
  if (!start) return null;

  var court = extractCourtFromText_(text);
  var duration = extractDuration_(text) || parseInt(config.MATCH_DURATION_MINUTES, 10);
  var codes = extractCodes_(text);

  return {
    start: start,
    end: addMinutes_(start, duration),
    court: court,
    type: "reservation",
    inviter: "",
    location: extractLocation_(text),
    codes: codes
  };
}

/**
 * Parse un email de confirmation de réservation TenUp/FFT.
 * Pattern: "réservation du court de Padel (PADEL 1) le 15/11/2025 de 09:00 à 10:30
 *           au A.S. COUNTRY CLUB, situé à VILLE, effectuée par Marie MARTIN."
 * @param {string} text - Le texte de l'email.
 * @param {Object} config - Configuration du script.
 */
function parseTenUpReservation_(text, config) {
  var pattern = /r[ée]servation\s+du\s+court\s+de\s+[^(]+\(([^)]+)\)\s+le\s+(\d{2}\/\d{2}\/\d{4})\s+de\s+(\d{2}:\d{2})\s+[àa]\s+(\d{2}:\d{2})\s+au\s+([^,]+)/i;
  var match = text.match(pattern);

  if (!match) return null;

  var court = match[1].trim();
  var dateStr = match[2];
  var startTimeStr = match[3];
  var endTimeStr = match[4];
  var clubName = match[5].trim();

  var start = parseDateTime_(dateStr, startTimeStr, config.TIMEZONE);
  var end = parseDateTime_(dateStr, endTimeStr, config.TIMEZONE);
  if (!start || !end) return null;

  var cityMatch = text.match(/situ[ée]e?\s+[àa]\s+([^,.\n]+)/i);
  var city = cityMatch ? cityMatch[1].trim() : "";

  var bookerMatch = text.match(/effectu[ée]e?\s+par\s+([^,.]+)/i);
  var booker = bookerMatch ? bookerMatch[1].trim() : "";

  var location = city ? clubName + ", " + city : clubName;
  var codes = extractCodes_(text);

  return {
    start: start,
    end: end,
    court: court,
    type: "reservation",
    inviter: booker,
    location: location,
    codes: codes
  };
}
