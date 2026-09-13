/**
 * Ring Intercom Video Card - v1.3.1
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
 *   lock_entity: lock.xxx                 # optional, simple "open door" mode
 *   open_door_action:                     # optional, advanced mode
 *     service: script.turn_on
 *     entity_id: script.xxx
 *     data: {...}
 *   language: es|en|ca                    # optional, overrides HA language auto-detection
 *   video_max_height: 230px               # optional, caps video height (px, vh, %...)
 *
 * Legacy schema (auto-migrated):
 *   open_door:
 *     service: ...
 *     entity_id: ...
 *
 * Repo: https://github.com/cmos486/ring-intercom-video-card
 * License: Apache-2.0
 */

const CARD_VERSION = '1.3.1';
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
    editor_lock_label: 'Entidad cerradura (opcional)',
    editor_lock_help: 'Si se configura, aparece el boton "Abrir puerta" y llama a lock.unlock en esta entidad.',
    editor_advanced_toggle: 'Avanzado: accion personalizada para abrir puerta',
    editor_advanced_help: 'Configura cualquier llamada de servicio para el boton "Abrir puerta". Dejarlo vacio deshabilita el boton.',
    editor_service_label: 'Servicio (ej. lock.unlock, script.turn_on)',
    editor_action_entity_label: 'Entidad (opcional)',
    editor_action_entity_help: 'Si el servicio necesita un entity_id, ponlo aqui.',
    editor_language_label: 'Idioma (opcional, sobrescribe el de HA)',
    editor_language_help: 'Idioma de los textos del card. Si se deja vacio, se usa el idioma de Home Assistant.',
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
    editor_lock_label: 'Lock entity (optional)',
    editor_lock_help: 'If set, an "Open door" button appears and calls lock.unlock on this entity.',
    editor_advanced_toggle: 'Advanced: custom open-door action',
    editor_advanced_help: 'Configure any service call for the "Open door" button. Leaving it empty disables the button.',
    editor_service_label: 'Service (e.g. lock.unlock, script.turn_on)',
    editor_action_entity_label: 'Entity (optional)',
    editor_action_entity_help: 'If your service needs an entity_id, set it here.',
    editor_language_label: 'Language (optional, overrides HA language)',
    editor_language_help: 'Language for card texts. Leave empty to use Home Assistant language.',
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
    editor_lock_label: 'Entitat pany (opcional)',
    editor_lock_help: 'Si es configura, apareix el boto "Obrir porta" i crida lock.unlock en aquesta entitat.',
    editor_advanced_toggle: 'Avancat: accio personalitzada per obrir la porta',
    editor_advanced_help: 'Configura qualsevol crida de servei per al boto "Obrir porta". Deixar-ho buit desactiva el boto.',
    editor_service_label: 'Servei (p.ex. lock.unlock, script.turn_on)',
    editor_action_entity_label: 'Entitat (opcional)',
    editor_action_entity_help: 'Si el servei necessita un entity_id, posa-l\'hi aqui.',
    editor_language_label: 'Idioma (opcional, sobreescriu el d\'HA)',
    editor_language_help: "Idioma dels textos del card. Si es deixa buit, s'usa l'idioma de Home Assistant.",
  },
};

