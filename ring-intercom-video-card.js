/**
 * Ring Intercom Video Card - v2.0.0
 *
 * Two-way audio + video Lovelace card for Ring Intercom Video.
 * Companion to the ring-intercom-video custom component.
 *
 * Flow: the card can show a muted video preview without picking up.
 * "Pick up" then unmutes the visitor and attaches the microphone on the
 * same WebRTC session (no renegotiation), so two-way audio starts instantly.
 *
 * Schema:
 *   type: custom:ring-intercom-video-card
 *   entity: camera.xxx                    # required
 *   name: Interphone                      # optional, defaults to the camera friendly name
 *   icon: mdi:doorbell-video              # optional
 *   open_door_entity: button.xxx          # optional, the service is inferred from the domain
 *                                         # (button, input_button, lock, switch, input_boolean, script, scene, cover)
 *   open_door_action:                     # optional, advanced mode (overrides open_door_entity)
 *     service: script.turn_on             # optional, inferred from entity_id
 *     entity_id: script.xxx
 *     data: {...}
 *   ding_entity: event.xxx_ding           # optional, event.* or binary_sensor.* fired when someone rings
 *   language: es|en|ca|fr                 # optional, overrides HA language auto-detection
 *
 *   # Display
 *   video_mode: always|on_call            # on_call = video area hidden when nothing is streaming (default: always)
 *   video_max_height: 230px               # optional, caps video height (px, vh, %...)
 *   preview: visible|ring|off             # muted preview: when the card is on screen / only on ring / never (default: visible)
 *   preview_timeout: 60                   # seconds before an unattended preview stops, 0 = never (default: 60)
 *   answer_mode: inline|popup             # popup = full-screen overlay when picking up (default: inline)
 *
 *   # Call
 *   ptt_mode: hold|toggle                 # hold to talk, or tap to talk / tap to mute (default: hold)
 *   auto_hangup: 0                        # hang up after N seconds of inactivity, 0 = never (default: 0)
 *   hangup_when_hidden: true              # hang up when the tab / app goes to background (default: true)
 *   auto_reconnect: true                  # retry up to 3 times when the connection drops (default: true)
 *   ring_timeout: 30                      # seconds the card stays in "ringing" state (default: 30)
 *   ice_servers: ha|none                  # use the ICE servers configured in HA (default: ha)
 *
 *   # Door
 *   door_confirm: false                   # true = press and hold to open (default: false)
 *   door_hold_time: 1000                  # hold duration in ms (default: 1000)
 *
 * Deep link (e.g. from a notification): add ?ring_intercom=answer or ?ring_intercom=preview
 * to the dashboard URL (optionally &entity=camera.xxx when several cards are on the view).
 *
 * Legacy schema (auto-migrated): lock_entity -> open_door_entity, open_door -> open_door_action,
 * on_ring: live -> preview: ring
 *
 * Repo: https://github.com/cmos486/ring-intercom-video-card
 * License: Apache-2.0
 */

const CARD_VERSION = '2.0.0';
const CARD_TAG = 'ring-intercom-video-card';
const EDITOR_TAG = 'ring-intercom-video-card-editor';
const LOG_PREFIX = '[ring-intercom-video-card]';
const MAX_RECONNECTS = 3;

const DEFAULTS = {
  video_mode: 'always',
  preview: 'visible',
  preview_timeout: 60,
  answer_mode: 'inline',
  ptt_mode: 'hold',
  auto_hangup: 0,
  hangup_when_hidden: true,
  auto_reconnect: true,
  ring_timeout: 30,
  ice_servers: 'ha',
  door_confirm: false,
  door_hold_time: 1000,
};

// ---------- i18n ----------

