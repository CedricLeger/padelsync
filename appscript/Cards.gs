// =============================================================================
// PADEL SYNC — Interface Card Service (Google Workspace Add-on)
// =============================================================================

/**
 * Homepage trigger — Point d'entrée principal de l'add-on.
 * Affiche le statut, les actions rapides et l'historique récent.
 * @param {Object} e - Événement add-on.
 * @return {Card} La card d'accueil.
 */
function onHomepage(e) {
  var config = getConfig();
  var health = healthCheck_();

  var card = CardService.newCardBuilder();

  // === Section Statut ===
  var statusSection = CardService.newCardSection()
    .setHeader("Statut");

  var triggerIcon = health.trigger ? "✓" : "✗";
  var triggerText = health.trigger ? "Trigger actif (toutes les " + config.SCAN_INTERVAL_MINUTES + " min)" : "Trigger absent — configurez l'add-on";
  statusSection.addWidget(CardService.newDecoratedText()
    .setText(triggerText)
    .setTopLabel("Scan automatique")
    .setStartIcon(CardService.newIconImage()
      .setIconUrl(health.trigger
        ? "https://www.gstatic.com/images/icons/material/system/1x/check_circle_googgreen_24dp.png"
        : "https://www.gstatic.com/images/icons/material/system/1x/error_googred_24dp.png")));

  var calText = health.calendar ? health.calendar : (health.calendarError || "Non configuré");
  statusSection.addWidget(CardService.newDecoratedText()
    .setText(calText)
    .setTopLabel("Calendrier"));

  if (health.lastSync) {
    statusSection.addWidget(CardService.newDecoratedText()
      .setText(health.lastSync)
      .setTopLabel("Dernière synchro"));
  }

  statusSection.addWidget(CardService.newDecoratedText()
    .setText("v" + PADEL_SYNC_VERSION)
    .setTopLabel("Version"));

  card.addSection(statusSection);

  // === Section Actions ===
  var actionsSection = CardService.newCardSection()
    .setHeader("Actions");

  actionsSection.addWidget(CardService.newTextButton()
    .setText("Scanner maintenant")
    .setOnClickAction(CardService.newAction().setFunctionName("triggerScanFromCard"))
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED));

  actionsSection.addWidget(CardService.newTextButton()
    .setText("Configuration")
    .setOnClickAction(CardService.newAction().setFunctionName("showConfigCard")));

  actionsSection.addWidget(CardService.newTextButton()
    .setText("Supprimer tous les événements")
    .setOnClickAction(CardService.newAction().setFunctionName("confirmDeleteEvents"))
    .setTextButtonStyle(CardService.TextButtonStyle.TEXT));

  card.addSection(actionsSection);

  // === Section Historique récent ===
  var logs = getSyncLog(5);
  if (logs.length > 0) {
    var historySection = CardService.newCardSection()
      .setHeader("Historique récent");

    for (var i = 0; i < logs.length; i++) {
      var entry = logs[i];
      var statusEmoji = entry.status === "Créé" ? "🟢" :
                        entry.status === "Enrichi" ? "🔵" :
                        entry.status === "Doublon ignoré" ? "⚪" :
                        entry.status.indexOf("Erreur") === 0 ? "🔴" : "🟡";
      historySection.addWidget(CardService.newDecoratedText()
        .setText(statusEmoji + " " + entry.status)
        .setTopLabel(entry.date + (entry.court ? " — " + entry.court : "")));
    }

    historySection.addWidget(CardService.newTextButton()
      .setText("Voir tout l'historique")
      .setOnClickAction(CardService.newAction().setFunctionName("showFullHistoryCard")));

    card.addSection(historySection);
  }

  return card.build();
}

// ===== CONFIGURATION CARD =====================================================

/**
 * Affiche la card de configuration.
 * @param {Object} e - Événement add-on.
 * @return {ActionResponse} Navigation vers la card de config.
 */
