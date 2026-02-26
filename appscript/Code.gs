// =============================================================================
// PADEL SYNC — Point d'entrée & orchestration
// =============================================================================
// Google Workspace Add-on qui synchronise les emails de réservation/invitation
// de padel vers Google Calendar.
//
// Architecture modulaire :
//   Config.gs        — Configuration, constantes, validateurs
//   Parsers.gs       — Parseurs d'emails (Arena, TenUp/FFT, DoInSport)
//   CalendarService.gs — Création/enrichissement d'événements Calendar
//   Utils.gs         — Fonctions utilitaires (retry, parsing, extraction)
//   SyncLogger.gs    — Logging dans UserProperties
//   Cards.gs         — Interface Card Service (homepage, config, health)
// =============================================================================

/**
 * Appelé automatiquement à l'installation de l'add-on.
 * Initialise la config utilisateur, crée le label Gmail et le trigger.
 * @param {Object} e - Événement d'installation.
 */
function onInstall(e) {
  var props = PropertiesService.getUserProperties();

  // Initialiser les User Properties avec les valeurs par défaut
  for (var key in DEFAULT_CONFIG) {
    if (!props.getProperty(key)) {
      props.setProperty(key, DEFAULT_CONFIG[key]);
    }
  }

  // Créer le label Gmail
  var config = getConfig();
  var label = GmailApp.getUserLabelByName(config.LABEL_NAME);
  if (!label) {
    GmailApp.createLabel(config.LABEL_NAME);
    Logger.log("Label Gmail '" + config.LABEL_NAME + "' créé.");
  }

  // Créer le trigger de scan
  var interval = parseInt(config.SCAN_INTERVAL_MINUTES, 10) || 5;
  recreateTrigger_(interval);

  Logger.log("=== Installation terminée pour " + Session.getActiveUser().getEmail() + " ===");
}

/**
 * Supprime les anciens triggers checkPadelEmails et en crée un nouveau.
 * Dans un add-on publié, getProjectTriggers() retourne uniquement
 * les triggers de l'utilisateur courant.
 * @param {number} intervalMinutes - Intervalle en minutes (1, 5, 10, 15 ou 30).
 */
function recreateTrigger_(intervalMinutes) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "checkPadelEmails") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  var valid = [1, 5, 10, 15, 30];
  if (valid.indexOf(intervalMinutes) === -1) {
    intervalMinutes = 5;
  }

  ScriptApp.newTrigger("checkPadelEmails")
    .timeBased()
    .everyMinutes(intervalMinutes)
    .create();

  Logger.log("Trigger créé : checkPadelEmails() toutes les " + intervalMinutes + " min.");
}

// ===== ORCHESTRATION PRINCIPALE =================================================

/**
 * Fonction principale — déclenchée par le trigger (toutes les 5 min par défaut).
 * Cherche les emails non traités, les parse et crée les événements.
 */