const TRANSLATIONS = {
  es: {
    idle: 'Inactivo',
    connecting: 'Conectando...',
    in_call: 'En llamada',
    preview_status: 'Vista previa (sin sonido)',
    preview_badge: 'VISTA',
    tap_to_preview: 'Tocar para ver',
    close_preview: 'Cerrar vista previa',
    ringing: 'Estan llamando!',
    reconnecting: 'Reconectando...',
    auto_hangup_in: 'Colgado automatico en {s} s',
    auto_hung_up: 'Colgado automaticamente',
    ptt_button: 'Mantener para hablar',
    ptt_hold_active: 'Hablando...',
    ptt_toggle: 'Tocar para hablar',
    ptt_toggle_active: 'Tocar para silenciar',
    pick_up: 'Descolgar',
    open_door: 'Abrir puerta',
    hold_to_open: 'Mantener para abrir',
    hang_up: 'Colgar',
    door_opened: 'Puerta abierta',
    hung_up: 'Colgado',
    disconnected: 'Desconectado',
    error_opening: 'Error abriendo:',
    door_not_configured: 'Abrir puerta no configurado',
    error_service: 'service mal formado',
    error_prefix: 'Error:',
    error_ha: 'Error de HA:',
    error_answer: 'Error en answer:',
    // Editor
    editor_camera_label: 'Entidad camara (requerido)',
    editor_camera_help: 'Entidad camara del componente Ring Intercom Video.',
    editor_name_label: 'Nombre (opcional)',
    editor_ding_label: 'Entidad de timbre (opcional)',
    editor_ding_help: 'Ej. event.portero_ding de la integracion Ring. La tarjeta reacciona cuando llaman.',
    editor_language_label: 'Idioma (vacio = idioma de HA)',
    editor_section_display: 'Visualizacion',
    editor_section_call: 'Llamada',
    editor_section_door: 'Puerta',
    editor_video_mode_label: 'Zona de video',
    video_mode_always: 'Siempre visible',
    video_mode_on_call: 'Solo cuando hay video',
    editor_preview_label: 'Vista previa automatica',
    preview_visible: 'En cuanto se muestra la tarjeta',
    preview_ring: 'Solo cuando llaman',
    preview_off: 'Nunca (video al descolgar)',
    editor_preview_help: 'La vista previa no tiene sonido ni microfono. Descolgar activa el audio en ambos sentidos. El portero solo tiene un flujo: un unico dispositivo recibe la imagen a la vez.',
    editor_preview_timeout_label: 'Duracion maxima de la vista previa (0 = sin limite)',
    editor_answer_mode_label: 'Al descolgar',
    answer_inline: 'Quedarse en el panel',
    answer_popup: 'Abrir a pantalla completa',
    editor_ptt_mode_label: 'Microfono',
    ptt_mode_hold: 'Mantener para hablar',
    ptt_mode_toggle: 'Tocar para hablar / silenciar',
    editor_auto_hangup_label: 'Colgar tras inactividad (0 = nunca)',
    editor_auto_hangup_help: 'El contador se reinicia al hablar o abrir la puerta.',
    editor_hangup_hidden_label: 'Colgar cuando la app pasa a segundo plano',
    editor_auto_reconnect_label: 'Reconectar automaticamente si se corta',
    editor_ring_timeout_label: 'Duracion del timbre en la tarjeta',
    editor_door_confirm_label: 'Mantener pulsado para abrir (evita aperturas accidentales)',
    editor_door_hold_time_label: 'Duracion de la pulsacion',
    editor_advanced_toggle: 'Avanzado: accion personalizada para abrir puerta',
    editor_service_label: 'Servicio (ej. script.turn_on)',
    editor_action_entity_label: 'Entidad (opcional)',
    mic_insecure: 'Solo escucha: el microfono necesita HTTPS',
    mic_denied: 'Solo escucha: permiso de microfono denegado',
    mic_unavailable: 'Solo escucha: microfono no disponible',
    audio_unblock: 'Tocar para activar el sonido',
    editor_door_label: 'Entidad para abrir la puerta (opcional)',
    editor_door_help: 'Con la integracion Ring oficial es el boton "Abrir puerta" (button.*); con ring-mqtt, la cerradura (lock.*). Tambien vale un script o un switch: la tarjeta llama al servicio que toque.',
    editor_service_help: 'Si el servicio esta vacio, se deduce del dominio de la entidad. Sustituye a la entidad de arriba.',
  },
  en: {
    idle: 'Idle',
    connecting: 'Connecting...',
    in_call: 'In call',
    preview_status: 'Preview (muted)',
    preview_badge: 'PREVIEW',
    tap_to_preview: 'Tap to view',
    close_preview: 'Close preview',
    ringing: 'Someone is ringing!',
    reconnecting: 'Reconnecting...',
    auto_hangup_in: 'Auto hang-up in {s}s',
    auto_hung_up: 'Hung up automatically',
    ptt_button: 'Hold to talk',
    ptt_hold_active: 'Talking...',
    ptt_toggle: 'Tap to talk',
    ptt_toggle_active: 'Tap to mute',
    pick_up: 'Pick up',
    open_door: 'Open door',
    hold_to_open: 'Hold to open',
    hang_up: 'Hang up',
    door_opened: 'Door opened',
    hung_up: 'Hung up',
    disconnected: 'Disconnected',
    error_opening: 'Error opening:',
    door_not_configured: 'Open door not configured',
    error_service: 'malformed service',
    error_prefix: 'Error:',
    error_ha: 'HA error:',
    error_answer: 'Error in answer:',
    editor_camera_label: 'Camera entity (required)',
    editor_camera_help: 'Camera entity from the Ring Intercom Video component.',
    editor_name_label: 'Name (optional)',
    editor_ding_label: 'Ding entity (optional)',
    editor_ding_help: 'E.g. event.intercom_ding from the Ring integration. The card reacts when someone rings.',
    editor_language_label: 'Language (empty = HA language)',
    editor_section_display: 'Display',
    editor_section_call: 'Call',
    editor_section_door: 'Door',
    editor_video_mode_label: 'Video area',
    video_mode_always: 'Always visible',
    video_mode_on_call: 'Only when there is video',
    editor_preview_label: 'Automatic video preview',
    preview_visible: 'As soon as the card is shown',
    preview_ring: 'Only when someone rings',
    preview_off: 'Never (video on pick up)',
    editor_preview_help: 'The preview has no sound and no microphone. Picking up enables two-way audio. The intercom has a single stream: only one device gets the picture at a time.',
    editor_preview_timeout_label: 'Max preview duration (0 = no limit)',
    editor_answer_mode_label: 'When picking up',
    answer_inline: 'Stay in the dashboard',
    answer_popup: 'Open full screen',
    editor_ptt_mode_label: 'Microphone',
    ptt_mode_hold: 'Hold to talk',
    ptt_mode_toggle: 'Tap to talk / mute',
    editor_auto_hangup_label: 'Hang up after inactivity (0 = never)',
    editor_auto_hangup_help: 'The timer restarts each time you talk or open the door.',
    editor_hangup_hidden_label: 'Hang up when the app goes to the background',
    editor_auto_reconnect_label: 'Reconnect automatically if the connection drops',
    editor_ring_timeout_label: 'Ringing duration in the card',
    editor_door_confirm_label: 'Press and hold to open (prevents accidental unlocks)',
    editor_door_hold_time_label: 'Hold duration',
    editor_advanced_toggle: 'Advanced: custom open-door action',
    editor_service_label: 'Service (e.g. script.turn_on)',
    editor_action_entity_label: 'Entity (optional)',
    mic_insecure: 'Listen only: microphone needs HTTPS',
    mic_denied: 'Listen only: microphone permission denied',
    mic_unavailable: 'Listen only: microphone unavailable',
    audio_unblock: 'Tap to enable audio',
    editor_door_label: 'Open door entity (optional)',
    editor_door_help: 'With the official Ring integration this is the "Open door" button (button.*); with ring-mqtt it is the lock (lock.*). A script or a switch works too: the card calls the right service for it.',
    editor_service_help: 'Leave empty to infer it from the entity domain. Replaces the entity above.',
  },
  ca: {
    idle: 'Inactiu',
    connecting: 'Connectant...',
    in_call: 'En trucada',
    preview_status: 'Previsualitzacio (sense so)',
    preview_badge: 'VISTA',
    tap_to_preview: 'Tocar per veure',
    close_preview: 'Tancar previsualitzacio',
    ringing: 'Estan trucant!',
    reconnecting: 'Reconnectant...',
    auto_hangup_in: 'Penjada automatica en {s} s',
    auto_hung_up: 'Penjat automaticament',
    ptt_button: 'Mantenir per parlar',
    ptt_hold_active: 'Parlant...',
    ptt_toggle: 'Tocar per parlar',
    ptt_toggle_active: 'Tocar per silenciar',
    pick_up: 'Despenjar',
    open_door: 'Obrir porta',
    hold_to_open: 'Mantenir per obrir',
    hang_up: 'Penjar',
    door_opened: 'Porta oberta',
    hung_up: 'Penjat',
    disconnected: 'Desconnectat',
    error_opening: 'Error obrint:',
    door_not_configured: 'Obrir porta no configurat',
    error_service: 'servei mal format',
    error_prefix: 'Error:',
    error_ha: "Error d'HA:",
    error_answer: 'Error a la resposta:',
    editor_camera_label: 'Entitat camera (requerit)',
    editor_camera_help: 'Entitat camera del component Ring Intercom Video.',
    editor_name_label: 'Nom (opcional)',
    editor_ding_label: 'Entitat de timbre (opcional)',
    editor_ding_help: 'P.ex. event.porter_ding de la integracio Ring. La targeta reacciona quan truquen.',
    editor_language_label: "Idioma (buit = idioma d'HA)",
    editor_section_display: 'Visualitzacio',
    editor_section_call: 'Trucada',
    editor_section_door: 'Porta',
    editor_video_mode_label: 'Zona de video',
    video_mode_always: 'Sempre visible',
    video_mode_on_call: 'Nomes quan hi ha video',
    editor_preview_label: 'Previsualitzacio automatica',
    preview_visible: 'Quan es mostra la targeta',
    preview_ring: 'Nomes quan truquen',
    preview_off: 'Mai (video en despenjar)',
    editor_preview_help: "La previsualitzacio no te so ni microfon. Despenjar activa l'audio en els dos sentits. El porter nomes te un flux: un sol dispositiu rep la imatge alhora.",
    editor_preview_timeout_label: 'Durada maxima de la previsualitzacio (0 = sense limit)',
    editor_answer_mode_label: 'En despenjar',
    answer_inline: 'Quedar-se al tauler',
    answer_popup: 'Obrir a pantalla completa',
    editor_ptt_mode_label: 'Microfon',
    ptt_mode_hold: 'Mantenir per parlar',
    ptt_mode_toggle: 'Tocar per parlar / silenciar',
    editor_auto_hangup_label: "Penjar despres d'inactivitat (0 = mai)",
    editor_auto_hangup_help: 'El comptador es reinicia en parlar o obrir la porta.',
    editor_hangup_hidden_label: "Penjar quan l'app passa a segon pla",
    editor_auto_reconnect_label: 'Reconnectar automaticament si cau',
    editor_ring_timeout_label: 'Durada del timbre a la targeta',
    editor_door_confirm_label: 'Mantenir premut per obrir (evita obertures accidentals)',
    editor_door_hold_time_label: 'Durada de la pulsacio',
    editor_advanced_toggle: 'Avancat: accio personalitzada per obrir la porta',
    editor_service_label: 'Servei (p.ex. script.turn_on)',
    editor_action_entity_label: 'Entitat (opcional)',
    mic_insecure: 'Nomes escolta: el microfon necessita HTTPS',
    mic_denied: 'Nomes escolta: permis de microfon denegat',
    mic_unavailable: 'Nomes escolta: microfon no disponible',
    audio_unblock: 'Tocar per activar el so',
    editor_door_label: 'Entitat per obrir la porta (opcional)',
    editor_door_help: 'Amb la integracio Ring oficial es el boto "Obrir porta" (button.*); amb ring-mqtt, el pany (lock.*). Tambe val un script o un switch: la targeta crida el servei que toca.',
    editor_service_help: 'Si es deixa buit, es dedueix del domini de l\'entitat. Substitueix l\'entitat de dalt.',
  },
  fr: {
    idle: 'Inactif',
    connecting: 'Connexion…',
    in_call: 'En communication',
    preview_status: 'Aperçu (sans son)',
    preview_badge: 'APERÇU',
    tap_to_preview: 'Toucher pour voir',
    close_preview: 'Fermer l\'aperçu',
    ringing: 'On sonne !',
    reconnecting: 'Reconnexion…',
    auto_hangup_in: 'Raccrochage auto dans {s} s',
    auto_hung_up: 'Raccroché automatiquement',
    ptt_button: 'Maintenir pour parler',
    ptt_hold_active: 'Parlez…',
    ptt_toggle: 'Toucher pour parler',
    ptt_toggle_active: 'Toucher pour couper le micro',
    pick_up: 'Décrocher',
    open_door: 'Ouvrir la porte',
    hold_to_open: 'Maintenir pour ouvrir',
    hang_up: 'Raccrocher',
    door_opened: 'Porte ouverte',
    hung_up: 'Raccroché',
    disconnected: 'Déconnecté',
    error_opening: 'Erreur lors de l\'ouverture :',
    door_not_configured: 'Ouverture de porte non configurée',
    error_service: 'service mal formé',
    error_prefix: 'Erreur :',
    error_ha: 'Erreur HA :',
    error_answer: 'Erreur dans la réponse :',
    editor_camera_label: 'Entité caméra (requis)',
    editor_camera_help: 'Entité caméra du composant Ring Intercom Video.',
    editor_name_label: 'Nom (optionnel)',
    editor_ding_label: 'Entité de sonnerie (optionnel)',
    editor_ding_help: 'Ex. event.interphone_ding de l\'intégration Ring. La carte réagit quand on sonne.',
    editor_language_label: 'Langue (vide = langue de HA)',
    editor_section_display: 'Affichage',
    editor_section_call: 'Appel',
    editor_section_door: 'Porte',
    editor_video_mode_label: 'Zone vidéo',
    video_mode_always: 'Toujours visible',
    video_mode_on_call: 'Seulement quand il y a de la vidéo',
    editor_preview_label: 'Aperçu vidéo automatique',
    preview_visible: 'Dès que la carte est affichée',
    preview_ring: 'Seulement quand on sonne',
    preview_off: 'Jamais (vidéo au décroché)',
    editor_preview_help: 'L\'aperçu est sans son ni micro. Décrocher active l\'audio dans les deux sens. L\'interphone n\'a qu\'un flux : un seul appareil reçoit l\'image à la fois.',
    editor_preview_timeout_label: 'Durée max de l\'aperçu (0 = illimitée)',
    editor_answer_mode_label: 'Au décroché',
    answer_inline: 'Rester dans le tableau de bord',
    answer_popup: 'Ouvrir en plein écran',
    editor_ptt_mode_label: 'Micro',
    ptt_mode_hold: 'Maintenir pour parler',
    ptt_mode_toggle: 'Toucher pour parler / couper',
    editor_auto_hangup_label: 'Raccrocher après inactivité (0 = jamais)',
    editor_auto_hangup_help: 'Le compteur repart à chaque prise de parole ou ouverture de porte.',
    editor_hangup_hidden_label: 'Raccrocher quand l\'appli passe en arrière-plan',
    editor_auto_reconnect_label: 'Reconnexion automatique si la connexion tombe',
    editor_ring_timeout_label: 'Durée de la sonnerie dans la carte',
    editor_door_confirm_label: 'Maintenir appuyé pour ouvrir (évite les ouvertures par erreur)',
    editor_door_hold_time_label: 'Durée d\'appui',
    editor_advanced_toggle: 'Avancé : action personnalisée pour ouvrir la porte',
    editor_service_label: 'Service (ex. script.turn_on)',
    editor_action_entity_label: 'Entité (optionnel)',
    mic_insecure: 'Écoute seule : le micro nécessite HTTPS',
    mic_denied: 'Écoute seule : accès au micro refusé',
    mic_unavailable: 'Écoute seule : micro indisponible',
    audio_unblock: 'Toucher pour activer le son',
    editor_door_label: 'Entité d\'ouverture de porte (optionnel)',
    editor_door_help: 'Avec l\'intégration Ring officielle, c\'est le bouton « Ouvrir la porte » (button.*) ; avec ring-mqtt, la serrure (lock.*). Un script ou un interrupteur marche aussi : la carte appelle le bon service.',
    editor_service_help: 'Vide = déduit du domaine de l\'entité. Remplace l\'entité ci-dessus.',
  },
};

