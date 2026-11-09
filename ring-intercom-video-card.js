/**
 * Ring Intercom Video Card - v1.4.0
 *
 * Two-way audio + video Lovelace card for Ring Intercom Video.
 * Companion to the ring-intercom-video custom component.
 *
 * Also supports Ring's audio-only intercom (device_kind:
 * intercom_handset_audio), which has no camera at all. The backend flags it
 * with an `audio_only: true` entity attribute; the card then offers audio
 * alone and renders an audio-only surface. EXPERIMENTAL - see README.
 *
 * Schema:
 *   type: custom:ring-intercom-video-card
 *   entity: camera.xxx                    # required
 *   open_door_entity: button.xxx          # optional, simple "open door" mode
 *   open_door_action:                     # optional, advanced mode
 *     service: script.turn_on             # optional, inferred from entity_id
 *     entity_id: script.xxx
 *     data: {...}
 *   language: es|en|ca|fr                 # optional, overrides HA language auto-detection
 *   video_max_height: 230px               # optional, caps video height (px, vh, %...)
 *
 * Legacy schema (auto-migrated):
 *   lock_entity: lock.xxx
 *   open_door:
 *     service: ...
 *     entity_id: ...
 *
 * Repo: https://github.com/cmos486/ring-intercom-video-card
 * License: Apache-2.0
 */

const CARD_VERSION = '1.4.0';
const CARD_TAG = 'ring-intercom-video-card';
const EDITOR_TAG = 'ring-intercom-video-card-editor';
const LOG_PREFIX = '[ring-intercom-video-card]';

// ---------- i18n ----------