function showConfigCard(e) {
  var config = getConfig();
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Configuration"));

  var section = CardService.newCardSection();

  // Expéditeurs
  section.addWidget(CardService.newTextInput()
    .setFieldName("ARENA_SENDERS")
    .setTitle("Expéditeurs")
    .setHint("Ex: livexperience.fr, contact@fft.fr|Sujet")
    .setValue(config.ARENA_SENDERS));

  // Durée du match
  section.addWidget(CardService.newTextInput()
    .setFieldName("MATCH_DURATION_MINUTES")
    .setTitle("Durée d'un match (minutes)")
    .setHint("Ex: 90")
    .setValue(config.MATCH_DURATION_MINUTES));

  // Fuseau horaire
  section.addWidget(CardService.newTextInput()
    .setFieldName("TIMEZONE")
    .setTitle("Fuseau horaire")
    .setHint("Ex: Europe/Paris, America/Martinique")
    .setValue(config.TIMEZONE));

  // Calendrier
  section.addWidget(CardService.newTextInput()
    .setFieldName("CALENDAR_ID")
    .setTitle("ID du calendrier")
    .setHint("\"primary\" = calendrier principal")
    .setValue(config.CALENDAR_ID));

  // Max emails
  section.addWidget(CardService.newTextInput()
    .setFieldName("MAX_EMAILS")
    .setTitle("Emails max par scan")
    .setHint("0 = tous les emails")
    .setValue(config.MAX_EMAILS));

  // Intervalle de scan
  var scanDropdown = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName("SCAN_INTERVAL_MINUTES")
    .setTitle("Intervalle de scan")
    .addItem("1 minute", "1", config.SCAN_INTERVAL_MINUTES === "1")
    .addItem("5 minutes (recommandé)", "5", config.SCAN_INTERVAL_MINUTES === "5")
    .addItem("10 minutes", "10", config.SCAN_INTERVAL_MINUTES === "10")
    .addItem("15 minutes", "15", config.SCAN_INTERVAL_MINUTES === "15")
    .addItem("30 minutes", "30", config.SCAN_INTERVAL_MINUTES === "30");
  section.addWidget(scanDropdown);

  // Rappel
  var reminderDropdown = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName("REMINDER_MINUTES")
    .setTitle("Rappel avant le match")
    .addItem("Aucun rappel", "0", config.REMINDER_MINUTES === "0")
    .addItem("1 heure avant", "60", config.REMINDER_MINUTES === "60")
    .addItem("2 heures avant", "120", config.REMINDER_MINUTES === "120")
    .addItem("4 heures avant", "240", config.REMINDER_MINUTES === "240")
    .addItem("8 heures avant", "480", config.REMINDER_MINUTES === "480")
    .addItem("24 heures avant", "1440", config.REMINDER_MINUTES === "1440");
  section.addWidget(reminderDropdown);

  // Notification email
  var notifySwitch = CardService.newDecoratedText()
    .setText("Recevoir un email quand un match est ajouté")
    .setSwitchControl(CardService.newSwitch()
      .setFieldName("NOTIFY_ON_CREATE")
      .setValue("true")
      .setSelected(config.NOTIFY_ON_CREATE === "true"));
  section.addWidget(notifySwitch);

  // Bouton Sauvegarder
  section.addWidget(CardService.newTextButton()
    .setText("Enregistrer")
    .setOnClickAction(CardService.newAction().setFunctionName("saveConfigFromCard"))
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED));

  card.addSection(section);

  var nav = CardService.newNavigation().pushCard(card.build());
  return CardService.newActionResponseBuilder().setNavigation(nav).build();
}

/**
 * Sauvegarde la config depuis la card et retourne à la homepage.
 * @param {Object} e - Événement avec formInputs.
 * @return {ActionResponse} Notification + retour à la homepage.
 */