const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'ca', label: 'Català' },
];

function detectLanguage(hass, configLang) {
  if (configLang && TRANSLATIONS[configLang]) return configLang;
  const haLang = (hass && (hass.locale?.language || hass.language)) || '';
  const short = haLang.split('-')[0].toLowerCase();
  if (TRANSLATIONS[short]) return short;
  return 'en';
}

function t(lang, key) {
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}

// ---------- Helpers ----------

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Which service opens the door, per entity domain. Home Assistant's own Ring
// integration exposes the intercom opener as button.<device>_open_door;
// ring-mqtt publishes a lock.*; some people use a script or a relay switch.
const DOOR_SERVICE_BY_DOMAIN = {
  button: 'button.press',
  input_button: 'input_button.press',
  lock: 'lock.unlock',
  switch: 'switch.turn_on',
  input_boolean: 'input_boolean.turn_on',
  script: 'script.turn_on',
  scene: 'scene.turn_on',
  cover: 'cover.open_cover',
};
const DOOR_ENTITY_DOMAINS = Object.keys(DOOR_SERVICE_BY_DOMAIN);

function openDoorServiceFor(entityId) {
  if (typeof entityId !== 'string') return null;
  return DOOR_SERVICE_BY_DOMAIN[entityId.split('.')[0]] || null;
}

function migrateConfig(config) {
  let c = config || {};
  if (c.open_door && !c.open_door_action) {
    const { open_door, ...rest } = c;
    c = { ...rest, open_door_action: open_door };
  }
  // v1.2.2 and earlier stored the opener as lock_entity.
  if (c.lock_entity && !c.open_door_entity) {
    const { lock_entity, ...rest } = c;
    c = { ...rest, open_door_entity: lock_entity };
  }
  if (c.on_ring !== undefined) {
    const { on_ring, ...rest } = c;
    c = rest;
    if (on_ring === 'live' && (c.preview === undefined || c.preview === 'off')) c = { ...c, preview: 'ring' };
  }
  return c;
}

function resolveOpenDoorAction(config) {
  const action = config.open_door_action;
  if (action && (action.service || action.entity_id)) {
    // An entity alone is enough: the service is inferred from its domain.
    const service = action.service || openDoorServiceFor(action.entity_id);
    if (service) return { ...action, service };
  }
  const entity = config.open_door_entity || config.lock_entity;
  if (entity) {
    const service = openDoorServiceFor(entity);
    if (service) return { service, entity_id: entity };
  }
  return null;
}

function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (_) { /* not supported (iOS) */ }
}

async function loadHaComponents() {
  if (customElements.get('ha-form') && customElements.get('ha-entity-picker')) return;
  try {
    const helpers = await window.loadCardHelpers();
    const card = await helpers.createCardElement({ type: 'entities', entities: [] });
    await card.constructor.getConfigElement?.();
  } catch (err) {
    console.warn(LOG_PREFIX, 'Could not preload HA editor components:', err);
  }
}

// ---------- Styles ----------

const CARD_CSS = `
  /* Bubble Card look: reuses Bubble Card theme variables when present, HA theme otherwise */
  :host {
    display: block;
    --rv-radius: var(--bubble-border-radius, 32px);
    --rv-main-bg: var(--bubble-main-background-color, var(--background-color-2, var(--secondary-background-color, rgba(127, 127, 127, 0.12))));
    --rv-icon-bg: var(--bubble-icon-background-color, var(--card-background-color, rgba(127, 127, 127, 0.2)));
    --rv-icon-radius: var(--bubble-icon-border-radius, 50%);
    --rv-sub-bg: var(--bubble-sub-button-background-color, var(--card-background-color, rgba(127, 127, 127, 0.2)));
    --rv-sub-radius: var(--bubble-sub-button-border-radius, var(--rv-radius));
    --rv-accent: var(--bubble-accent-color, var(--accent-color, #03a9f4));
    --rv-shadow: var(--bubble-box-shadow, none);
    --rv-border: var(--bubble-border, none);
    --rv-green: var(--success-color, #43a047);
    --rv-red: var(--error-color, #db4437);
    --rv-orange: var(--warning-color, #ffa000);
  }
  ha-card { background: none; border: none; box-shadow: none; padding: 0; overflow: visible; }
  .container { display: flex; flex-direction: column; gap: 8px; font-family: var(--primary-font-family, inherit); }
  .bubble {
    position: relative; overflow: hidden;
    background: var(--rv-main-bg); border-radius: var(--rv-radius);
    box-shadow: var(--rv-shadow); border: var(--rv-border);
  }
  .bubble > * { position: relative; z-index: 1; }
  .bubble::before {
    content: ''; position: absolute; inset: 0; z-index: 0;
    opacity: 0; transition: opacity 0.3s, transform 0.25s ease-out, background 0.3s;
  }

  /* ---- Collapsible sections ---- */
  .collapse {
    display: grid; grid-template-rows: 1fr;
    transition: grid-template-rows 0.35s ease, opacity 0.3s ease, margin 0.35s ease;
  }
  .collapse-inner { min-height: 0; overflow: hidden; }
  [data-video="on_call"][data-mode="off"] .video-collapse { grid-template-rows: 0fr; opacity: 0; margin-bottom: -8px; }
  .door-collapse { grid-template-rows: 0fr; opacity: 0; margin-top: -8px; }
  [data-ringing] .door-collapse,
  [data-mode="preview"] .door-collapse,
  [data-mode="call"] .door-collapse { grid-template-rows: 1fr; opacity: 1; margin-top: 0; }

  /* ---- Video ---- */
  .video-wrap {
    position: relative; width: 100%; aspect-ratio: 4 / 3;
    max-height: var(--ring-video-max-height, none);
    border-radius: var(--rv-radius); overflow: hidden;
    background: radial-gradient(circle at 50% 40%, #1c1c1e 0%, #000 75%);
    box-shadow: var(--rv-shadow);
    -webkit-tap-highlight-color: transparent;
  }
  [data-mode="off"] .video-wrap { cursor: pointer; }
  video {
    display: block; width: 100%; height: 100%;
    object-fit: var(--ring-video-object-fit, contain);
    max-height: var(--ring-video-max-height, none);
    background: transparent;
  }
  .placeholder {
    position: absolute; inset: 0; display: flex; flex-direction: column; gap: 8px;
    align-items: center; justify-content: center;
    color: rgba(255, 255, 255, 0.3); pointer-events: none;
  }
  .placeholder ha-icon { --mdc-icon-size: 56px; }
  .ph-text { font-size: 13px; font-weight: 600; letter-spacing: 0.3px; }
  .ph-play, .ph-busy { display: inline-flex; }
  .ph-play { display: none; }
  [data-mode="off"] .ph-play { display: inline-flex; }
  [data-mode="off"] .ph-busy, [data-mode="preview"] .ph-text, [data-mode="call"] .ph-text { display: none; }
  .ph-busy { animation: breathe-icon 1.4s infinite; }
  .video-wrap.has-video .placeholder { display: none; }
  .live {
    position: absolute; top: 14px; left: 14px; display: none; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 999px;
    background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.6px;
  }
  .live .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rv-red); animation: blink 1.4s infinite; }
  .live .muted { --mdc-icon-size: 14px; display: none; align-items: center; }
  [data-mode="preview"] .live .dot { background: var(--rv-accent); }
  [data-mode="preview"] .live .muted { display: inline-flex; }
  [data-link="up"] .live { display: flex; }

  .unblock {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 3;
    display: flex; align-items: center; gap: 8px;
    padding: 10px 18px; border: none; border-radius: 999px;
    background: rgba(0, 0, 0, 0.55); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    color: #fff; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
  }
  .unblock ha-icon { --mdc-icon-size: 20px; }
  .unblock[hidden] { display: none; }

  /* ---- Header bubble ---- */
  .header {
    display: flex; align-items: center; gap: 10px;
    height: 56px; padding: 0 9px; box-sizing: border-box;
    container-type: inline-size;
  }
  [data-link="connecting"] .header::before { background: var(--rv-orange); opacity: 0.12; animation: breathe 1.4s infinite; }
  [data-mode="call"][data-link="up"] .header::before { background: var(--rv-green); opacity: 0.14; }
  [data-ringing] .header::before { background: var(--rv-accent); opacity: 0.2; animation: breathe 1s infinite; }

  .icon-bubble {
    width: 38px; height: 38px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    border-radius: var(--rv-icon-radius); background: var(--rv-icon-bg);
    color: var(--primary-text-color);
    transition: background 0.3s, color 0.3s;
  }
  .icon-bubble ha-icon { --mdc-icon-size: 22px; }
  [data-mode="preview"][data-link="up"] .header .icon-bubble { background: var(--rv-accent); color: #fff; }
  [data-link="connecting"] .header .icon-bubble { background: var(--rv-orange); color: #fff; }
  [data-mode="call"][data-link="up"] .header .icon-bubble { background: var(--rv-green); color: #fff; }
  [data-ringing] .header .icon-bubble { background: var(--rv-accent); color: #fff; }
  [data-ringing] .header .icon-bubble ha-icon { animation: shake 1.2s infinite; }

  .names { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .name, .state { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--primary-text-color); }
  .name { font-size: 13px; font-weight: 600; }
  .state { font-size: 12px; opacity: 0.7; }
  [data-ringing] .state { opacity: 1; font-weight: 600; }

  .subs { display: flex; gap: 6px; flex-shrink: 0; }
  .sub {
    height: 38px; min-width: 38px; padding: 0 14px 0 10px; box-sizing: border-box;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    border: none; border-radius: var(--rv-sub-radius);
    background: var(--rv-sub-bg); color: var(--primary-text-color);
    font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap;
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: background 0.2s, color 0.2s, opacity 0.2s, transform 0.1s;
  }
  .sub ha-icon { --mdc-icon-size: 20px; }
  .sub:active:not(:disabled) { transform: scale(0.94); }
  .sub:disabled { opacity: 0.4; cursor: not-allowed; }
  .sub.start { background: var(--rv-green); color: #fff; }
  .sub.hangup { background: var(--rv-red); color: #fff; }
  .sub.close { padding: 0; width: 38px; }
  .sub.close, .sub.hangup { display: none; }
  [data-mode="preview"] .sub.close { display: flex; }
  [data-mode="call"] .sub.hangup { display: flex; }
  [data-mode="call"] .sub.start { display: none; }
  [data-ringing] .sub.start { animation: ringpulse 1.2s infinite; }
  @container (max-width: 420px) {
    .sub { padding: 0; width: 38px; }
    .sub .lbl { display: none; }
  }

  /* ---- Door bubble (tap or hold) ---- */
  .door {
    display: flex; align-items: center; gap: 10px;
    height: 56px; padding: 0 9px; box-sizing: border-box;
    color: var(--primary-text-color); outline: none; cursor: pointer;
    user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent;
    transition: opacity 0.2s;
  }
  .door::before { background: var(--rv-orange); opacity: 0.3; transform: scaleX(var(--p, 0)); transform-origin: left; }
  .door.holding::before { transition: none; }
  .door .knob { background: var(--rv-orange); color: #fff; transition: transform 0.2s ease, background 0.3s; }
  .door.holding .knob { transform: scale(1.1); }
  .door-label { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .door[data-confirm="tap"]:active:not(.disabled) { transform: scale(0.98); }
  .door[data-confirm="hold"] { touch-action: none; -webkit-touch-callout: none; }
  .door.disabled { opacity: 0.45; cursor: not-allowed; }
  .door.success::before { background: var(--rv-green); transform: scaleX(1); }
  .door.success .knob { background: var(--rv-green); }
  .door.error::before { background: var(--rv-red); transform: scaleX(1); }

  /* ---- Push-to-talk, floating on the video ---- */
  .ptt {
    position: absolute; left: 50%; bottom: 16px; z-index: 2;
    transform: translateX(-50%);
    display: none; align-items: center; gap: 10px;
    height: 52px; padding: 0 22px 0 7px; box-sizing: border-box; max-width: calc(100% - 24px);
    border: none; border-radius: 999px;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(12px) saturate(140%); -webkit-backdrop-filter: blur(12px) saturate(140%);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    color: #fff; font: inherit; font-size: 14px; font-weight: 600; white-space: nowrap;
    cursor: pointer; user-select: none; -webkit-user-select: none;
    touch-action: none; -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none;
    transition: background 0.2s, transform 0.15s, opacity 0.2s;
  }
  [data-mode="call"] .ptt { display: flex; }
  .ptt .mic {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255, 255, 255, 0.18); transition: background 0.2s;
  }
  .ptt .mic ha-icon { --mdc-icon-size: 22px; }
  .ptt #ptt-label { overflow: hidden; text-overflow: ellipsis; }
  .ptt.ready .mic { background: var(--rv-accent); }
  .ptt.active {
    background: rgba(219, 68, 55, 0.72);
    background: color-mix(in srgb, var(--rv-red) 72%, transparent);
    transform: translateX(-50%) scale(1.05);
  }
  .ptt.active .mic { background: rgba(255, 255, 255, 0.25); animation: pulse 1.2s infinite; }
  .ptt:disabled { opacity: 0.55; cursor: not-allowed; }

  /* ---- Full-screen call overlay (answer_mode: popup) ---- */
  .popup {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
    box-sizing: border-box;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    animation: popin 0.25s ease;
  }
  .popup .container { width: min(560px, 100%); max-height: 100%; }
  .popup .video-wrap { max-height: calc(100vh - 220px); max-height: calc(100dvh - 220px); }
  .popup video { max-height: none; }

  @keyframes blink { 50% { opacity: 0.3; } }
  @keyframes breathe { 50% { opacity: 0.04; } }
  @keyframes breathe-icon { 50% { opacity: 0.35; } }
  @keyframes popin { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: none; } }
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.5); }
    70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
  }
  @keyframes ringpulse {
    0% { box-shadow: 0 0 0 0 rgba(67, 160, 71, 0.6); }
    70% { box-shadow: 0 0 0 12px rgba(67, 160, 71, 0); }
    100% { box-shadow: 0 0 0 0 rgba(67, 160, 71, 0); }
  }
  @keyframes shake {
    0%, 50%, 100% { transform: rotate(0); }
    10% { transform: rotate(-16deg); }
    20% { transform: rotate(14deg); }
    30% { transform: rotate(-10deg); }
    40% { transform: rotate(6deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before { animation: none !important; transition: none !important; }
  }
`;

