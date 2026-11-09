/*
 * Test doubles for the e2e harness. Loaded before the card in harness.html.
 *
 * - makeHass(): a minimal `hass` object with the two websocket calls the card
 *   uses (camera/webrtc/offer as a subscription, camera/webrtc/candidate as a
 *   one-shot) and a callService recorder.
 * - The "Ring" side of the call is a real RTCPeerConnection in the same page.
 *   It answers whatever m-lines the card offers, like Ring does: an audio track
 *   (a 440 Hz tone) on the audio m-line and, only if offered, a moving canvas
 *   on the video m-line. So a working call really carries media both ways.
 * - <ha-form> and <ha-entity-picker> stand-ins, so the editor can be tested
 *   without the HA frontend. The fake ha-form just stores what it is given.
 */
(() => {
  const ring = {
    offers: [],
    candidatesFromCard: 0,
    peer: null,
    failNextOffer: null,
  };
  window.__ring = ring;
  window.__serviceCalls = [];

  function videoTrack() {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    let x = 0;
    setInterval(() => {
      ctx.fillStyle = '#123';
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = '#fc0';
      ctx.fillRect(x, 100, 40, 40);
      x = (x + 8) % 320;
    }, 40);
    return canvas.captureStream(25).getVideoTracks()[0];
  }

  function audioTrack() {
    const ac = new AudioContext();
    const osc = ac.createOscillator();
    osc.frequency.value = 440;
    const dest = ac.createMediaStreamDestination();
    osc.connect(dest);
    osc.start();
    return dest.stream.getAudioTracks()[0];
  }

  async function answerOffer(sdp, send) {
    const pc = new RTCPeerConnection({ iceServers: [] });
    ring.peer = pc;
    // Chromium only decodes (and reports the level of) remote audio that is
    // actually played somewhere, so give the card's microphone a sink.
    pc.ontrack = (ev) => {
      if (ev.track.kind !== 'audio') return;
      const sink = new Audio();
      sink.muted = true;
      sink.srcObject = new MediaStream([ev.track]);
      sink.play().catch(() => {});
      const ac = new AudioContext();
      const analyser = ac.createAnalyser();
      analyser.fftSize = 2048;
      ac.createMediaStreamSource(sink.srcObject).connect(analyser);
      ring.analyser = analyser;
    };
    pc.onicecandidate = (ev) => {
      if (!ev.candidate || !ev.candidate.candidate) return;
      send({
        type: 'candidate',
        candidate: {
          candidate: ev.candidate.candidate,
          sdpMid: ev.candidate.sdpMid,
          sdpMLineIndex: ev.candidate.sdpMLineIndex,
        },
      });
    };
    await pc.setRemoteDescription({ type: 'offer', sdp });
    for (const tr of pc.getTransceivers()) {
      const kind = tr.receiver.track.kind;
      if (kind === 'audio') {
        await tr.sender.replaceTrack(audioTrack());
        tr.direction = 'sendrecv';
      } else if (kind === 'video') {
        await tr.sender.replaceTrack(videoTrack());
        tr.direction = 'sendonly';
      }
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    send({ type: 'answer', answer: pc.localDescription.sdp });
  }

  // Loudest sample the fake Ring hears from the card over `ms` (0 = silence).
  ring.micPeak = async (ms = 800) => {
    if (!ring.analyser) return 0;
    const buf = new Float32Array(ring.analyser.fftSize);
    let peak = 0;
    const end = performance.now() + ms;
    while (performance.now() < end) {
      ring.analyser.getFloatTimeDomainData(buf);
      for (const v of buf) peak = Math.max(peak, Math.abs(v));
      await new Promise((r) => setTimeout(r, 20));
    }
    return peak;
  };

  window.makeHass = ({ language = 'en', states = {} } = {}) => ({
    language,
    locale: { language },
    states,
    callService: async (domain, service, data) => {
      window.__serviceCalls.push({ domain, service, data });
    },
    connection: {
      subscribeMessage: async (callback, msg) => {
        if (msg.type !== 'camera/webrtc/offer') throw new Error(`unexpected ${msg.type}`);
        ring.offers.push(msg);
        if (ring.failNextOffer) {
          const message = ring.failNextOffer;
          ring.failNextOffer = null;
          setTimeout(() => callback({ type: 'error', code: 'webrtc_offer_failed', message }), 0);
          return () => {};
        }
        let closed = false;
        const send = (m) => { if (!closed) callback(m); };
        setTimeout(() => {
          send({ type: 'session', session_id: 'fake-session-0123456789' });
          answerOffer(msg.offer, send).catch((err) => console.error('fake ring failed', err));
        }, 0);
        return () => {
          closed = true;
          if (ring.peer) { ring.peer.close(); ring.peer = null; }
        };
      },
      sendMessagePromise: async (msg) => {
        if (msg.type === 'camera/webrtc/candidate') {
          ring.candidatesFromCard += 1;
          if (ring.peer) await ring.peer.addIceCandidate(msg.candidate).catch(() => {});
          return null;
        }
        throw new Error(`unexpected ${msg.type}`);
      },
    },
  });

  window.VIDEO_STATES = {
    'camera.entree_intercom': {
      entity_id: 'camera.entree_intercom',
      state: 'idle',
      attributes: { device_kind: 'intercom_handset_video', friendly_name: 'Entrée' },
    },
    'button.entree_open_door': { entity_id: 'button.entree_open_door', state: 'unknown', attributes: {} },
  };

  window.AUDIO_STATES = {
    'camera.hall_audio': {
      entity_id: 'camera.hall_audio',
      state: 'idle',
      attributes: { device_kind: 'intercom_handset_audio', audio_only: true },
    },
    'button.hall_open_door': { entity_id: 'button.hall_open_door', state: 'unknown', attributes: {} },
  };

  window.mountCard = (config, hassOpts) => {
    const card = document.createElement('ring-intercom-video-card');
    card.setConfig(config);
    card.hass = window.makeHass(hassOpts);
    document.body.appendChild(card);
    window.card = card;
    return card;
  };

  window.mountEditor = async (config, hassOpts) => {
    const Card = customElements.get('ring-intercom-video-card');
    const editor = await Card.getConfigElement();
    window.__configChanged = [];
    editor.addEventListener('config-changed', (e) => window.__configChanged.push(e.detail.config));
    editor.setConfig(config);
    editor.hass = window.makeHass(hassOpts);
    document.body.appendChild(editor);
    window.editor = editor;
    return editor;
  };

  // --- HA frontend stand-ins ---
  class FakeHaForm extends HTMLElement {}
  class FakeEntityPicker extends HTMLElement {}
  customElements.define('ha-form', FakeHaForm);
  customElements.define('ha-entity-picker', FakeEntityPicker);
  window.loadCardHelpers = async () => {
    throw new Error('loadCardHelpers should not be needed when ha-form exists');
  };
})();