function saveConfigFromCard(e) {
  var inputs = e.formInputs || {};
  var newConfig = {};

  var fields = ["ARENA_SENDERS", "MATCH_DURATION_MINUTES", "TIMEZONE", "CALENDAR_ID",
                "MAX_EMAILS", "SCAN_INTERVAL_MINUTES", "REMINDER_MINUTES"];

  for (var i = 0; i < fields.length; i++) {
    var key = fields[i];
    if (inputs[key]) {
      // formInputs retourne des arrays — prendre la première valeur
      newConfig[key] = Array.isArray(inputs[key]) ? inputs[key][0] : inputs[key];
    }
  }

  // Le switch retourne la valeur si activé, undefined sinon
  newConfig.NOTIFY_ON_CREATE = inputs.NOTIFY_ON_CREATE ? "true" : "false";

  saveConfig(newConfig);

  var notification = CardService.newNotification()
    .setText("Configuration sauvegardée ✓");

  // Reconstruire la homepage pour refléter les changements
  var nav = CardService.newNavigation()
    .popToRoot()
    .updateCard(onHomepage(e));

  return CardService.newActionResponseBuilder()
    .setNotification(notification)
    .setNavigation(nav)
    .build();
}

// ===== ACTIONS ==================================================================

/**
 * Déclenche un scan manuel et affiche le résultat.
 * @param {Object} e - Événement add-on.
 * @return {ActionResponse} Notification avec le résultat du scan.
 */
function triggerScanFromCard(e) {
  checkPadelEmails();

  var lastLogs = getSyncLog(1);
  var message = lastLogs.length > 0
    ? "Scan terminé — " + lastLogs[0].status
    : "Scan terminé — aucun nouvel email trouvé";

  var notification = CardService.newNotification().setText(message);
  var nav = CardService.newNavigation().updateCard(onHomepage(e));

  return CardService.newActionResponseBuilder()
    .setNotification(notification)
    .setNavigation(nav)
    .build();
}

/**
 * Affiche une card de confirmation avant la suppression.
 * @param {Object} e - Événement add-on.
 * @return {ActionResponse} Navigation vers la card de confirmation.
 */
function confirmDeleteEvents(e) {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("Supprimer tous les événements"));

  var section = CardService.newCardSection();
  section.addWidget(CardService.newTextParagraph()
    .setText("Cette action va :\n" +
      "• Supprimer tous les événements contenant '" + PADEL_SYNC_MARKER + "' du calendrier\n" +
      "• Retirer le label PadelSync de tous les emails Gmail\n\n" +
      "Les emails seront retraités au prochain scan."));

  section.addWidget(CardService.newTextButton()
    .setText("Confirmer la suppression")
    .setOnClickAction(CardService.newAction().setFunctionName("executeDeleteEvents"))
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED));

  section.addWidget(CardService.newTextButton()
    .setText("Annuler")
    .setOnClickAction(CardService.newAction().setFunctionName("cancelAction")));

  card.addSection(section);

  var nav = CardService.newNavigation().pushCard(card.build());
  return CardService.newActionResponseBuilder().setNavigation(nav).build();
}

/**
 * Exécute la suppression de tous les événements padel.
 * @param {Object} e - Événement add-on.
 * @return {ActionResponse} Notification + retour à la homepage.
 */
function executeDeleteEvents(e) {
  var result = deleteAllPadelEvents_();

  var notification = CardService.newNotification()
    .setText("Purge terminée : " + result.message);

  var nav = CardService.newNavigation()
    .popToRoot()
    .updateCard(onHomepage(e));

  return CardService.newActionResponseBuilder()
    .setNotification(notification)
    .setNavigation(nav)
    .build();
}

/**
 * Annule une action et retourne en arrière.
 * @param {Object} e - Événement add-on.
 * @return {ActionResponse} Navigation pop.
 */
function cancelAction(e) {
  var nav = CardService.newNavigation().popCard();
  return CardService.newActionResponseBuilder().setNavigation(nav).build();
}

// ===== HISTORIQUE COMPLET ======================================================

/**
 * Affiche l'historique complet des synchronisations.
 * @param {Object} e - Événement add-on.
 * @return {ActionResponse} Navigation vers la card d'historique.
 */