// ---------- Main Card ----------

class RingIntercomVideoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._container = null;
    this._pc = null;
    this._sender = null;
    this._localStream = null;
    this._unsubscribe = null;
    this._sessionId = null;
    this._pendingCandidates = [];
    this._mode = 'off';         // off | preview (muted video) | call (two-way audio)
    this._link = 'down';        // down | connecting | up
    this._connecting = false;
    this._talking = false;
    this._pttHeld = false;
    this._ringing = false;
    this._micFailed = false;
    this._micError = null;
    this._retries = 0;
    this._timers = {};
    this._statusText = null;
    this._countdownShown = false;
    this._dingKey = undefined;
    this._doorBusy = false;
    this._inView = false;
    this._previewDismissed = false;
    this._popupHost = null;
    this._wakeLockSentinel = null;
    this._lang = 'en';
    this._onVisibility = this._onVisibility.bind(this);
    this._onLocation = () => this._checkUrlAction();
    this._onKey = (e) => { if (e.key === 'Escape' && this._popupHost) this._teardown(this._T('hung_up')); };
  }

  static async getConfigElement() {
    await loadHaComponents();
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig(hass) {
    const states = (hass && hass.states) || {};
    const ids = Object.keys(states);
    const cam = ids.find(
      (id) =>
        id.startsWith('camera.') &&
        (id.includes('intercom') || id.includes('interphone') || id.includes('entrada') ||
          states[id].attributes?.device_kind === 'intercom_handset_video')
    );
    const stub = { entity: cam || 'camera.your_ring_intercom' };
    // The Ring integration names its opener button.<device>_open_door: offer it when there is exactly one.
    const doors = ids.filter((id) => id.startsWith('button.') && id.endsWith('_open_door'));
    if (doors.length === 1) stub.open_door_entity = doors[0];
    // Ring "ding" event entities: device_class doorbell (entity id is localized, e.g. event.hall_sonnerie).
    const dings = ids.filter((id) => id.startsWith('event.') && states[id].attributes?.device_class === 'doorbell');
    if (dings.length === 1) stub.ding_entity = dings[0];
    return stub;
  }

  // ---- Lifecycle ----

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('You need to define an entity (camera.xxx)');
    }
    if (this._mode !== 'off') this._teardown();
    this._config = migrateConfig(config);
    this._dingKey = undefined;
    this._refreshLang();
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    const langBefore = this._lang;
    this._hass = hass;
    this._refreshLang();
    if (langBefore !== this._lang && this._container && this._mode === 'off') {
      this._render();
    } else {
      const nameEl = this._q('name');
      if (nameEl) {
        const name = this._displayName();
        if (nameEl.textContent !== name) nameEl.textContent = name;
      }
    }
    this._checkRing();
    if (first) {
      this._checkUrlAction();
      this._maybeAutoPreview();
    }
  }

  connectedCallback() {
    document.addEventListener('visibilitychange', this._onVisibility);
    window.addEventListener('location-changed', this._onLocation);
    window.addEventListener('popstate', this._onLocation);
    if ('IntersectionObserver' in window) {
      this._io = new IntersectionObserver((entries) => {
        this._inView = entries.some((e) => e.isIntersecting);
        this._maybeAutoPreview();
      }, { threshold: 0.25 });
      this._io.observe(this);
    } else {
      this._inView = true;
    }
    this._checkUrlAction();
  }

  disconnectedCallback() {
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.removeEventListener('location-changed', this._onLocation);
    window.removeEventListener('popstate', this._onLocation);
    if (this._io) { this._io.disconnect(); this._io = null; }
    this._inView = false;
    this._stopRinging();
    this._teardown();
  }

  getCardSize() {
    return this._opt('video_mode') === 'on_call' ? 2 : 6;
  }

  // ---- Small helpers ----

  _T(key) {
    return t(this._lang, key);
  }

  _q(id) {
    return this._container ? this._container.querySelector(`#${id}`) : null;
  }

  _opt(key) {
    const v = this._config ? this._config[key] : undefined;
    return v === undefined || v === null || v === '' ? DEFAULTS[key] : v;
  }

  _clearTimer(name) {
    if (this._timers[name] !== undefined) {
      clearTimeout(this._timers[name]);
      clearInterval(this._timers[name]);
      delete this._timers[name];
    }
  }

  _refreshLang() {
    if (!this._config) return;
    this._lang = detectLanguage(this._hass, this._config.language);
  }

  _displayName() {
    const c = this._config || {};
    if (c.name) return c.name;
    const st = this._hass && this._hass.states && this._hass.states[c.entity];
    return (st && st.attributes && st.attributes.friendly_name) || 'Ring Intercom';
  }

  /** True inside the dashboard editor: never open sessions from there. */
  _isEditorPreview() {
    return this.preview === true || this.editMode === true;
  }

  _status(text) {
    this._statusText = text;
    const el = this._q('status');
    if (el) el.textContent = text;
    console.log(LOG_PREFIX, text);
  }

  /** "In call", or why we are listen-only (no HTTPS, permission denied...). */
  _callStatus() {
    return !this._localStream && this._micFailed ? this._T(this._micError || 'mic_unavailable') : this._T('in_call');
  }

  /** Status to show when the stream is up. */
  _upStatus() {
    if (this._mode === 'call') return this._callStatus();
    return this._ringing ? this._T('ringing') : this._T('preview_status');
  }

  _pttLabel() {
    if (this._opt('ptt_mode') === 'toggle') {
      return this._talking ? this._T('ptt_toggle_active') : this._T('ptt_toggle');
    }
    return this._talking ? this._T('ptt_hold_active') : this._T('ptt_button');
  }

  _setLink(link) {
    this._link = link;
    this._applyState();
  }

  /** Reflect the internal state on the DOM. Visibility is handled by CSS attributes. */
  _applyState() {
    const c = this._container;
    if (!c) return;
    c.setAttribute('data-mode', this._mode);
    c.setAttribute('data-link', this._link);
    c.toggleAttribute('data-ringing', this._ringing && this._mode !== 'call');
    const video = this._q('video');
    if (video && this._mode !== 'call') { video.muted = true; this._hideAudioUnblock(); }
    const badge = this._q('live-label');
    if (badge) badge.textContent = this._mode === 'call' ? 'LIVE' : this._T('preview_badge');
    const start = this._q('start');
    if (start) start.disabled = this._mode === 'call';
    const hangup = this._q('hangup');
    if (hangup) hangup.disabled = this._mode !== 'call';
    const door = this._q('door');
    if (door) {
      const enabled = this._mode !== 'off' || this._ringing;
      door.classList.toggle('disabled', !enabled);
      door.setAttribute('aria-disabled', String(!enabled));
    }
    const ptt = this._q('ptt');
    if (ptt) {
      const ready = this._mode === 'call' && this._link === 'up';
      ptt.disabled = !ready;
      ptt.classList.toggle('ready', ready);
      ptt.classList.toggle('active', this._talking);
      const lbl = this._q('ptt-label');
      if (lbl) lbl.textContent = this._pttLabel();
    }
  }

  // ---- Rendering ----

  _render() {
    const T = (key) => this._T(key);
    const icon = escapeHtml((this._config && this._config.icon) || 'mdi:doorbell-video');
    const name = escapeHtml(this._displayName());
    const videoMode = this._opt('video_mode') === 'on_call' ? 'on_call' : 'always';
    const hasDoor = !!resolveOpenDoorAction(this._config);
    const hold = this._opt('door_confirm') === true;

    this.shadowRoot.innerHTML = `
      <style>${CARD_CSS}</style>
      <ha-card>
        <div class="container" data-mode="${this._mode}" data-link="${this._link}" data-video="${videoMode}">
          <div class="collapse video-collapse"><div class="collapse-inner">
            <div class="video-wrap" id="video-wrap">
              <video id="video" autoplay playsinline muted></video>
              <div class="placeholder">
                <span class="ph-play"><ha-icon icon="mdi:play-circle-outline"></ha-icon></span>
                <span class="ph-busy"><ha-icon icon="mdi:doorbell-video"></ha-icon></span>
                <span class="ph-text">${T('tap_to_preview')}</span>
              </div>
              <div class="live"><span class="dot"></span><span id="live-label">LIVE</span><span class="muted"><ha-icon icon="mdi:volume-off"></ha-icon></span></div>
              <button class="unblock" id="unblock" hidden>
                <ha-icon icon="mdi:volume-high"></ha-icon><span>${T('audio_unblock')}</span>
              </button>
              <button class="ptt" id="ptt" disabled>
                <span class="mic"><ha-icon icon="mdi:microphone"></ha-icon></span>
                <span id="ptt-label">${this._pttLabel()}</span>
              </button>
            </div>
          </div></div>
          <div class="header bubble">
            <div class="icon-bubble"><ha-icon icon="${icon}"></ha-icon></div>
            <div class="names">
              <div class="name" id="name">${name}</div>
              <div class="state" id="status">${escapeHtml(this._statusText || T('idle'))}</div>
            </div>
            <div class="subs">
              <button class="sub close" id="close" title="${T('close_preview')}" aria-label="${T('close_preview')}">
                <ha-icon icon="mdi:close"></ha-icon>
              </button>
              <button class="sub start" id="start" title="${T('pick_up')}">
                <ha-icon icon="mdi:phone"></ha-icon><span class="lbl">${T('pick_up')}</span>
              </button>
              <button class="sub hangup" id="hangup" disabled title="${T('hang_up')}">
                <ha-icon icon="mdi:phone-hangup"></ha-icon><span class="lbl">${T('hang_up')}</span>
              </button>
            </div>
          </div>
          ${hasDoor ? `
          <div class="collapse door-collapse"><div class="collapse-inner">
            <div class="door bubble disabled" id="door" role="button" tabindex="0"
                 aria-label="${T('open_door')}" data-confirm="${hold ? 'hold' : 'tap'}">
              <span class="icon-bubble knob"><ha-icon icon="mdi:door-open"></ha-icon></span>
              <span class="door-label" id="door-label">${hold ? T('hold_to_open') : T('open_door')}</span>
            </div>
          </div></div>` : ''}
        </div>
      </ha-card>
    `;
    this._card = this.shadowRoot.querySelector('ha-card');
    this._container = this.shadowRoot.querySelector('.container');

    // Optional video height limit (e.g. for small screens like Echo Show 5).
    const maxHeight = this._config && this._config.video_max_height;
    if (maxHeight) {
      this.style.setProperty('--ring-video-max-height', maxHeight);
      this.style.setProperty('--ring-video-object-fit', 'contain');
    } else {
      this.style.removeProperty('--ring-video-max-height');
      this.style.removeProperty('--ring-video-object-fit');
    }

    this._q('start').addEventListener('click', () => this._pickUp());
    this._q('hangup').addEventListener('click', () => this._teardown(this._T('hung_up')));
    this._q('close').addEventListener('click', () => this._stopPreview());
    this._q('unblock').addEventListener('click', (e) => { e.stopPropagation(); this._retryAudiblePlayback(); });
    // Self-heal: once audible playback runs by any route, the tap target goes away.
    this._q('video').addEventListener('playing', () => { if (!this._q('video').muted) this._hideAudioUnblock(); });
    this._q('video-wrap').addEventListener('click', (e) => {
      if (this._mode !== 'off' || e.target.closest('.ptt') || e.target.closest('.unblock')) return;
      this._previewDismissed = false;
      this._startPreview();
    });
    this._wirePtt();
    if (hasDoor) this._wireDoor();
    this._applyState();
  }

  _wirePtt() {
    const ptt = this._q('ptt');
    ptt.addEventListener('contextmenu', (e) => e.preventDefault());
    if (this._opt('ptt_mode') === 'toggle') {
      ptt.addEventListener('click', (e) => { e.stopPropagation(); this._talk(!this._talking); });
      return;
    }
    ptt.addEventListener('click', (e) => e.stopPropagation());
    const down = (e) => {
      e.stopPropagation();
      if (ptt.disabled || this._pttHeld) return;
      e.preventDefault();
      this._pttHeld = true;
      try { ptt.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      this._talk(true);
    };
    const up = () => {
      if (!this._pttHeld) return;
      this._pttHeld = false;
      this._talk(false);
    };
    ptt.addEventListener('pointerdown', down);
    ptt.addEventListener('pointerup', up);
    ptt.addEventListener('pointercancel', up);
    ptt.addEventListener('lostpointercapture', up);
    ['touchstart', 'touchmove'].forEach((ev) => ptt.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));
  }

  _wireDoor() {
    const door = this._q('door');
    door.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._openDoor(); }
    });
    if (door.dataset.confirm === 'tap') {
      door.addEventListener('click', () => this._openDoor());
      return;
    }
    // Hold to open: the bubble fills up while pressed, the door opens when it is full.
    const holdMs = Math.max(300, Number(this._opt('door_hold_time')) || DEFAULTS.door_hold_time);
    let raf = null;
    let t0 = 0;
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / holdMs);
      door.style.setProperty('--p', p.toFixed(3));
      if (p >= 1) {
        raf = null;
        door.classList.remove('holding');
        this._openDoor();
      } else {
        raf = requestAnimationFrame(step);
      }
    };
    const cancel = () => {
      if (raf === null) return;
      cancelAnimationFrame(raf);
      raf = null;
      door.classList.remove('holding');
      door.style.setProperty('--p', '0');
    };
    door.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (door.classList.contains('disabled') || this._doorBusy || raf !== null) return;
      e.preventDefault();
      try { door.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      t0 = performance.now();
      door.classList.add('holding');
      vibrate(15);
      raf = requestAnimationFrame(step);
    });
    door.addEventListener('pointerup', cancel);
    door.addEventListener('pointercancel', cancel);
    door.addEventListener('lostpointercapture', cancel);
    door.addEventListener('contextmenu', (e) => e.preventDefault());
    // Keep the gesture inside the card (no dashboard / sidebar gestures).
    ['touchstart', 'touchmove'].forEach((ev) => door.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));
  }

  _resetDoor() {
    const door = this._q('door');
    const label = this._q('door-label');
    if (!door) return;
    door.classList.remove('success', 'error');
    door.style.removeProperty('--p');
    if (label) label.textContent = door.dataset.confirm === 'hold' ? this._T('hold_to_open') : this._T('open_door');
  }

  // ---- Door ----

  async _openDoor() {
    const T = (key) => this._T(key);
    const door = this._q('door');
    if (!door || door.classList.contains('disabled') || this._doorBusy) return;
    const label = this._q('door-label');
    const action = resolveOpenDoorAction(this._config);
    if (!action || !action.service) { this._status(T('door_not_configured')); return; }
    const [domain, service] = action.service.split('.');
    if (!domain || !service) { this._status(T('error_service')); return; }
    this._doorBusy = true;
    try {
      const data = {};
      if (action.entity_id) data.entity_id = action.entity_id;
      Object.assign(data, action.data || {});
      await this._hass.callService(domain, service, data);
      door.classList.add('success');
      if (label) label.textContent = T('door_opened');
      vibrate([30, 60, 30]);
      this._armIdleTimer();
    } catch (err) {
      door.classList.add('error');
      if (label) label.textContent = `${T('error_opening')} ${err.message}`;
      console.error(LOG_PREFIX, 'openDoor failed:', err);
    } finally {
      setTimeout(() => {
        this._doorBusy = false;
        this._resetDoor();
      }, 2000);
    }
  }

  // ---- Ringing ----

  _checkRing() {
    const id = this._config && this._config.ding_entity;
    if (!id || !this._hass || !this._hass.states) return;
    const st = this._hass.states[id];
    if (!st) return;
    const key = `${st.state}|${st.last_changed}`;
    if (key === this._dingKey) return;
    const firstSeen = this._dingKey === undefined;
    this._dingKey = key;
    if (st.state === 'unavailable' || st.state === 'unknown') return;
    const isBinary = id.startsWith('binary_sensor.');
    if (isBinary && st.state !== 'on') return;

    const timeoutMs = (Number(this._opt('ring_timeout')) || DEFAULTS.ring_timeout) * 1000;
    if (!firstSeen) {
      // Seen live: trust the change itself, not the clocks.
      this._startRinging(timeoutMs);
      return;
    }
    // Card just loaded (e.g. opened from a notification): ring only if the ding is recent.
    let since = isBinary ? Date.parse(st.last_changed) : Date.parse(st.state);
    if (isNaN(since)) since = Date.parse(st.last_changed);
    if (isNaN(since)) return;
    const elapsed = Math.max(0, Date.now() - since);
    if (elapsed < timeoutMs) this._startRinging(timeoutMs - elapsed);
  }

  _startRinging(durationMs) {
    if (this._mode === 'call') return;
    this._ringing = true;
    this._clearTimer('ring');
    this._timers.ring = setTimeout(() => this._stopRinging(), durationMs);
    this._status(this._T('ringing'));
    this._applyState();
    vibrate([300, 150, 300, 150, 300]);
    if (this._opt('preview') !== 'off' && !this._isEditorPreview() && document.visibilityState === 'visible') {
      if (this._mode === 'off') this._startPreview();
      this._armPreviewTimer(durationMs);
    }
  }

  _stopRinging() {
    this._clearTimer('ring');
    if (!this._ringing) return;
    this._ringing = false;
    if (this._mode === 'off') this._status(this._T('idle'));
    else if (this._mode === 'preview' && this._link === 'up') this._status(this._T('preview_status'));
    this._applyState();
  }

  // ---- Preview ----

  _maybeAutoPreview() {
    if (!this._config || !this._hass || this._isEditorPreview()) return;
    const visible = this._inView && document.visibilityState === 'visible';
    if (!visible) {
      this._previewDismissed = false;
      if (this._mode === 'preview') this._teardown();
      return;
    }
    if (this._opt('preview') === 'visible' && this._mode === 'off' && !this._previewDismissed) {
      this._startPreview();
    }
  }

  _startPreview() {
    if (this._mode !== 'off' || !this._hass || !this._config) return;
    this._mode = 'preview';
    this._retries = 0;
    this._applyState();
    this._wakeLock(true);
    this._armPreviewTimer();
    this._startSession();
  }

  _stopPreview() {
    if (this._mode !== 'preview') return;
    this._previewDismissed = true;
    this._teardown();
  }

  _armPreviewTimer(minMs = 0) {
    this._clearTimer('preview');
    const ms = Math.max((Number(this._opt('preview_timeout')) || 0) * 1000, minMs);
    if (ms <= 0) return;
    this._timers.preview = setTimeout(() => {
      if (this._mode === 'preview') {
        this._previewDismissed = true;
        this._teardown();
      }
    }, ms);
  }

  // ---- Call lifecycle ----

  // ---- Audible playback ----
  // The video element always starts muted: muted playback is allowed by every autoplay
  // policy. Audible playback needs a user activation, and the Android WebView behind the
  // HA Companion app enforces it strictly (mediaPlaybackRequiresUserGesture). So: picture
  // first, then try to unmute; if the browser refuses (it pauses the element), stay muted
  // and offer a "tap to enable sound" button, the tap being the missing activation.

  _showAudioUnblock() {
    const btn = this._q('unblock');
    if (btn) btn.hidden = false;
  }

  _hideAudioUnblock() {
    const btn = this._q('unblock');
    if (btn) btn.hidden = true;
  }

  async _retryAudiblePlayback() {
    const video = this._q('video');
    if (!video) return;
    video.muted = false;
    try {
      await video.play();
      this._hideAudioUnblock();
    } catch (err) {
      console.warn(LOG_PREFIX, 'retry play() failed:', err && err.name);
      video.muted = true; // never trade a silent picture for no picture
      video.play().catch(() => {});
    }
  }

  _unmuteRemoteVideo() {
    const video = this._q('video');
    if (!video || !video.muted || this._mode !== 'call') return;
    const pcAtUnmute = this._pc;
    const cleanup = () => {
      video.removeEventListener('pause', onPause);
      clearTimeout(timer);
    };
    const onPause = () => {
      cleanup();
      if (!this._pc || this._pc !== pcAtUnmute || this._mode !== 'call') return;
      console.warn(LOG_PREFIX, 'Audible playback blocked, staying muted');
      video.muted = true;
      video.play().catch(() => {});
      this._showAudioUnblock();
    };
    const timer = setTimeout(cleanup, 1500);
    video.addEventListener('pause', onPause);
    video.muted = false;
    video.play().catch((err) => console.warn(LOG_PREFIX, 'unmute play() failed:', err && err.name));
  }

  /** Pick up: from scratch, or upgrade the running preview to two-way audio. */
  async _pickUp() {
    if (this._mode === 'call' || !this._hass) return;
    const upgrading = this._mode === 'preview';
    this._stopRinging();
    this._mode = 'call';
    this._previewDismissed = false;
    this._clearTimer('preview');
    this._applyState();
    // Unmute the visitor while the "Pick up" gesture is still valid (autoplay policies).
    if (this._q('video')?.srcObject) this._unmuteRemoteVideo();
    if (this._opt('answer_mode') === 'popup') this._openPopup();
    this._wakeLock(true);
    if (upgrading) {
      if (this._link === 'up') this._status(this._callStatus());
      if (!this._localStream) await this._acquireMic();
      if (this._mode !== 'call') return;
      await this._attachMic();
      if (this._link === 'up') {
        this._status(this._callStatus());
        this._armIdleTimer();
      }
      this._applyState();
    } else {
      this._retries = 0;
      this._setLink('connecting');
      this._status(this._T('connecting'));
      await this._acquireMic();
      this._startSession();
    }
  }

  async _acquireMic() {
    // Browsers only expose getUserMedia in a secure context (HTTPS or localhost):
    // HA reached at http://192.168.x.x:8123 has no navigator.mediaDevices at all.
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this._micError = window.isSecureContext === false ? 'mic_insecure' : 'mic_unavailable';
      this._micFailed = true;
      console.warn(LOG_PREFIX, 'getUserMedia unavailable, continuing listen-only. isSecureContext:', window.isSecureContext);
      return false;
    }
    try {
      this._localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      this._localStream.getAudioTracks().forEach((tr) => (tr.enabled = false));
      this._micFailed = false;
      if (this._mode === 'off') this._releaseMic();
      return !!this._localStream;
    } catch (err) {
      console.warn(LOG_PREFIX, 'Microphone unavailable, continuing listen-only:', err);
      this._localStream = null;
      this._micError = err && err.name === 'NotAllowedError' ? 'mic_denied' : 'mic_unavailable';
      this._micFailed = true;
      return false;
    }
  }

  /** Put the mic track on the existing audio sender (no renegotiation needed). */
  async _attachMic() {
    if (!this._sender || !this._localStream) return false;
    const track = this._localStream.getAudioTracks()[0];
    if (!track) return false;
    if (this._sender.track === track) return true;
    try {
      await this._sender.replaceTrack(track);
      return true;
    } catch (err) {
      console.warn(LOG_PREFIX, 'replaceTrack failed:', err);
      return false;
    }
  }

  _releaseMic() {
    if (this._localStream) {
      this._localStream.getTracks().forEach((tr) => tr.stop());
      this._localStream = null;
    }
  }

  /** ICE servers configured in HA (same as the native camera player), [] on failure. */
  async _getIceServers() {
    if (this._opt('ice_servers') === 'none') return [];
    try {
      const res = await Promise.race([
        this._hass.callWS({ type: 'camera/webrtc/get_client_config', entity_id: this._config.entity }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      const servers = res && res.configuration && res.configuration.iceServers;
      return Array.isArray(servers) ? servers : [];
    } catch (err) {
      console.warn(LOG_PREFIX, 'HA ICE config unavailable, continuing without:', err && err.message);
      return [];
    }
  }

  async _startSession() {
    const T = (key) => this._T(key);
    if (this._mode === 'off' || this._connecting || this._pc) return;
    this._connecting = true;
    this._talking = false;
    this._sessionId = null;
    this._pendingCandidates = [];
    this._setLink('connecting');
    this._status(this._retries ? `${T('reconnecting')} (${this._retries}/${MAX_RECONNECTS})` : T('connecting'));
    try {
      const iceServers = await this._getIceServers();
      if (this._mode === 'off') return;

      const pc = new RTCPeerConnection({ iceServers, bundlePolicy: 'max-bundle' });
      this._pc = pc;
      // Audio is always negotiated sendrecv: the mic is attached later (replaceTrack) when picking up.
      const track = this._localStream ? this._localStream.getAudioTracks()[0] : null;
      const audioTx = track
        ? pc.addTransceiver(track, { direction: 'sendrecv', streams: [this._localStream] })
        : pc.addTransceiver('audio', { direction: 'sendrecv' });
      this._sender = audioTx.sender;
      pc.addTransceiver('video', { direction: 'recvonly' });

      pc.ontrack = (ev) => {
        if (this._pc !== pc) return;
        console.log(LOG_PREFIX, 'Track received:', ev.track.kind);
        const video = this._q('video');
        if (!video) return;
        if (!video.srcObject) video.srcObject = new MediaStream();
        video.srcObject.addTrack(ev.track);
        // Muted play() is allowed everywhere; it backs up the autoplay attribute.
        if (video.paused) video.muted = true;
        video.play().catch((err) => {
          if (err && err.name === 'NotAllowedError' && this._pc === pc && this._mode === 'call') this._showAudioUnblock();
        });
        if (ev.track.kind === 'video') this._q('video-wrap')?.classList.add('has-video');
        if (ev.track.kind === 'audio' && this._mode === 'call') {
          const unmute = () => { if (this._pc === pc) this._unmuteRemoteVideo(); };
          if (video.paused) video.addEventListener('playing', unmute, { once: true });
          else unmute();
        }
      };
      pc.onconnectionstatechange = () => this._onPcState(pc);
      pc.onicecandidate = async (ev) => {
        if (this._pc !== pc || !ev.candidate || !ev.candidate.candidate) return;
        const cand = { candidate: ev.candidate.candidate, sdpMid: ev.candidate.sdpMid, sdpMLineIndex: ev.candidate.sdpMLineIndex };
        if (!this._sessionId) { this._pendingCandidates.push(cand); return; }
        try { await this._sendCandidate(cand); } catch (err) { console.warn(LOG_PREFIX, 'sendCandidate failed:', err); }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await new Promise((r) => setTimeout(r, 100));
      if (this._pc !== pc) return;
      const unsub = await this._hass.connection.subscribeMessage(
        (msg) => this._onSignalMessage(msg, pc),
        { type: 'camera/webrtc/offer', entity_id: this._config.entity, offer: pc.localDescription.sdp }
      );
      if (this._pc !== pc) { try { unsub(); } catch (_) { /* ignore */ } return; }
      this._unsubscribe = unsub;
    } catch (err) {
      console.error(LOG_PREFIX, 'Error:', err);
      this._handleDrop(`${T('error_prefix')} ${err.message}`);
    } finally {
      this._connecting = false;
    }
  }

  _onPcState(pc) {
    if (this._pc !== pc) return;
    const state = pc.connectionState;
    console.log(LOG_PREFIX, 'PC state:', state);
    if (state === 'connected') {
      this._clearTimer('disc');
      this._retries = 0;
      this._setLink('up');
      this._status(this._upStatus());
      if (this._mode === 'call') {
        this._attachMic();
        this._armIdleTimer();
      }
    } else if (state === 'disconnected') {
      // Often transient: give ICE a few seconds to recover before reconnecting.
      this._clearTimer('disc');
      this._timers.disc = setTimeout(() => {
        if (this._pc === pc && pc.connectionState !== 'connected') this._handleDrop();
      }, 4000);
    } else if (state === 'failed') {
      this._handleDrop();
    }
  }

  async _sendCandidate(cand) {
    if (!this._sessionId) return;
    await this._hass.connection.sendMessagePromise({
      type: 'camera/webrtc/candidate',
      entity_id: this._config.entity,
      session_id: this._sessionId,
      candidate: cand,
    });
  }

  async _flushPendingCandidates() {
    while (this._pendingCandidates.length > 0) {
      const cand = this._pendingCandidates.shift();
      try { await this._sendCandidate(cand); } catch (err) { console.warn(LOG_PREFIX, 'flush candidate failed:', err); }
    }
  }

  async _onSignalMessage(msg, pc) {
    if (this._pc !== pc) return;
    const T = (key) => this._T(key);
    if (msg.type === 'session') {
      this._sessionId = msg.session_id;
      this._flushPendingCandidates();
    } else if (msg.type === 'answer') {
      try { await pc.setRemoteDescription({ type: 'answer', sdp: msg.answer }); }
      catch (err) {
        console.error(LOG_PREFIX, 'setRemoteDescription failed:', err);
        this._handleDrop(`${T('error_answer')} ${err.message}`);
      }
    } else if (msg.type === 'candidate') {
      try { const c = msg.candidate; await pc.addIceCandidate({ candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex }); }
      catch (err) { console.warn(LOG_PREFIX, 'addIceCandidate failed:', err); }
    } else if (msg.type === 'error') {
      console.error(LOG_PREFIX, 'Server error:', msg);
      this._handleDrop(`${T('error_ha')} ${msg.message || msg.code}`);
    }
  }

  /** The session dropped or failed: retry with backoff, or give up. */
  _handleDrop(errText) {
    if (this._mode === 'off') return;
    const T = (key) => this._T(key);
    this._clearTimer('disc');
    this._clearTimer('retry');
    const canRetry = this._opt('auto_reconnect') !== false && this._retries < MAX_RECONNECTS;
    // Close the old session first: the intercom has a single capture path.
    this._cleanupSession({ keepMic: canRetry });
    if (!canRetry) {
      this._teardown(errText || T('disconnected'));
      return;
    }
    this._retries += 1;
    this._setLink('connecting');
    this._status(`${T('reconnecting')} (${this._retries}/${MAX_RECONNECTS})`);
    const delay = 1000 * 2 ** (this._retries - 1);
    this._timers.retry = setTimeout(() => this._startSession(), delay);
  }

  /** Close the WebRTC session without changing what the user asked for. */
  _cleanupSession({ keepMic = false } = {}) {
    this._clearTimer('disc');
    const video = this._q('video');
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach((tr) => tr.stop());
      video.srcObject = null;
    }
    this._q('video-wrap')?.classList.remove('has-video');
    if (this._unsubscribe) { try { this._unsubscribe(); } catch (_) { /* ignore */ } this._unsubscribe = null; }
    if (this._pc) {
      const pc = this._pc;
      this._pc = null;
      try { pc.close(); } catch (_) { /* ignore */ }
    }
    this._sender = null;
    if (keepMic && this._localStream) {
      this._localStream.getAudioTracks().forEach((tr) => (tr.enabled = false));
    } else {
      this._releaseMic();
    }
    this._sessionId = null;
    this._pendingCandidates = [];
    this._talking = false;
    this._pttHeld = false;
    this._link = 'down';
  }

  /** Stop everything (hang up, end of preview, auto hang-up, unrecoverable error). */
  _teardown(text) {
    const wasCall = this._mode === 'call';
    this._mode = 'off';
    ['retry', 'disc', 'idle', 'preview'].forEach((n) => this._clearTimer(n));
    this._countdownShown = false;
    this._micFailed = false;
    this._micError = null;
    this._hideAudioUnblock();
    this._cleanupSession();
    this._closePopup();
    this._wakeLock(false);
    this._applyState();
    if (text) this._status(text);
    else if (wasCall) this._status(this._T('hung_up'));
    else this._status(this._ringing ? this._T('ringing') : this._T('idle'));
  }

  // ---- Push-to-talk ----

  async _talk(on) {
    if (this._mode !== 'call' || this._link !== 'up') return;
    const T = (key) => this._T(key);
    if (on && (!this._localStream || !this._sender || this._sender.track === null)) {
      // No mic on the session yet (refused earlier, or opened from a deep link): this press is a user gesture.
      const ok = this._localStream ? true : await this._acquireMic();
      if (!ok || !(await this._attachMic())) { this._status(T(this._micError || 'mic_unavailable')); return; }
      this._status(T('in_call'));
      // In hold mode the finger may have been released during the permission prompt.
      if (this._opt('ptt_mode') !== 'toggle' && !this._pttHeld) return;
    }
    this._talking = on;
    if (this._localStream) this._localStream.getAudioTracks().forEach((tr) => (tr.enabled = on));
    this._applyState();
    vibrate(on ? 20 : 10);
    this._armIdleTimer();
  }

  // ---- Auto hang-up ----

  _armIdleTimer() {
    this._clearTimer('idle');
    if (this._countdownShown && this._link === 'up') {
      this._countdownShown = false;
      this._status(this._callStatus());
    }
    const secs = Number(this._opt('auto_hangup')) || 0;
    if (secs <= 0 || this._mode !== 'call') return;
    const deadline = Date.now() + secs * 1000;
    this._timers.idle = setInterval(() => {
      if (this._talking) return; // never cut someone mid-sentence
      const left = Math.ceil((deadline - Date.now()) / 1000);
      if (left <= 0) {
        this._teardown(this._T('auto_hung_up'));
      } else if (left <= 10 && this._link === 'up') {
        this._countdownShown = true;
        this._status(this._T('auto_hangup_in').replace('{s}', left));
      }
    }, 1000);
  }

  // ---- Locked phone / background ----

  _onVisibility() {
    if (document.visibilityState === 'hidden') {
      this._previewDismissed = false;
      if (this._mode === 'preview') this._teardown();
      else if (this._mode === 'call' && this._opt('hangup_when_hidden') !== false) this._teardown(this._T('hung_up'));
      return;
    }
    // Back on screen (phone unlocked, app reopened from a notification...)
    if (this._mode !== 'off') this._wakeLock(true);
    this._checkUrlAction();
    this._maybeAutoPreview();
    if (this._ringing && this._mode === 'off' && this._opt('preview') !== 'off' && !this._isEditorPreview()) {
      this._startPreview();
    }
  }

  /** Keep the screen on during a preview or a call, so the phone does not lock mid-conversation. */
  async _wakeLock(on) {
    try {
      if (on) {
        if (!navigator.wakeLock || document.visibilityState !== 'visible') return;
        if (this._wakeLockSentinel && !this._wakeLockSentinel.released) return;
        this._wakeLockSentinel = await navigator.wakeLock.request('screen');
        if (this._mode === 'off') this._wakeLock(false);
      } else if (this._wakeLockSentinel) {
        const s = this._wakeLockSentinel;
        this._wakeLockSentinel = null;
        await s.release();
      }
    } catch (_) { /* not supported or refused */ }
  }

  /** Deep link from a notification: ?ring_intercom=answer|preview[&entity=camera.xxx] */
  _checkUrlAction() {
    if (!this._hass || !this._config || !this.isConnected || this._isEditorPreview()) return;
    let params;
    try { params = new URLSearchParams(window.location.search); } catch (_) { return; }
    const action = params.get('ring_intercom');
    if (!action) return;
    const ent = params.get('entity');
    if (ent && ent !== this._config.entity) return;
    params.delete('ring_intercom');
    params.delete('entity');
    const qs = params.toString();
    try {
      history.replaceState(history.state, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    } catch (_) { /* ignore */ }
    if (action === 'answer') {
      this._pickUp();
    } else if (action === 'preview') {
      this._previewDismissed = false;
      this._startPreview();
    }
  }

  // ---- Full-screen overlay ----

  _openPopup() {
    if (this._popupHost || !this._container) return;
    const host = document.createElement('div');
    host.className = 'ring-intercom-video-popup';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CARD_CSS}</style><div class="popup"></div>`;
    root.querySelector('.popup').appendChild(this._container); // moving keeps the live stream
    document.body.appendChild(host);
    this._popupHost = host;
    document.addEventListener('keydown', this._onKey);
    this._q('video')?.play().catch(() => {});
  }

  _closePopup() {
    if (!this._popupHost) return;
    document.removeEventListener('keydown', this._onKey);
    if (this._card && this._container) this._card.appendChild(this._container);
    this._popupHost.remove();
    this._popupHost = null;
    this._q('video')?.play().catch(() => {});
  }
}

// ---------- Visual Editor (native ha-form) ----------

class RingIntercomVideoCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = migrateConfig(config || {});
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  connectedCallback() {
    this._update();
  }

  async _update() {
    if (!this._hass || !this._config || !this.isConnected) return;
    if (!this._form) {
      if (this._loading) return;
      this._loading = true;
      await loadHaComponents();
      await Promise.race([customElements.whenDefined('ha-form'), new Promise((r) => setTimeout(r, 3000))]);
      this._loading = false;
      this._form = document.createElement('ha-form');
      this._form.addEventListener('value-changed', (e) => this._valueChanged(e.detail.value));
      this.appendChild(this._form);
    }
    const lang = detectLanguage(this._hass, this._config.language);
    if (lang !== this._lang || !this._schema) {
      this._lang = lang;
      this._schema = this._buildSchema();
    }
    this._form.hass = this._hass;
    this._form.data = { ...DEFAULTS, ...this._config };
    this._form.schema = this._schema;
    this._form.computeLabel = (s) => this._label(s);
    this._form.computeHelper = (s) => this._helper(s);
  }

  _T(key) {
    return t(this._lang, key);
  }

  _buildSchema() {
    const T = (key) => this._T(key);
    const select = (options) => ({ select: { mode: 'dropdown', options } });
    const number = (min, max, step, unit) => ({ number: { min, max, step, mode: 'box', unit_of_measurement: unit } });
    return [
      { name: 'entity', required: true, selector: { entity: { domain: 'camera' } } },
      { name: 'name', selector: { text: {} } },
      { name: 'open_door_entity', selector: { entity: { domain: DOOR_ENTITY_DOMAINS } } },
      { name: 'ding_entity', selector: { entity: { domain: ['event', 'binary_sensor'] } } },
      {
        type: 'expandable', flatten: true, icon: 'mdi:television-play', title: T('editor_section_display'),
        schema: [
          { name: 'preview', selector: select([
            { value: 'visible', label: T('preview_visible') },
            { value: 'ring', label: T('preview_ring') },
            { value: 'off', label: T('preview_off') },
          ]) },
          { name: 'preview_timeout', selector: number(0, 600, 5, 's') },
          { name: 'answer_mode', selector: select([
            { value: 'inline', label: T('answer_inline') },
            { value: 'popup', label: T('answer_popup') },
          ]) },
          { name: 'video_mode', selector: select([
            { value: 'always', label: T('video_mode_always') },
            { value: 'on_call', label: T('video_mode_on_call') },
          ]) },
          { name: 'language', selector: select(LANGUAGE_OPTIONS) },
        ],
      },
      {
        type: 'expandable', flatten: true, icon: 'mdi:phone-in-talk', title: T('editor_section_call'),
        schema: [
          { name: 'ptt_mode', selector: select([
            { value: 'hold', label: T('ptt_mode_hold') },
            { value: 'toggle', label: T('ptt_mode_toggle') },
          ]) },
          { name: 'auto_hangup', selector: number(0, 600, 10, 's') },
          { name: 'hangup_when_hidden', selector: { boolean: {} } },
          { name: 'auto_reconnect', selector: { boolean: {} } },
          { name: 'ring_timeout', selector: number(5, 300, 5, 's') },
        ],
      },
      {
        type: 'expandable', flatten: true, icon: 'mdi:door-open', title: T('editor_section_door'),
        schema: [
          { name: 'door_confirm', selector: { boolean: {} } },
          { name: 'door_hold_time', selector: number(300, 5000, 100, 'ms') },
        ],
      },
      {
        type: 'expandable', name: 'open_door_action', icon: 'mdi:code-braces', title: T('editor_advanced_toggle'),
        schema: [
          { name: 'service', selector: { text: {} } },
          { name: 'entity_id', selector: { entity: {} } },
        ],
      },
    ];
  }

  _label(schema) {
    const map = {
      entity: 'editor_camera_label',
      name: 'editor_name_label',
      open_door_entity: 'editor_door_label',
      ding_entity: 'editor_ding_label',
      language: 'editor_language_label',
      video_mode: 'editor_video_mode_label',
      preview: 'editor_preview_label',
      preview_timeout: 'editor_preview_timeout_label',
      answer_mode: 'editor_answer_mode_label',
      ptt_mode: 'editor_ptt_mode_label',
      auto_hangup: 'editor_auto_hangup_label',
      hangup_when_hidden: 'editor_hangup_hidden_label',
      auto_reconnect: 'editor_auto_reconnect_label',
      ring_timeout: 'editor_ring_timeout_label',
      door_confirm: 'editor_door_confirm_label',
      door_hold_time: 'editor_door_hold_time_label',
      service: 'editor_service_label',
      entity_id: 'editor_action_entity_label',
    };
    return map[schema.name] ? this._T(map[schema.name]) : (schema.title || schema.name);
  }

  _helper(schema) {
    const map = {
      entity: 'editor_camera_help',
      open_door_entity: 'editor_door_help',
      ding_entity: 'editor_ding_help',
      preview: 'editor_preview_help',
      auto_hangup: 'editor_auto_hangup_help',
      service: 'editor_service_help',
    };
    return map[schema.name] ? this._T(map[schema.name]) : undefined;
  }

  /** Keep the YAML short: drop empty values and values equal to the defaults. */
  _valueChanged(value) {
    const out = { ...value };
    Object.keys(out).forEach((k) => {
      const v = out[k];
      if (v === undefined || v === null || v === '' || (k in DEFAULTS && v === DEFAULTS[k])) delete out[k];
    });
    if (out.open_door_action && typeof out.open_door_action === 'object') {
      const a = { ...out.open_door_action };
      Object.keys(a).forEach((k) => { if (a[k] === undefined || a[k] === null || a[k] === '') delete a[k]; });
      if (Object.keys(a).length) out.open_door_action = a;
      else delete out.open_door_action;
    }
    this._config = out;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: out }, bubbles: true, composed: true }));
  }
}

// ---------- Registration ----------

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, RingIntercomVideoCard);
if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, RingIntercomVideoCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === CARD_TAG)) {
  window.customCards.push({
    type: CARD_TAG,
    name: 'Ring Intercom Video Card',
    description: 'Two-way audio + video card for Ring Intercom Video',
    preview: false,
    documentationURL: 'https://github.com/cmos486/ring-intercom-video-card',
  });
}

console.log(
  `%c RING-INTERCOM-VIDEO-CARD %c v${CARD_VERSION} `,
  'color: white; background: #1976d2; font-weight: 700;',
  'color: #1976d2; background: white; font-weight: 700;'
);