const TRANSLATIONS = {
  es: {
    idle: 'Inactivo',
    connecting: 'Conectando...',
    requesting_mic: 'Pidiendo microfono...',
    sending_offer: 'Enviando offer a HA...',
    session: 'Sesion HA:',
    answer_received: 'Answer recibido',
    pc_state: 'Estado PC:',
    ptt_button: 'PULSAR PARA HABLAR',
    pick_up: 'Descolgar',
    open_door: 'Abrir puerta',
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
    mic_insecure: 'Solo escucha: el microfono necesita HTTPS',
    mic_denied: 'Solo escucha: permiso de microfono denegado',
    mic_unavailable: 'Solo escucha: microfono no disponible',
    audio_unblock: 'Pulsa para activar el audio',
    audio_only_title: 'Intercomunicador de audio',
    audio_only_hint: 'Este dispositivo no tiene camara',
    // Editor labels
    editor_camera_label: 'Entidad camara (requerido)',
    editor_camera_help: 'Entidad camara del componente Ring Intercom Video.',
    editor_door_label: 'Entidad para abrir la puerta (opcional)',
    editor_door_help: 'Con la integracion Ring oficial es el boton "Abrir puerta" (button.*); con ring-mqtt, la cerradura (lock.*). Tambien vale un script o un switch: la tarjeta llama al servicio que toque.',
    editor_advanced_toggle: 'Avanzado: accion personalizada para abrir puerta',
    editor_advanced_help: 'Configura cualquier llamada de servicio para el boton "Abrir puerta". Si dejas el servicio vacio, se deduce del dominio de la entidad.',
    editor_service_label: 'Servicio (opcional, ej. button.press, lock.unlock)',
    editor_action_entity_label: 'Entidad (opcional)',
    editor_action_entity_help: 'Entidad a la que se llama. Si el servicio esta vacio, se deduce de aqui.',
    editor_language_label: 'Idioma (opcional, sobrescribe el de HA)',
    editor_language_help: 'Idioma de los textos del card. Si se deja vacio, se usa el idioma de Home Assistant.',
    editor_max_height_label: 'Altura maxima del video (opcional)',
    editor_max_height_help: 'Cualquier longitud CSS (230px, 50vh...). Util en pantallas pequenas como el Echo Show 5.',
  },
  en: {
    idle: 'Idle',
    connecting: 'Connecting...',
    requesting_mic: 'Requesting microphone...',
    sending_offer: 'Sending offer to HA...',
    session: 'HA session:',
    answer_received: 'Answer received',
    pc_state: 'PC state:',
    ptt_button: 'PUSH TO TALK',
    pick_up: 'Pick up',
    open_door: 'Open door',
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
    mic_insecure: 'Listen only: microphone needs HTTPS',
    mic_denied: 'Listen only: microphone permission denied',
    mic_unavailable: 'Listen only: microphone unavailable',
    audio_unblock: 'Tap to enable audio',
    audio_only_title: 'Audio intercom',
    audio_only_hint: 'This device has no camera',
    editor_camera_label: 'Camera entity (required)',
    editor_camera_help: 'Camera entity from the Ring Intercom Video component.',
    editor_door_label: 'Open door entity (optional)',
    editor_door_help: 'With the official Ring integration this is the "Open door" button (button.*); with ring-mqtt it is the lock (lock.*). A script or a switch works too: the card calls the right service for it.',
    editor_advanced_toggle: 'Advanced: custom open-door action',
    editor_advanced_help: 'Configure any service call for the "Open door" button. Leave the service empty and it is inferred from the entity domain.',
    editor_service_label: 'Service (optional, e.g. button.press, lock.unlock)',
    editor_action_entity_label: 'Entity (optional)',
    editor_action_entity_help: 'Entity the service is called on. With an empty service, it is inferred from this.',
    editor_language_label: 'Language (optional, overrides HA language)',
    editor_language_help: 'Language for card texts. Leave empty to use Home Assistant language.',
    editor_max_height_label: 'Video max height (optional)',
    editor_max_height_help: 'Any CSS length (230px, 50vh...). Useful on small screens such as the Echo Show 5.',
  },
  ca: {
    idle: 'Inactiu',
    connecting: 'Connectant...',
    requesting_mic: 'Demanant microfon...',
    sending_offer: 'Enviant oferta a HA...',
    session: 'Sessio HA:',
    answer_received: 'Resposta rebuda',
    pc_state: 'Estat PC:',
    ptt_button: 'PREMER PER PARLAR',
    pick_up: 'Despenjar',
    open_door: 'Obrir porta',
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
    mic_insecure: 'Nomes escolta: el microfon necessita HTTPS',
    mic_denied: 'Nomes escolta: permis de microfon denegat',
    mic_unavailable: 'Nomes escolta: microfon no disponible',
    audio_unblock: "Prem per activar l'audio",
    audio_only_title: "Intercomunicador d'audio",
    audio_only_hint: 'Aquest dispositiu no te camera',
    editor_camera_label: 'Entitat camera (requerit)',
    editor_camera_help: 'Entitat camera del component Ring Intercom Video.',
    editor_door_label: 'Entitat per obrir la porta (opcional)',
    editor_door_help: 'Amb la integracio Ring oficial es el boto "Obrir porta" (button.*); amb ring-mqtt, el pany (lock.*). Tambe val un script o un switch: la targeta crida el servei que toca.',
    editor_advanced_toggle: 'Avancat: accio personalitzada per obrir la porta',
    editor_advanced_help: 'Configura qualsevol crida de servei per al boto "Obrir porta". Si deixes el servei buit, es dedueix del domini de l\'entitat.',
    editor_service_label: 'Servei (opcional, p.ex. button.press, lock.unlock)',
    editor_action_entity_label: 'Entitat (opcional)',
    editor_action_entity_help: 'Entitat a la qual es crida. Si el servei esta buit, es dedueix d\'aqui.',
    editor_language_label: 'Idioma (opcional, sobreescriu el d\'HA)',
    editor_language_help: "Idioma dels textos del card. Si es deixa buit, s'usa l'idioma de Home Assistant.",
    editor_max_height_label: 'Alcada maxima del video (opcional)',
    editor_max_height_help: 'Qualsevol longitud CSS (230px, 50vh...). Util en pantalles petites com l\'Echo Show 5.',
  },
  fr: {
    idle: 'Inactif',
    connecting: 'Connexion…',
    requesting_mic: 'Demande d\'accès au micro…',
    sending_offer: 'Envoi de l\'offre à HA…',
    session: 'Session HA :',
    answer_received: 'Réponse reçue',
    pc_state: 'État PC :',
    ptt_button: 'MAINTENIR POUR PARLER',
    pick_up: 'Décrocher',
    open_door: 'Ouvrir la porte',
    hang_up: 'Raccrocher',
    door_opened: 'Porte ouverte',
    hung_up: 'Raccroché',
    disconnected: 'Déconnecté',
    error_opening: 'Erreur à l\'ouverture :',
    door_not_configured: 'Ouverture de porte non configurée',
    error_service: 'service mal formé',
    error_prefix: 'Erreur :',
    error_ha: 'Erreur HA :',
    error_answer: 'Erreur dans la réponse :',
    mic_insecure: 'Écoute seule : le micro nécessite HTTPS',
    mic_denied: 'Écoute seule : accès au micro refusé',
    mic_unavailable: 'Écoute seule : micro indisponible',
    audio_unblock: 'Toucher pour activer le son',
    audio_only_title: 'Interphone audio',
    audio_only_hint: 'Cet appareil n\'a pas de caméra',
    editor_camera_label: 'Entité caméra (requis)',
    editor_camera_help: 'Entité caméra du composant Ring Intercom Video.',
    editor_door_label: 'Entité d\'ouverture de porte (optionnel)',
    editor_door_help: 'Avec l\'intégration Ring officielle, c\'est le bouton « Ouvrir la porte » (button.*) ; avec ring-mqtt, la serrure (lock.*). Un script ou un interrupteur marche aussi : la carte appelle le bon service.',
    editor_advanced_toggle: 'Avancé : action personnalisée pour ouvrir la porte',
    editor_advanced_help: 'N\'importe quel appel de service pour le bouton « Ouvrir la porte ». Si le service est vide, il est déduit du domaine de l\'entité.',
    editor_service_label: 'Service (optionnel, ex. button.press, lock.unlock)',
    editor_action_entity_label: 'Entité (optionnel)',
    editor_action_entity_help: 'Entité sur laquelle le service est appelé. Si le service est vide, il est déduit d\'ici.',
    editor_language_label: 'Langue (optionnel, remplace celle de HA)',
    editor_language_help: 'Langue des textes de la carte. Vide = langue de Home Assistant.',
    editor_max_height_label: 'Hauteur max de la vidéo (optionnel)',
    editor_max_height_help: 'N\'importe quelle longueur CSS (230px, 50vh…). Utile sur les petits écrans comme l\'Echo Show 5.',
  },
};