function showFullHistoryCard(e) {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Historique des synchros"));

  var logs = getSyncLog(50);
  var section = CardService.newCardSection();

  if (logs.length === 0) {
    section.addWidget(CardService.newTextParagraph()
      .setText("Aucune synchronisation enregistrée."));
  } else {
    for (var i = 0; i < logs.length; i++) {
      var entry = logs[i];
      var statusEmoji = entry.status === "Créé" ? "🟢" :
                        entry.status === "Enrichi" ? "🔵" :
                        entry.status === "Doublon ignoré" ? "⚪" :
                        entry.status.indexOf("Erreur") === 0 ? "🔴" : "🟡";

      var label = entry.date;
      if (entry.court) label += " — " + entry.court;
      if (entry.matchDate) label += " (" + entry.matchDate + ")";

      section.addWidget(CardService.newDecoratedText()
        .setText(statusEmoji + " " + entry.status)
        .setTopLabel(label));
    }
  }

  section.addWidget(CardService.newTextButton()
    .setText("Effacer l'historique")
    .setOnClickAction(CardService.newAction().setFunctionName("clearHistoryFromCard")));

  card.addSection(section);

  var nav = CardService.newNavigation().pushCard(card.build());
  return CardService.newActionResponseBuilder().setNavigation(nav).build();
}

/**
 * Efface l'historique et retourne à la homepage.
 * @param {Object} e - Événement add-on.
 * @return {ActionResponse} Notification + retour.
 */
function clearHistoryFromCard(e) {
  clearSyncLog();

  var notification = CardService.newNotification().setText("Historique effacé ✓");
  var nav = CardService.newNavigation()
    .popToRoot()
    .updateCard(onHomepage(e));

  return CardService.newActionResponseBuilder()
    .setNotification(notification)
    .setNavigation(nav)
    .build();
}

// ===== GMAIL CONTEXTUAL TRIGGER ================================================

/**
 * Trigger contextuel Gmail — détecte si l'email ouvert est un email padel.
 * Affiche une card avec les infos parsées si l'email est reconnu.
 * @param {Object} e - Événement Gmail avec messageMetadata.
 * @return {Card} Card contextuelle ou null.
 */
function onGmailMessage(e) {
  var messageId = e.gmail.messageId;
  var message = GmailApp.getMessageById(messageId);
  if (!message) return null;

  var config = getConfig();
  var plainBody = message.getPlainBody() || "";
  var htmlBody = message.getBody() || "";
  var subject = message.getSubject();

  var parsed = parseEmail(plainBody, htmlBody, subject, config);

  if (!parsed) {
    // Pas un email padel — ne pas afficher de card
    return null;
  }

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("Match de padel détecté"));

  var section = CardService.newCardSection();

  section.addWidget(CardService.newDecoratedText()
    .setText(capitalize_(parsed.type))
    .setTopLabel("Type"));

  if (parsed.court) {
    section.addWidget(CardService.newDecoratedText()
      .setText(parsed.court)
      .setTopLabel("Terrain"));
  }

  var dateStr = Utilities.formatDate(parsed.start, config.TIMEZONE, "EEEE dd/MM/yyyy");
  var timeStr = Utilities.formatDate(parsed.start, config.TIMEZONE, "HH:mm") +
    " → " + Utilities.formatDate(parsed.end, config.TIMEZONE, "HH:mm");

  section.addWidget(CardService.newDecoratedText()
    .setText(dateStr)
    .setTopLabel("Date"));

  section.addWidget(CardService.newDecoratedText()
    .setText(timeStr)
    .setTopLabel("Horaire"));

  if (parsed.location) {
    section.addWidget(CardService.newDecoratedText()
      .setText(parsed.location)
      .setTopLabel("Lieu"));
  }

  if (parsed.inviter) {
    var label = parsed.type === "invitation" ? "Invité par" : "Réservé par";
    section.addWidget(CardService.newDecoratedText()
      .setText(parsed.inviter)
      .setTopLabel(label));
  }

  if (parsed.codes && parsed.codes.length > 0) {
    section.addWidget(CardService.newDecoratedText()
      .setText(parsed.codes.join("\n"))
      .setTopLabel("Codes d'accès"));
  }

  card.addSection(section);

  return card.build();
}