const LANGUAGE_NAMES = {
  '': 'Auto (Home Assistant)',
  es: 'Espanol',
  en: 'English',
  ca: 'Catala',
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

function migrateConfig(config) {
  if (config && config.open_door && !config.open_door_action) {
    const { open_door, ...rest } = config;
    return { ...rest, open_door_action: open_door };
  }
  return config;
}

// The backend marks Ring's handset-only intercom (device_kind:
// intercom_handset_audio) with audio_only: true. Older backends don't publish
// the attribute at all, so a missing value must mean "has video".
function isAudioOnlyEntity(hass, entityId) {
  return hass?.states?.[entityId]?.attributes?.audio_only === true;
}

function resolveOpenDoorAction(config) {
  if (config.open_door_action && config.open_door_action.service) {
    return config.open_door_action;
  }
  if (config.lock_entity) {
    return { service: 'lock.unlock', entity_id: config.lock_entity };
  }
  return null;
}

async function loadHaComponents() {
  if (customElements.get('ha-entity-picker') && customElements.get('ha-textfield')) {
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
    return {
      entity: cameraEntity || 'camera.your_ring_intercom',
    };
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

class RingIntercomVideoCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._showAdvanced = false;
    this._isConnected = false;
    this._lang = 'en';
  }

  connectedCallback() {
    this._isConnected = true;
    this._renderIfReady();
  }

  setConfig(config) {
    this._config = migrateConfig(config || {});
    if (this._config.open_door_action) this._showAdvanced = true;
    this._refreshLang();
    this._renderIfReady();
  }

  set hass(hass) {
    const firstHass = !this._hass;
    this._hass = hass;
    this._refreshLang();
    if (firstHass) {
      this._renderIfReady();
    } else {
      this.querySelectorAll('ha-entity-picker, ha-textfield').forEach((el) => {
        el.hass = hass;
      });
    }
  }

  _refreshLang() {
    this._lang = detectLanguage(this._hass, this._config.language);
  }

  async _renderIfReady() {
    if (!this._isConnected || !this._hass) return;
    await loadHaComponents();
    this._render();
  }

  _emitChange() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  _setConfigValue(key, value) {
    if (value === '' || value == null) {
      const { [key]: _, ...rest } = this._config;
      this._config = rest;
    } else {
      this._config = { ...this._config, [key]: value };
    }
    this._refreshLang();
    this._emitChange();
  }

  _setActionValue(field, value) {
    const current = { ...(this._config.open_door_action || {}) };
    if (value === '' || value == null) delete current[field];
    else current[field] = value;
    if (Object.keys(current).length === 0) {
      const { open_door_action: _, ...rest } = this._config;
      this._config = rest;
    } else {
      this._config = { ...this._config, open_door_action: current };
    }
    this._emitChange();
  }

  _toggleAdvanced() {
    this._showAdvanced = !this._showAdvanced;
    if (this._showAdvanced && this._config.lock_entity && !this._config.open_door_action) {
      const lockEntity = this._config.lock_entity;
      const { lock_entity: _, ...rest } = this._config;
      this._config = { ...rest, open_door_action: { service: 'lock.unlock', entity_id: lockEntity } };
      this._emitChange();
    }
    this._render();
  }

  _makeHelpText(text) {
    const div = document.createElement('div');
    div.style.cssText = 'font-size:12px; color:var(--secondary-text-color); margin-top:4px;';
    div.textContent = text;
    return div;
  }

  _makeEntityPicker({ value, label, domain, onChange }) {
    const picker = document.createElement('ha-entity-picker');
    picker.hass = this._hass;
    picker.label = label;
    picker.value = value || '';
    if (domain) picker.includeDomains = [domain];
    picker.allowCustomEntity = true;
    picker.addEventListener('value-changed', (e) => { onChange(e.detail.value); });
    return picker;
  }

  _makeTextField({ value, label, onInput }) {
    const field = document.createElement('ha-textfield');
    field.label = label;
    field.value = value || '';
    field.style.width = '100%';
    field.addEventListener('input', (e) => { onInput(e.target.value); });
    return field;
  }

  _makeLanguageSelect({ value, label, onChange }) {
    const wrapper = document.createElement('div');
    const select = document.createElement('ha-select');
    select.label = label;
    select.value = value || '';
    select.style.width = '100%';
    select.addEventListener('selected', (e) => { onChange(e.target.value); });
    select.addEventListener('closed', (e) => e.stopPropagation());

    Object.entries(LANGUAGE_NAMES).forEach(([code, name]) => {
      const item = document.createElement('mwc-list-item');
      item.value = code;
      item.textContent = name;
      select.appendChild(item);
    });

    wrapper.appendChild(select);
    return wrapper;
  }

  _render() {
    const T = (key) => t(this._lang, key);
    while (this.firstChild) this.removeChild(this.firstChild);

    const c = this._config;
    const adv = this._showAdvanced;
    const action = c.open_door_action || {};

    const container = document.createElement('div');
    container.style.cssText = 'display:flex; flex-direction:column; gap:16px; padding:8px 0;';

    // Camera entity
    const cameraField = document.createElement('div');
    cameraField.appendChild(this._makeEntityPicker({
      value: c.entity,
      label: T('editor_camera_label'),
      domain: 'camera',
      onChange: (v) => this._setConfigValue('entity', v),
    }));
    cameraField.appendChild(this._makeHelpText(T('editor_camera_help')));
    container.appendChild(cameraField);

    if (!adv) {
      const lockField = document.createElement('div');
      lockField.appendChild(this._makeEntityPicker({
        value: c.lock_entity,
        label: T('editor_lock_label'),
        domain: 'lock',
        onChange: (v) => this._setConfigValue('lock_entity', v),
      }));
      lockField.appendChild(this._makeHelpText(T('editor_lock_help')));
      container.appendChild(lockField);
    }

    // Language selector
    const langField = document.createElement('div');
    langField.appendChild(this._makeLanguageSelect({
      value: c.language || '',
      label: T('editor_language_label'),
      onChange: (v) => this._setConfigValue('language', v),
    }));
    langField.appendChild(this._makeHelpText(T('editor_language_help')));
    container.appendChild(langField);

    // Advanced toggle
    const toggle = document.createElement('div');
    toggle.style.cssText = 'display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; padding:8px 0; color:var(--primary-text-color); font-size:14px;';
    const chevron = document.createElement('span');
    chevron.style.cssText = `display:inline-block; transition:transform 0.2s; transform:${adv ? 'rotate(90deg)' : 'rotate(0deg)'};`;
    chevron.textContent = '▶';
    const tlabel = document.createElement('span');
    tlabel.textContent = T('editor_advanced_toggle');
    toggle.appendChild(chevron);
    toggle.appendChild(tlabel);
    toggle.addEventListener('click', () => this._toggleAdvanced());
    container.appendChild(toggle);

    if (adv) {
      const advBox = document.createElement('div');
      advBox.style.cssText = 'padding:12px; border:1px solid var(--divider-color, #ccc); border-radius:8px; display:flex; flex-direction:column; gap:12px;';
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:12px; color:var(--secondary-text-color); font-style:italic;';
      hint.textContent = T('editor_advanced_help');
      advBox.appendChild(hint);
      advBox.appendChild(this._makeTextField({
        value: action.service,
        label: T('editor_service_label'),
        onInput: (v) => this._setActionValue('service', v),
      }));
      const entityWrap = document.createElement('div');
      entityWrap.appendChild(this._makeEntityPicker({
        value: action.entity_id,
        label: T('editor_action_entity_label'),
        domain: null,
        onChange: (v) => this._setActionValue('entity_id', v),
      }));
      entityWrap.appendChild(this._makeHelpText(T('editor_action_entity_help')));
      advBox.appendChild(entityWrap);
      container.appendChild(advBox);
    }

    this.appendChild(container);
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
