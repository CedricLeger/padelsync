// =============================================================================
// PADEL SYNC — Gestion du calendrier Google
// =============================================================================

/**
 * Crée un événement Google Calendar à partir des données parsées.
 * @param {Object} parsed - Données du match (start, end, court, type, inviter, location).
 * @param {Object} config - Configuration du script.
 * @param {Calendar} calendar - Objet calendrier déjà résolu.
 * @return {string} "created" | "enriched" | "duplicate"
 */
function createPadelEvent(parsed, config, calendar) {
  var existingEvent = findExistingEvent_(calendar, parsed.start, parsed.end);
  if (existingEvent) {
    return enrichEventIfNeeded_(existingEvent, parsed);
  }

  var summary = buildSummary_(parsed);
  var description = buildDescription_(parsed);

  var event = withRetry_(function() {
    return calendar.createEvent(summary, parsed.start, parsed.end, {
      description: description,
      location: parsed.location
    });
  });

  // Couleur : "5" = Banane (jaune) pour invitation, "2" = Sauge (vert) pour réservation
  if (parsed.type === "invitation") {
    event.setColor("5");
  } else {
    event.setColor("2");
  }

  // Rappel configurable
  var reminder = parseInt(config.REMINDER_MINUTES, 10);
  if (reminder > 0) {
    event.addPopupReminder(reminder);
  }

  Logger.log("Événement créé: " + summary + " le " + parsed.start);
  return "created";
}

/**
 * Construit le titre de l'événement Calendar.
 * @param {Object} parsed - Données du match (type, court, inviter).
 * @return {string} Le titre formaté.
 */
function buildSummary_(parsed) {
  if (parsed.type === "invitation") {
    var inviterSuffix = parsed.inviter ? " de " + parsed.inviter : "";
    return parsed.court
      ? "\uD83C\uDFBE Padel - " + parsed.court + " (Invitation" + inviterSuffix + ")"
      : "\uD83C\uDFBE Padel (Invitation" + inviterSuffix + ")";
  }
  return parsed.court
    ? "\uD83C\uDFBE Padel - " + parsed.court + " (Réservation)"
    : "\uD83C\uDFBE Padel (Réservation)";
}

/**
 * Construit la description de l'événement Calendar.
 * @param {Object} parsed - Données du match (type, court, inviter, location, codes).
 * @return {string} La description formatée.
 */
function buildDescription_(parsed) {
  var descLines = [];
  descLines.push("Type: " + capitalize_(parsed.type));
  if (parsed.court) descLines.push("Terrain: " + parsed.court);
  if (parsed.inviter) {
    var inviterLabel = parsed.type === "invitation" ? "Invité par" : "Réservé par";
    descLines.push(inviterLabel + ": " + parsed.inviter);
  }
  if (parsed.location) descLines.push("Lieu: " + parsed.location);
  if (parsed.codes && parsed.codes.length > 0) {
    descLines.push("");
    for (var c = 0; c < parsed.codes.length; c++) {
      descLines.push(parsed.codes[c]);
    }
  }
  descLines.push("");
  descLines.push("--- " + PADEL_SYNC_MARKER + " v" + PADEL_SYNC_VERSION + " ---");
  return descLines.join("\n");
}

/**
 * Cherche un événement Padel Sync existant sur le même créneau.
 * @param {Calendar} calendar - Calendrier à vérifier.
 * @param {Date} start - Début du créneau.
 * @param {Date} end - Fin du créneau.
 * @return {CalendarEvent|null} L'événement existant, ou null si aucun.
 */
function findExistingEvent_(calendar, start, end) {
  var events = calendar.getEvents(start, end, {search: "Padel"});
  for (var i = 0; i < events.length; i++) {
    var desc = events[i].getDescription() || "";
    if (desc.indexOf(PADEL_SYNC_MARKER) !== -1 &&
        events[i].getStartTime().getTime() === start.getTime()) {
      return events[i];
    }
  }
  return null;
}

/**
 * Compare un événement existant avec de nouvelles données parsées.
 * Met à jour l'événement si les nouvelles données sont plus riches.
 * @param {CalendarEvent} existingEvent - L'événement Calendar existant.
 * @param {Object} parsed - Données du match (court, location, codes, type, inviter).
 * @return {string} "duplicate" si rien à enrichir, "enriched" si mis à jour.
 */
function enrichEventIfNeeded_(existingEvent, parsed) {
  var existingDesc = existingEvent.getDescription() || "";
  var existingLocation = existingEvent.getLocation() || "";
  var hasNewInfo = false;

  if (!existingLocation && parsed.location) hasNewInfo = true;
  if (existingDesc.indexOf("Terrain:") === -1 && parsed.court) hasNewInfo = true;

  if (parsed.codes && parsed.codes.length > 0) {
    for (var i = 0; i < parsed.codes.length; i++) {
      if (existingDesc.indexOf(parsed.codes[i]) === -1) {
        hasNewInfo = true;
        break;
      }
    }
  }

  if (!hasNewInfo) {
    Logger.log("Doublon ignoré: Padel le " + parsed.start);
    return "duplicate";
  }

  var newSummary = buildSummary_(parsed);
  var newDescription = buildDescription_(parsed);

  withRetry_(function() {
    existingEvent.setTitle(newSummary);
    existingEvent.setDescription(newDescription);
    if (parsed.location) existingEvent.setLocation(parsed.location);
  });

  Logger.log("Événement enrichi: " + newSummary + " le " + parsed.start);
  return "enriched";
}

/**
 * Supprime tous les événements Padel du calendrier et retire les labels Gmail.
 * @return {Object} Résultat avec le nombre d'événements supprimés et emails réinitialisés.
 */
function deleteAllPadelEvents_() {
  var config = getConfig();
  var calendar = getCalendar_(config);

  var startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  var endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);

  var events = calendar.getEvents(startDate, endDate, {search: "Padel"});
  var deletedEvents = 0;

  for (var i = 0; i < events.length; i++) {
    var desc = events[i].getDescription() || "";
    if (desc.indexOf(PADEL_SYNC_MARKER) !== -1) {
      events[i].deleteEvent();
      deletedEvents++;
    }
  }

  var label = GmailApp.getUserLabelByName(config.LABEL_NAME);
  var resetThreads = 0;

  if (label) {
    var threads;
    do {
      threads = label.getThreads(0, 100);
      for (var t = 0; t < threads.length; t++) {
        threads[t].removeLabel(label);
        resetThreads++;
      }
    } while (threads.length === 100);
  }

  var message = deletedEvents + " événement(s) supprimé(s), " + resetThreads + " email(s) réinitialisé(s).";
  Logger.log("Purge: " + message);

  logSync_({
    date: new Date(),
    subject: "--- PURGE ---",
    type: "purge",
    matchDate: "",
    court: "",
    status: message
  }, config.TIMEZONE);

  return { deletedEvents: deletedEvents, resetThreads: resetThreads, message: message };
}