const LANGUAGE_NAMES = {
  '': 'Auto (Home Assistant)',
  es: 'Espanol',
  en: 'English',
  ca: 'Catala',
  fr: 'Français',
};

function detectLanguage(hass, configLang) {
  // 1. Explicit config language wins
  if (configLang && TRANSLATIONS[configLang]) return configLang;
  // 2. HA locale language
  const haLang = (hass && (hass.locale?.language || hass.language)) || '';
  const short = haLang.split('-')[0].toLowerCase();
  if (TRANSLATIONS[short]) return short;
  // 3. Fallback
  return 'en';
}

function t(lang, key) {
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}

// ---------- Helpers ----------

// Which service opens the door, per entity domain. Home Assistant's own Ring
// integration has no lock platform at all: the intercom's opener is
// `button.<name>_open_door`, pressed with button.press. ring-mqtt publishes a
// lock.* instead, and plenty of people put a script or a relay switch in
// between. All of them are one call away, so the card picks the call itself
// rather than making the user know it.
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
  if (!config) return config;
  let out = config;
  if (out.open_door && !out.open_door_action) {
    const { open_door, ...rest } = out;
    out = { ...rest, open_door_action: open_door };
  }
  // v1.2.2 and earlier only ever stored a lock.* here; the key outlived the
  // assumption that the opener is a lock.
  if (out.lock_entity && !out.open_door_entity) {
    const { lock_entity, ...rest } = out;
    out = { ...rest, open_door_entity: lock_entity };
  }
  return out;
}

// The backend marks Ring's handset-only intercom (device_kind:
// intercom_handset_audio) with audio_only: true. Older backends don't publish
// the attribute at all, so a missing value must mean "has video".
function isAudioOnlyEntity(hass, entityId) {
  return hass?.states?.[entityId]?.attributes?.audio_only === true;
}