function checkPadelEmails() {
  var config = getConfig();
  var label = GmailApp.getUserLabelByName(config.LABEL_NAME);

  if (!label) {
    label = GmailApp.createLabel(config.LABEL_NAME);
  }

  var calendar = getCalendar_(config);

  var totalFound = 0;
  var totalCreated = 0;
  var totalEnriched = 0;
  var totalDuplicates = 0;
  var totalErrors = 0;

  var maxEmails = parseInt(config.MAX_EMAILS, 10) || 0;
  var BATCH_SIZE = 50;
  var startTime = new Date().getTime();
  var MAX_RUNTIME_MS = 5 * 60 * 1000;
  var timedOut = false;

  // Construire les scan jobs depuis la liste unifiée d'expéditeurs
  var scanJobs = [];
  var entries = config.ARENA_SENDERS.split(",");

  for (var s = 0; s < entries.length; s++) {
    var pipeIdx = entries[s].indexOf("|");
    var sender = pipeIdx === -1 ? entries[s].trim() : entries[s].substring(0, pipeIdx).trim();
    var subjectFilter = pipeIdx === -1 ? "" : entries[s].substring(pipeIdx + 1).trim();

    if (!sender || !SENDER_PATTERN.test(sender)) {
      Logger.log("Sender ignoré (format invalide): " + String(sender).substring(0, 50));
      continue;
    }

    var query = "from:" + sender + " -label:" + config.LABEL_NAME;
    if (subjectFilter) {
      var safeSubject = subjectFilter.replace(SUBJECT_FILTER_BLACKLIST, "");
      query += ' subject:"' + safeSubject + '"';
    }

    scanJobs.push({ query: query, parser: parseEmail });
  }

  for (var j = 0; j < scanJobs.length && !timedOut; j++) {
    var job = scanJobs[j];
    var jobQuery = job.query;

    var offset = 0;
    var processedThreads = 0;
    var threads;

    do {
      if (new Date().getTime() - startTime > MAX_RUNTIME_MS) {
        Logger.log("Limite de temps atteinte. Les emails restants seront traités au prochain scan.");
        timedOut = true;
        break;
      }

      var fetchSize = (maxEmails > 0) ? Math.min(BATCH_SIZE, maxEmails - processedThreads) : BATCH_SIZE;
      if (fetchSize <= 0) break;

      threads = GmailApp.search(jobQuery, offset, fetchSize);
      offset += threads.length;

      for (var t = 0; t < threads.length; t++) {
        processedThreads++;
        var messages = threads[t].getMessages();

        for (var m = 0; m < messages.length; m++) {
          var message = messages[m];
          totalFound++;

          try {
            var subject = message.getSubject();
            var plainBody = message.getPlainBody() || "";
            var htmlBody = message.getBody() || "";
            var parsed = job.parser(plainBody, htmlBody, subject, config);

            if (parsed) {
              var result = createPadelEvent(parsed, config, calendar);
              if (result === "duplicate") {
                totalDuplicates++;
                logSync_({
                  date: new Date(), subject: subject, type: parsed.type,
                  matchDate: parsed.start, court: parsed.court, status: "Doublon ignoré"
                }, config.TIMEZONE);
              } else if (result === "enriched") {
                totalEnriched++;
                logSync_({
                  date: new Date(), subject: subject, type: parsed.type,
                  matchDate: parsed.start, court: parsed.court, status: "Enrichi"
                }, config.TIMEZONE);
              } else {
                totalCreated++;
                logSync_({
                  date: new Date(), subject: subject, type: parsed.type,
                  matchDate: parsed.start, court: parsed.court, status: "Créé"
                }, config.TIMEZONE);
              }
            } else {
              Logger.log("Non reconnu — sujet: " + subject + " | id: " + message.getId());
              logSync_({
                date: new Date(), subject: subject, type: "?",
                matchDate: "", court: "", status: "Non reconnu"
              }, config.TIMEZONE);
            }
          } catch (e) {
            totalErrors++;
            Logger.log("Erreur sur email: " + e.message);
            logSync_({
              date: new Date(), subject: message.getSubject(), type: "?",
              matchDate: "", court: "", status: "Erreur: " + String(e.message).substring(0, 100)
            }, config.TIMEZONE);
          }
        }

        threads[t].addLabel(label);
      }
    } while (threads.length === fetchSize && (maxEmails === 0 || processedThreads < maxEmails) && !timedOut);
  }

  if (totalFound > 0) {
    Logger.log("Sync: " + totalFound + " email(s), " + totalCreated + " créé(s), " +
      totalEnriched + " enrichi(s), " + totalDuplicates + " doublon(s), " + totalErrors + " erreur(s).");

    if (config.NOTIFY_ON_CREATE === "true" && (totalCreated > 0 || totalEnriched > 0)) {
      MailApp.sendEmail(
        Session.getActiveUser().getEmail(),
        "Padel Sync : " + totalCreated + " match(s) ajouté(s)" +
          (totalEnriched > 0 ? ", " + totalEnriched + " enrichi(s)" : ""),
        totalCreated + " événement(s) ajouté(s) et " + totalEnriched +
          " enrichi(s) dans votre calendrier Google."
      );
    }
  }
}

// ===== HEALTH CHECK =============================================================

/**
 * Vérifie que le système fonctionne correctement.
 * Retourne un objet structuré (utilisable par les Cards).
 * @return {Object} Résultat du health check.
 */
function healthCheck_() {
  var results = {
    version: PADEL_SYNC_VERSION,
    trigger: false,
    label: false,
    calendar: null,
    calendarError: null,
    lastSync: null
  };

  // 1. Vérifier le trigger
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "checkPadelEmails") {
      results.trigger = true;
      break;
    }
  }

  // 2. Vérifier le label Gmail
  var config = getConfig();
  var label = GmailApp.getUserLabelByName(config.LABEL_NAME);
  results.label = !!label;

  // 3. Vérifier l'accès au calendrier
  try {
    var cal = getCalendar_(config);
    results.calendar = cal ? cal.getName() : null;
  } catch (e) {
    results.calendarError = e.message;
  }

  // 4. Dernier log
  var lastLogs = getSyncLog(1);
  if (lastLogs.length > 0) {
    results.lastSync = lastLogs[0].date;
  }

  return results;
}
