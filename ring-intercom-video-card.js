/**
 * Ring Intercom Video Card - v1.0.0
 *
 * Two-way audio + video Lovelace card for Ring Intercom Video.
 * Companion to the ring-intercom-video custom component.
 *
 * Schema:
 *   type: custom:ring-intercom-video-card
 *   entity: camera.xxx                    # required
 *   lock_entity: lock.xxx                 # optional, simple "open door" mode
 *   open_door_action:                     # optional, advanced mode
 *     service: script.turn_on
 *     entity_id: script.xxx
 *     data: {...}
 *
 * Legacy schema (auto-migrated):
 *   open_door:
 *     service: ...
 *     entity_id: ...
 *
 * Requirements:
 * - HTTPS (for getUserMedia microphone access)
 * - ring_intercom_camera custom component
 *
 * Repo: https://github.com/cmos486/ring-intercom-video-card
 * License: Apache-2.0
 */

const CARD_VERSION = '1.0.0';
const CARD_TAG = 'ring-intercom-video-card';
const EDITOR_TAG = 'ring-intercom-video-card-editor';
const LOG_PREFIX = '[ring-intercom-video-card]';

// ---------- Helpers ----------

function migrateConfig(config) {
  if (config && config.open_door && !config.open_door_action) {
    const { open_door, ...rest } = config;
    return { ...rest, open_door_action: open_door };
  }
  return config;
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

// Force HA to load ha-entity-picker / ha-textfield by triggering the
// built-in entities-card config element. Standard community technique.
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
              hass.states[id].attributes.device_kind === 'intercom_handset_video'))
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
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  getCardSize() {
    return 4;
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { padding: 0; overflow: hidden; }
        .container { display: flex; flex-direction: column; background: #000; }
        .video-wrap { position: relative; width: 100%; aspect-ratio: 4 / 3; background: #000; }
        video { width: 100%; height: 100%; object-fit: contain; background: #000; }
        .overlay {
          position: absolute; top: 8px; left: 8px;
          padding: 4px 8px; background: rgba(0, 0, 0, 0.6);
          color: #fff; font-size: 12px; border-radius: 4px; font-family: monospace;
        }
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
        <div class="container">
          <div class="video-wrap">
            <video id="video" autoplay playsinline></video>
            <div class="overlay" id="status">Idle</div>
          </div>
          <div class="controls">
            <button class="ptt" id="ptt" disabled>PULSAR PARA HABLAR</button>
            <div class="row">
              <button class="action-btn start-btn" id="start">📞 Conectar</button>
              <button class="action-btn door-btn" id="door" disabled>🔓 Abrir puerta</button>
              <button class="action-btn hangup-btn" id="hangup" disabled>📵 Colgar</button>
            </div>
          </div>
        </div>
      </ha-card>
    `;

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

    if (!resolveOpenDoorAction(this._config)) {
      doorBtn.style.display = 'none';
    }
  }

  _status(text) {
    const el = this.shadowRoot.getElementById('status');
    if (el) el.textContent = text;
    console.log(LOG_PREFIX, text);
  }

  async _openDoor() {
    const action = resolveOpenDoorAction(this._config);
    if (!action || !action.service) { this._status('Abrir puerta no configurado'); return; }
    const [domain, service] = action.service.split('.');
    if (!domain || !service) { this._status('service mal formado'); return; }
    try {
      const data = {};
      if (action.entity_id) data.entity_id = action.entity_id;
      Object.assign(data, action.data || {});
      await this._hass.callService(domain, service, data);
      this._status('Puerta abierta');
      const doorBtn = this.shadowRoot.getElementById('door');
      const originalBg = doorBtn.style.background;
      doorBtn.style.background = '#2e7d32';
      setTimeout(() => { doorBtn.style.background = originalBg; }, 800);
    } catch (err) {
      this._status(`Error abriendo: ${err.message}`);
      console.error(LOG_PREFIX, 'openDoor failed:', err);
    }
  }

  async _connect() {
    if (this._connecting || this._connected) return;
    this._connecting = true;
    this._sessionId = null;
    this._pendingCandidates = [];
    this._status('Conectando...');
    const startBtn = this.shadowRoot.getElementById('start');
    const hangupBtn = this.shadowRoot.getElementById('hangup');
    const doorBtn = this.shadowRoot.getElementById('door');
    startBtn.disabled = true;
    hangupBtn.disabled = false;
    if (resolveOpenDoorAction(this._config)) doorBtn.disabled = false;
    try {
      this._status('Pidiendo microfono...');
      this._localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      this._localStream.getAudioTracks().forEach((t) => (t.enabled = false));
      this._pc = new RTCPeerConnection({ iceServers: [], bundlePolicy: 'max-bundle' });
      const audioTrack = this._localStream.getAudioTracks()[0];
      this._pc.addTransceiver(audioTrack, { direction: 'sendrecv', streams: [this._localStream] });
      this._pc.addTransceiver('video', { direction: 'recvonly' });
      this._pc.ontrack = (ev) => {
        console.log(LOG_PREFIX, 'Track recibido:', ev.track.kind);
        const video = this.shadowRoot.getElementById('video');
        if (!video.srcObject) video.srcObject = new MediaStream();
        video.srcObject.addTrack(ev.track);
      };
      this._pc.onconnectionstatechange = () => {
        if (!this._pc) return;
        this._status(`PC state: ${this._pc.connectionState}`);
        if (this._pc.connectionState === 'connected') {
          this._connected = true;
          const pttBtn = this.shadowRoot.getElementById('ptt');
          pttBtn.disabled = false;
          pttBtn.classList.add('ready');
        } else if (['failed', 'disconnected', 'closed'].includes(this._pc.connectionState)) {
          this._teardown();
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
      this._status('Enviando offer a HA...');
      this._unsubscribe = await this._hass.connection.subscribeMessage(
        (msg) => this._onSignalMessage(msg),
        { type: 'camera/webrtc/offer', entity_id: this._config.entity, offer: this._pc.localDescription.sdp }
      );
    } catch (err) {
      this._status(`Error: ${err.message}`);
      console.error(LOG_PREFIX, 'Error:', err);
      this._teardown();
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
    console.log(LOG_PREFIX, 'Signal msg:', msg);
    if (msg.type === 'session') {
      this._sessionId = msg.session_id;
      this._status(`Sesion HA: ${this._sessionId.slice(0, 8)}...`);
      this._flushPendingCandidates();
    } else if (msg.type === 'answer') {
      this._status('Answer recibido');
      try { await this._pc.setRemoteDescription({ type: 'answer', sdp: msg.answer }); }
      catch (err) { this._status(`Error en answer: ${err.message}`); console.error(LOG_PREFIX, 'setRemoteDescription failed:', err); }
    } else if (msg.type === 'candidate') {
      try { const c = msg.candidate; await this._pc.addIceCandidate({ candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex }); }
      catch (err) { console.warn(LOG_PREFIX, 'addIceCandidate failed:', err); }
    } else if (msg.type === 'error') {
      this._status(`Error de HA: ${msg.message || msg.code}`);
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

  _teardown() {
    const wasConnected = this._connected;
    this._connected = false;
    const video = this.shadowRoot.getElementById('video');
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    if (this._unsubscribe) { try { this._unsubscribe(); } catch (_) {} this._unsubscribe = null; }
    if (this._pc) { try { this._pc.close(); } catch (_) {} this._pc = null; }
    if (this._localStream) { this._localStream.getTracks().forEach((t) => t.stop()); this._localStream = null; }
    this._sessionId = null;
    this._pendingCandidates = [];
    const pttBtn = this.shadowRoot.getElementById('ptt');
    if (pttBtn) { pttBtn.disabled = true; pttBtn.classList.remove('ready', 'active'); }
    const startBtn = this.shadowRoot.getElementById('start');
    if (startBtn) startBtn.disabled = false;
    const hangupBtn = this.shadowRoot.getElementById('hangup');
    if (hangupBtn) hangupBtn.disabled = true;
    const doorBtn = this.shadowRoot.getElementById('door');
    if (doorBtn) doorBtn.disabled = true;
    this._status(wasConnected ? 'Colgado' : 'Desconectado');
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
  }

  connectedCallback() {
    this._isConnected = true;
    this._renderIfReady();
  }

  setConfig(config) {
    this._config = migrateConfig(config || {});
    if (this._config.open_door_action) this._showAdvanced = true;
    this._renderIfReady();
  }

  set hass(hass) {
    const firstHass = !this._hass;
    this._hass = hass;
    if (firstHass) {
      this._renderIfReady();
    } else {
      this.querySelectorAll('ha-entity-picker, ha-textfield').forEach((el) => {
        el.hass = hass;
      });
    }
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

  _render() {
    while (this.firstChild) this.removeChild(this.firstChild);

    const c = this._config;
    const adv = this._showAdvanced;
    const action = c.open_door_action || {};

    const container = document.createElement('div');
    container.style.cssText = 'display:flex; flex-direction:column; gap:16px; padding:8px 0;';

    const cameraField = document.createElement('div');
    cameraField.appendChild(this._makeEntityPicker({
      value: c.entity,
      label: 'Camera entity (required)',
      domain: 'camera',
      onChange: (v) => this._setConfigValue('entity', v),
    }));
    cameraField.appendChild(this._makeHelpText('Camera entity from the Ring Intercom Video component.'));
    container.appendChild(cameraField);

    if (!adv) {
      const lockField = document.createElement('div');
      lockField.appendChild(this._makeEntityPicker({
        value: c.lock_entity,
        label: 'Lock entity (optional)',
        domain: 'lock',
        onChange: (v) => this._setConfigValue('lock_entity', v),
      }));
      lockField.appendChild(this._makeHelpText('If set, an "Open door" button will appear and call lock.unlock on this entity.'));
      container.appendChild(lockField);
    }

    const toggle = document.createElement('div');
    toggle.style.cssText = 'display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; padding:8px 0; color:var(--primary-text-color); font-size:14px;';
    const chevron = document.createElement('span');
    chevron.style.cssText = `display:inline-block; transition:transform 0.2s; transform:${adv ? 'rotate(90deg)' : 'rotate(0deg)'};`;
    chevron.textContent = '▶';
    const tlabel = document.createElement('span');
    tlabel.textContent = 'Advanced: custom open-door action';
    toggle.appendChild(chevron);
    toggle.appendChild(tlabel);
    toggle.addEventListener('click', () => this._toggleAdvanced());
    container.appendChild(toggle);

    if (adv) {
      const advBox = document.createElement('div');
      advBox.style.cssText = 'padding:12px; border:1px solid var(--divider-color, #ccc); border-radius:8px; display:flex; flex-direction:column; gap:12px;';
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:12px; color:var(--secondary-text-color); font-style:italic;';
      hint.textContent = 'Configure any service call for the "Open door" button. Leaving these empty disables the button.';
      advBox.appendChild(hint);
      advBox.appendChild(this._makeTextField({
        value: action.service,
        label: 'Service (e.g. lock.unlock, script.turn_on)',
        onInput: (v) => this._setActionValue('service', v),
      }));
      const entityWrap = document.createElement('div');
      entityWrap.appendChild(this._makeEntityPicker({
        value: action.entity_id,
        label: 'Entity (optional)',
        domain: null,
        onChange: (v) => this._setActionValue('entity_id', v),
      }));
      entityWrap.appendChild(this._makeHelpText('If your service needs an entity_id, set it here.'));
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
  description: 'Two-way audio + video card for Ring Intercom Video',
  preview: false,
  documentationURL: 'https://github.com/cmos486/ring-intercom-video-card',
});

console.log(
  `%c RING-INTERCOM-VIDEO-CARD %c v${CARD_VERSION} `,
  'color: white; background: #1976d2; font-weight: 700;',
  'color: #1976d2; background: white; font-weight: 700;'
);