function resolveOpenDoorAction(config) {
  const action = config.open_door_action;
  if (action && (action.service || action.entity_id)) {
    // An entity alone is enough: leaving the service field empty used to
    // silently hide the button, which read as "the card ignored my entity".
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

// The editor is a native <ha-form>, which HA only defines once some built-in
// card editor has been loaded. Loading the entities card editor pulls it in
// (together with the entity picker it renders).
async function loadHaComponents() {
  if (customElements.get('ha-form') && customElements.get('ha-entity-picker')) {
    return;
  }
  if (!customElements.get('hui-entities-card')) {
    const helpers = await window.loadCardHelpers();
    const entitiesCard = await helpers.createCardElement({
      type: 'entities',
      entities: [],
    });
    entitiesCard.constructor.getConfigElement?.();
  } else {
    const entitiesCard = customElements.get('hui-entities-card');
    entitiesCard?.getConfigElement?.();
  }
}

// ---------- Main Card ----------

class RingIntercomVideoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._pc = null;
    this._localStream = null;
    this._sessionId = null;
    this._connected = false;
    this._connecting = false;
    this._pendingCandidates = [];
    this._lang = 'en';
    this._audioOnly = false;
    this._micError = null;
  }

  static async getConfigElement() {
    await loadHaComponents();
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig(hass) {
    let cameraEntity = '';
    if (hass && hass.states) {
      const cam = Object.keys(hass.states).find(
        (id) =>
          id.startsWith('camera.') &&
          (id.includes('intercom') ||
            id.includes('entrada') ||
            (hass.states[id].attributes &&
              ['intercom_handset_video', 'intercom_handset_audio'].includes(
                hass.states[id].attributes.device_kind
              )))
      );
      if (cam) cameraEntity = cam;
    }

    // The Ring integration names its opener button.<device>_open_door. When
    // there is exactly one, it is the door this card is about, so offer it
    // rather than making the first configuration a scavenger hunt.
    let doorEntity = '';
    if (hass && hass.states) {
      const doors = Object.keys(hass.states).filter(
        (id) => id.startsWith('button.') && id.endsWith('_open_door')
      );
      if (doors.length === 1) doorEntity = doors[0];
    }

    const stub = { entity: cameraEntity || 'camera.your_ring_intercom' };
    if (doorEntity) stub.open_door_entity = doorEntity;
    return stub;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity (camera.xxx)');
    }
    this._config = migrateConfig(config);
    this._refreshLang();
    this._refreshAudioOnly();
    this._render();
  }

  set hass(hass) {
    const langBefore = this._lang;
    const audioOnlyBefore = this._audioOnly;
    this._hass = hass;
    this._refreshLang();
    this._refreshAudioOnly();
    const rendered = !!this.shadowRoot.querySelector('.container');
    const langChanged = langBefore !== this._lang;
    // KNOWN ISSUE (pre-existing, deliberately not fixed here): _render() rebuilds
    // the shadow DOM and drops any live srcObject, so a language change mid-call
    // kills the stream. The audio_only flip is gated on !busy so it does not
    // become a second trigger for that.
    const busy = this._connecting || this._connected;
    const audioOnlyChanged = audioOnlyBefore !== this._audioOnly && !busy;
    // Re-render if language changed and we already rendered once
    if (rendered && (langChanged || audioOnlyChanged)) {
      this._render();
    }
  }

  _refreshAudioOnly() {
    if (!this._config) return;
    this._audioOnly = isAudioOnlyEntity(this._hass, this._config.entity);
  }

  _refreshLang() {
    if (!this._config) return;
    this._lang = detectLanguage(this._hass, this._config.language);
  }

  getCardSize() {
    return 4;
  }

  _render() {
    const T = (key) => t(this._lang, key);

    // The audio-only device has no camera, so no video element, no poster and
    // no black rectangle -- just a handset placeholder and the hidden <audio>
    // that plays the inbound Opus. `id="status"` exists in both surfaces
    // because _status() writes to it unconditionally.
    const surface = this._audioOnly
      ? `
          <div class="audio-wrap">
            <div class="handset" aria-hidden="true">☎️</div>
            <div class="audio-title">${T('audio_only_title')}</div>
            <div class="audio-hint">${T('audio_only_hint')}</div>
            <button class="unblock" id="unblock" hidden>🔊 ${T('audio_unblock')}</button>
            <div class="overlay" id="status">${T('idle')}</div>
            <audio id="remote-audio" autoplay></audio>
          </div>`
      : `
          <div class="video-wrap">
            <video id="video" autoplay playsinline muted></video>
            <div class="overlay" id="status">${T('idle')}</div>
            <button class="unblock over-video" id="unblock" hidden>🔊 ${T('audio_unblock')}</button>
          </div>`;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { padding: 0; overflow: hidden; }
        .container { display: flex; flex-direction: column; background: #000; }
        .video-wrap { position: relative; width: 100%; aspect-ratio: 4 / 3; max-height: var(--ring-video-max-height, none); background: #000; }
        video { width: 100%; height: 100%; object-fit: var(--ring-video-object-fit, contain); max-height: var(--ring-video-max-height, none); background: #000; }
        .overlay {
          position: absolute; top: 8px; left: 8px;
          padding: 4px 8px; background: rgba(0, 0, 0, 0.6);
          color: #fff; font-size: 12px; border-radius: 4px; font-family: monospace;
        }
        .audio-wrap {
          position: relative; width: 100%; box-sizing: border-box;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; padding: 36px 16px 28px; background: #000;
        }
        .handset { font-size: 52px; line-height: 1; }
        .audio-title { color: #fff; font-size: 16px; font-weight: 600; text-align: center; }
        .audio-hint { color: #9e9e9e; font-size: 13px; text-align: center; }
        .unblock {
          margin-top: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600;
          border: none; border-radius: 8px; background: #f57c00; color: #fff;
          cursor: pointer; user-select: none;
        }
        /* Same tap target centred over the video surface. */
        .unblock.over-video {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
          margin-top: 0;
        }
        /* An author display rule outranks the UA [hidden] rule, so hidden
           needs an explicit guard here. */
        .unblock[hidden] { display: none; }
        audio { display: none; }
        .controls { display: flex; flex-direction: column; padding: 16px; gap: 12px; background: #1a1a1a; }
        .row { display: flex; gap: 12px; }
        .ptt {
          flex: 1; padding: 24px; font-size: 18px; font-weight: bold;
          border: none; border-radius: 12px; background: #444; color: #fff;
          cursor: pointer; user-select: none; touch-action: none; transition: background 0.1s;
        }
        .ptt:disabled { opacity: 0.4; cursor: not-allowed; }
        .ptt.active { background: #d32f2f; box-shadow: 0 0 20px rgba(211, 47, 47, 0.8); }
        .ptt.ready { background: #2e7d32; }
        .action-btn {
          flex: 1; padding: 16px; font-size: 15px; font-weight: 600;
          border: none; border-radius: 10px; color: #fff; cursor: pointer;
          user-select: none; transition: opacity 0.15s, transform 0.05s;
        }
        .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .action-btn:active:not(:disabled) { transform: scale(0.97); }
        .start-btn { background: #1976d2; }
        .door-btn { background: #f57c00; }
        .hangup-btn { background: #c62828; }
      </style>
      <ha-card>
        <div class="container">${surface}
          <div class="controls">
            <button class="ptt" id="ptt" disabled>${T('ptt_button')}</button>
            <div class="row">
              <button class="action-btn start-btn" id="start">📞 ${T('pick_up')}</button>
              <button class="action-btn door-btn" id="door" disabled>🔓 ${T('open_door')}</button>
              <button class="action-btn hangup-btn" id="hangup" disabled>📵 ${T('hang_up')}</button>
            </div>
          </div>
        </div>
      </ha-card>
    `;

    // Optional video height limit (e.g. for small screens like Echo Show 5).
    // Only inject the CSS variables when the option is defined, so existing
    // installs without `video_max_height` render exactly as before.
    const maxHeight = this._config && this._config.video_max_height;
    if (maxHeight) {
      this.style.setProperty('--ring-video-max-height', maxHeight);
      this.style.setProperty('--ring-video-object-fit', 'contain');
    } else {
      this.style.removeProperty('--ring-video-max-height');
      this.style.removeProperty('--ring-video-object-fit');
    }

    const startBtn = this.shadowRoot.getElementById('start');
    const pttBtn = this.shadowRoot.getElementById('ptt');
    const doorBtn = this.shadowRoot.getElementById('door');
    const hangupBtn = this.shadowRoot.getElementById('hangup');

    startBtn.addEventListener('click', () => this._connect());
    hangupBtn.addEventListener('click', () => this._teardown());
    doorBtn.addEventListener('click', () => this._openDoor());

    const pttDown = (e) => { e.preventDefault(); this._setMicEnabled(true); pttBtn.classList.add('active'); };
    const pttUp = (e) => { e.preventDefault(); this._setMicEnabled(false); pttBtn.classList.remove('active'); };
    pttBtn.addEventListener('mousedown', pttDown);
    pttBtn.addEventListener('mouseup', pttUp);
    pttBtn.addEventListener('mouseleave', pttUp);
    pttBtn.addEventListener('touchstart', pttDown);
    pttBtn.addEventListener('touchend', pttUp);
    pttBtn.addEventListener('touchcancel', pttUp);

    const unblockBtn = this.shadowRoot.getElementById('unblock');
    if (unblockBtn) unblockBtn.addEventListener('click', () => this._retryAudioPlayback());
    // Self-heal: if playback starts by any other route, the tap target is
    // stale and must go away on its own. A muted video does not count: the
    // button is there precisely because the picture is running without sound.
    const sink = this._remoteSink();
    if (sink) {
      sink.addEventListener('playing', () => {
        if (sink.muted) return;
        this._hideAudioUnblock();
      });
    }

    if (!resolveOpenDoorAction(this._config)) {
      doorBtn.style.display = 'none';
    }
  }

  // Autoplay recovery. NotAllowedError means "this needs a user activation",
  // so the fix is an element to tap -- the tap itself is the missing
  // activation. Kept off the status overlay: connection state and playback
  // state are orthogonal and must not compete for one textContent.
  _showAudioUnblock() {
    const btn = this.shadowRoot.getElementById('unblock');
    if (btn) btn.hidden = false;
  }

  _hideAudioUnblock() {
    const btn = this.shadowRoot.getElementById('unblock');
    if (btn) btn.hidden = true;
  }

  async _retryAudioPlayback() {
    const sink = this._remoteSink();
    if (!sink) return;
    // This runs from a real click, so the activation the autoplay policy was
    // waiting for is present: unmuting is safe now.
    sink.muted = false;
    try {
      await sink.play();
      this._hideAudioUnblock();
    } catch (err) {
      console.warn(LOG_PREFIX, 'retry play() failed:', err && err.name);
      // Never trade a silent picture for no picture at all.
      if (!this._audioOnly) {
        sink.muted = true;
        sink.play().catch(() => {});
      }
    }
  }

  // The video element starts muted because muted playback is the one thing
  // every autoplay policy allows unconditionally; audible playback needs a
  // user activation, and the one from "Pick up" is usually long expired by
  // the time getUserMedia, the SDP exchange and ICE have finished. That is
  // exactly what the Android WebView behind the HA Companion app enforces
  // (its `mediaPlaybackRequiresUserGesture` is on unless the user turns on
  // Settings -> Companion app -> Autoplay videos), where an unmuted element
  // simply never starts and the card shows the WebView's grey play button.
  //
  // So: get the picture up muted, then try to unmute. A browser that refuses
  // pauses the element instead of rejecting, hence the 'pause' listener --
  // fall back to a muted picture plus a tap target, which is the activation.
  _unmuteRemoteVideo() {
    const video = this.shadowRoot.getElementById('video');
    if (!video || !video.muted) return;
    const pcAtUnmute = this._pc;
    const cleanup = () => {
      video.removeEventListener('pause', onPause);
      clearTimeout(timer);
    };
    const onPause = () => {
      cleanup();
      // Hang-up and teardown also pause; only react while this call is live.
      if (!this._pc || this._pc !== pcAtUnmute) return;
      console.warn(LOG_PREFIX, 'Audible playback blocked, staying muted');
      video.muted = true;
      video.play().catch(() => {});
      this._showAudioUnblock();
    };
    const timer = setTimeout(cleanup, 1500);
    video.addEventListener('pause', onPause);
    video.muted = false;
    video.play().catch((err) => {
      console.warn(LOG_PREFIX, 'unmute play() failed:', err && err.name);
    });
  }

  // Single point where the remote-media sink is chosen. Everything downstream
  // (attachment, play() handling, teardown) is shared between both modes.
  _remoteSink() {
    return this.shadowRoot.getElementById(this._audioOnly ? 'remote-audio' : 'video');
  }

  _status(text) {
    const el = this.shadowRoot.getElementById('status');
    if (el) el.textContent = text;
    console.log(LOG_PREFIX, text);
  }

  async _openDoor() {
    const T = (key) => t(this._lang, key);
    const action = resolveOpenDoorAction(this._config);
    if (!action || !action.service) { this._status(T('door_not_configured')); return; }
    const [domain, service] = action.service.split('.');
    if (!domain || !service) { this._status(T('error_service')); return; }
    try {
      const data = {};
      if (action.entity_id) data.entity_id = action.entity_id;
      Object.assign(data, action.data || {});
      await this._hass.callService(domain, service, data);
      this._status(T('door_opened'));
      const doorBtn = this.shadowRoot.getElementById('door');
      const originalBg = doorBtn.style.background;
      doorBtn.style.background = '#2e7d32';
      setTimeout(() => { doorBtn.style.background = originalBg; }, 800);
    } catch (err) {
      this._status(`${T('error_opening')} ${err.message}`);
      console.error(LOG_PREFIX, 'openDoor failed:', err);
    }
  }

  // Returns a microphone stream, or null when there is none to be had.
  // Never throws: the caller continues listen-only, and _micError carries the
  // reason so the overlay can explain the dead push-to-talk button.
  async _acquireMic() {
    const T = (key) => t(this._lang, key);
    // No mediaDevices at all means an insecure context in practice: browsers
    // only expose getUserMedia over HTTPS (or localhost). Reaching HA at
    // http://192.168.x.x:8123 lands here.
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this._micError = window.isSecureContext === false ? 'mic_insecure' : 'mic_unavailable';
      console.warn(
        LOG_PREFIX,
        'getUserMedia unavailable, continuing listen-only. isSecureContext:',
        window.isSecureContext
      );
      return null;
    }
    this._status(T('requesting_mic'));
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch (err) {
      const name = err && err.name;
      this._micError = name === 'NotAllowedError' ? 'mic_denied' : 'mic_unavailable';
      console.warn(LOG_PREFIX, 'Microphone unavailable, continuing listen-only:', err);
      return null;
    }
  }

  async _connect() {
    const T = (key) => t(this._lang, key);
    if (this._connecting || this._connected) return;
    this._connecting = true;
    this._refreshAudioOnly();
    this._hideAudioUnblock();
    // Every call starts muted; _unmuteRemoteVideo() takes it from there.
    const remoteVideo = this.shadowRoot.getElementById('video');
    if (remoteVideo) remoteVideo.muted = true;
    this._sessionId = null;
    this._pendingCandidates = [];
    this._micError = null;
    this._status(T('connecting'));
    const startBtn = this.shadowRoot.getElementById('start');
    const hangupBtn = this.shadowRoot.getElementById('hangup');
    const doorBtn = this.shadowRoot.getElementById('door');
    startBtn.disabled = true;
    hangupBtn.disabled = false;
    if (resolveOpenDoorAction(this._config)) doorBtn.disabled = false;
    try {
      // A missing microphone is not a reason to abandon the call. Without it
      // the intercom still carries video and the visitor's voice -- most of
      // what the card is for. Only push-to-talk is lost.
      this._localStream = await this._acquireMic();
      if (this._localStream) {
        this._localStream.getAudioTracks().forEach((t) => (t.enabled = false));
      }
      this._pc = new RTCPeerConnection({ iceServers: [], bundlePolicy: 'max-bundle' });
      const audioTrack = this._localStream && this._localStream.getAudioTracks()[0];
      if (audioTrack) {
        this._pc.addTransceiver(audioTrack, { direction: 'sendrecv', streams: [this._localStream] });
      } else {
        // Still offer an audio m-line. Ring mirrors what we offer, so dropping
        // it would silence the incoming direction too.
        this._pc.addTransceiver('audio', { direction: 'recvonly' });
      }
      // Ring mirrors every offered m-line back in its answer, so a video
      // transceiver offered to a handset-only intercom would be answered too.
      // Offer audio alone when the entity reports audio_only.
      if (!this._audioOnly) {
        this._pc.addTransceiver('video', { direction: 'recvonly' });
      }
      this._pc.ontrack = (ev) => {
        console.log(LOG_PREFIX, 'Track recibido:', ev.track.kind);
        const sink = this._remoteSink();
        if (!sink) return;
        if (!sink.srcObject) sink.srcObject = new MediaStream();
        sink.srcObject.addTrack(ev.track);
        // The video element is muted at this point, so this play() is allowed
        // everywhere; the audio-only surface relies on the activation from the
        // "Pick up" click, and this catch is its safety net.
        const pcAtAttach = this._pc;
        sink.play().catch((err) => {
          // NotAllowedError is the autoplay-policy rejection: the user will
          // hear nothing and has to act, so it is the only one worth showing.
          // AbortError and friends are routine here -- tracks attach one at a
          // time, so a play() can be interrupted by the next addTrack.
          if (err && err.name === 'NotAllowedError') {
            console.warn(LOG_PREFIX, 'Autoplay blocked:', err);
            // Both surfaces get the tap target -- the tap is itself the
            // activation the browser is waiting for. Skip if the call already
            // moved on (hung up / failed): _teardown() nulls _pc, so an
            // identity check covers both.
            if (this._pc && this._pc === pcAtAttach) {
              this._showAudioUnblock();
            }
          } else {
            console.debug(LOG_PREFIX, 'play() rejected, ignored:', err && err.name);
          }
        });
        // Sound rides on the audio track, so that is when the video surface
        // tries to unmute. Wait until the element is really running: tracks
        // attach one at a time and each attach interrupts the previous play(),
        // so that promise is not a reliable "we are playing" signal.
        if (!this._audioOnly && ev.track.kind === 'audio') {
          const unmute = () => {
            if (this._pc && this._pc === pcAtAttach) this._unmuteRemoteVideo();
          };
          if (sink.paused) sink.addEventListener('playing', unmute, { once: true });
          else unmute();
        }
      };
      this._pc.onconnectionstatechange = () => {
        if (!this._pc) return;
        this._status(`${T('pc_state')} ${this._pc.connectionState}`);
        if (this._pc.connectionState === 'connected') {
          this._connected = true;
          const pttBtn = this.shadowRoot.getElementById('ptt');
          if (this._localStream) {
            pttBtn.disabled = false;
            pttBtn.classList.add('ready');
          } else {
            // Leave the button dead, but say why: a silent dead button reads
            // as a broken card to someone who only wanted to talk back.
            this._status(T(this._micError || 'mic_unavailable'));
          }
        } else if (['failed', 'disconnected', 'closed'].includes(this._pc.connectionState)) {
          // 'failed' is a diagnosis worth reading; the teardown text would
          // replace it with a generic "Disconnected".
          this._teardown({ keepStatus: this._pc.connectionState === 'failed' });
        }
      };
      this._pc.onicecandidate = async (ev) => {
        if (!ev.candidate || !ev.candidate.candidate) return;
        const cand = { candidate: ev.candidate.candidate, sdpMid: ev.candidate.sdpMid, sdpMLineIndex: ev.candidate.sdpMLineIndex };
        if (!this._sessionId) { this._pendingCandidates.push(cand); return; }
        try { await this._sendCandidate(cand); } catch (err) { console.warn(LOG_PREFIX, 'sendCandidate failed:', err); }
      };
      const offer = await this._pc.createOffer();
      await this._pc.setLocalDescription(offer);
      await new Promise((r) => setTimeout(r, 100));
      this._status(T('sending_offer'));
      this._unsubscribe = await this._hass.connection.subscribeMessage(
        (msg) => this._onSignalMessage(msg),
        { type: 'camera/webrtc/offer', entity_id: this._config.entity, offer: this._pc.localDescription.sdp }
      );
    } catch (err) {
      this._status(`${T('error_prefix')} ${err.message}`);
      console.error(LOG_PREFIX, 'Error:', err);
      this._teardown({ keepStatus: true });
    } finally {
      this._connecting = false;
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

  async _onSignalMessage(msg) {
    const T = (key) => t(this._lang, key);
    console.log(LOG_PREFIX, 'Signal msg:', msg);
    if (msg.type === 'session') {
      this._sessionId = msg.session_id;
      this._status(`${T('session')} ${this._sessionId.slice(0, 8)}...`);
      this._flushPendingCandidates();
    } else if (msg.type === 'answer') {
      this._status(T('answer_received'));
      try { await this._pc.setRemoteDescription({ type: 'answer', sdp: msg.answer }); }
      catch (err) { this._status(`${T('error_answer')} ${err.message}`); console.error(LOG_PREFIX, 'setRemoteDescription failed:', err); }
    } else if (msg.type === 'candidate') {
      try { const c = msg.candidate; await this._pc.addIceCandidate({ candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex }); }
      catch (err) { console.warn(LOG_PREFIX, 'addIceCandidate failed:', err); }
    } else if (msg.type === 'error') {
      this._status(`${T('error_ha')} ${msg.message || msg.code}`);
      console.error(LOG_PREFIX, 'Server error:', msg);
    } else {
      console.log(LOG_PREFIX, 'Unhandled msg:', msg);
    }
  }

  _setMicEnabled(enabled) {
    if (!this._localStream || !this._connected) return;
    this._localStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
    console.log(LOG_PREFIX, 'Mic:', enabled ? 'ON' : 'OFF');
  }

  // keepStatus: the caller already put a message on the overlay explaining
  // why the call is ending. Overwriting it with the generic text is what made
  // a failing card report nothing but "Disconnected".
  _teardown({ keepStatus = false } = {}) {
    const T = (key) => t(this._lang, key);
    const wasConnected = this._connected;
    this._connected = false;
    // Only one of these ever holds a stream, but clearing both keeps teardown
    // correct even if audio_only flipped between connect and hang-up.
    [
      this.shadowRoot.getElementById('video'),
      this.shadowRoot.getElementById('remote-audio'),
    ].forEach((el) => {
      if (el && el.srcObject) {
        el.srcObject.getTracks().forEach((t) => t.stop());
        el.srcObject = null;
      }
    });
    if (this._unsubscribe) { try { this._unsubscribe(); } catch (_) {} this._unsubscribe = null; }
    if (this._pc) { try { this._pc.close(); } catch (_) {} this._pc = null; }
    if (this._localStream) { this._localStream.getTracks().forEach((t) => t.stop()); this._localStream = null; }
    this._sessionId = null;
    this._pendingCandidates = [];
    this._hideAudioUnblock();
    const pttBtn = this.shadowRoot.getElementById('ptt');
    if (pttBtn) { pttBtn.disabled = true; pttBtn.classList.remove('ready', 'active'); }
    const startBtn = this.shadowRoot.getElementById('start');
    if (startBtn) startBtn.disabled = false;
    const hangupBtn = this.shadowRoot.getElementById('hangup');
    if (hangupBtn) hangupBtn.disabled = true;
    const doorBtn = this.shadowRoot.getElementById('door');
    if (doorBtn) doorBtn.disabled = true;
    if (!keepStatus) {
      this._status(wasConnected ? T('hung_up') : T('disconnected'));
    }
  }

  disconnectedCallback() {
    this._teardown();
  }
}

// ---------- Visual Editor ----------

// Built on HA's own <ha-form>, the same component the core card editors use.
// The previous hand-rolled editor created ha-select / mwc-list-item elements
// directly, which depends on frontend internals: on HA 2026.10 the language
// dropdown rendered but could not be opened. ha-form keeps that churn on HA's
// side, since its selectors ship with the frontend that renders them.
class RingIntercomVideoCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._lang = 'en';
    this._form = null;
    this._loading = false;
  }

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
    if (!this._hass || !this.isConnected) return;
    if (!this._form) {
      if (this._loading) return;
      this._loading = true;
      await loadHaComponents();
      // Never hang the editor if HA is slow to define ha-form.
      await Promise.race([
        customElements.whenDefined('ha-form'),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
      this._loading = false;
      this._form = document.createElement('ha-form');
      this._form.addEventListener('value-changed', (e) => {
        e.stopPropagation();
        this._valueChanged(e.detail.value);
      });
      this.appendChild(this._form);
    }
    this._lang = detectLanguage(this._hass, this._config.language);
    this._form.hass = this._hass;
    this._form.data = this._config;
    this._form.schema = this._buildSchema();
    this._form.computeLabel = (schema) => this._label(schema);
    this._form.computeHelper = (schema) => this._helper(schema);
  }

  _T(key) {
    return t(this._lang, key);
  }

  _buildSchema() {
    const languageOptions = Object.entries(LANGUAGE_NAMES)
      .filter(([code]) => code)
      .map(([value, label]) => ({ value, label }));
    return [
      { name: 'entity', required: true, selector: { entity: { domain: 'camera' } } },
      { name: 'open_door_entity', selector: { entity: { domain: DOOR_ENTITY_DOMAINS } } },
      // Not required, so HA shows a clear button: cleared = follow HA's language.
      { name: 'language', selector: { select: { mode: 'dropdown', options: languageOptions } } },
      { name: 'video_max_height', selector: { text: {} } },
      {
        type: 'expandable',
        name: 'open_door_action',
        icon: 'mdi:code-braces',
        title: this._T('editor_advanced_toggle'),
        expanded: !!this._config.open_door_action,
        schema: [
          { name: 'service', selector: { text: {} } },
          { name: 'entity_id', selector: { entity: {} } },
        ],
      },
    ];
  }

  _label(schema) {
    const keys = {
      entity: 'editor_camera_label',
      open_door_entity: 'editor_door_label',
      language: 'editor_language_label',
      video_max_height: 'editor_max_height_label',
      service: 'editor_service_label',
      entity_id: 'editor_action_entity_label',
    };
    return keys[schema.name] ? this._T(keys[schema.name]) : schema.title || schema.name;
  }

  _helper(schema) {
    const keys = {
      entity: 'editor_camera_help',
      open_door_entity: 'editor_door_help',
      language: 'editor_language_help',
      video_max_height: 'editor_max_height_help',
      service: 'editor_advanced_help',
      entity_id: 'editor_action_entity_help',
    };
    return keys[schema.name] ? this._T(keys[schema.name]) : undefined;
  }

  // Keep the saved YAML minimal: a cleared field removes its key instead of
  // leaving `language: ""` or an empty open_door_action behind. Anything the
  // form does not show (open_door_action.data, unknown keys) passes through.
  _valueChanged(value) {
    const isEmpty = (v) => v === undefined || v === null || v === '';
    const out = { ...value };
    Object.keys(out).forEach((k) => { if (isEmpty(out[k])) delete out[k]; });
    if (out.open_door_action && typeof out.open_door_action === 'object') {
      const action = { ...out.open_door_action };
      Object.keys(action).forEach((k) => { if (isEmpty(action[k])) delete action[k]; });
      if (Object.keys(action).length) out.open_door_action = action;
      else delete out.open_door_action;
    }
    this._config = out;
    this._update();
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: out },
      bubbles: true,
      composed: true,
    }));
  }
}

// ---------- Registration ----------

customElements.define(CARD_TAG, RingIntercomVideoCard);
customElements.define(EDITOR_TAG, RingIntercomVideoCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TAG,
  name: 'Ring Intercom Video Card',
  description: 'Two-way audio + video card for Ring Intercom Video (audio-only intercom supported, experimental)',
  preview: false,
  documentationURL: 'https://github.com/cmos486/ring-intercom-video-card',
});

console.log(
  `%c RING-INTERCOM-VIDEO-CARD %c v${CARD_VERSION} `,
  'color: white; background: #1976d2; font-weight: 700;',
  'color: #1976d2; background: white; font-weight: 700;'
);
