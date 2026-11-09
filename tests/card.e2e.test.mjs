// End-to-end tests for ring-intercom-video-card.
//
// Runs the real card in headless Chromium against a fake `hass` and a fake Ring
// peer (see fakes.js), so calls really negotiate WebRTC and carry media.
//
//   cd tests && npm install && npx playwright install chromium && npm test

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };

let server;
let baseUrl;
let browser;

before(async () => {
  server = http.createServer(async (req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  // localhost is a secure context, so getUserMedia is available.
  baseUrl = `http://localhost:${server.address().port}/tests/harness.html`;
  browser = await chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
});

after(async () => {
  await browser?.close();
  await new Promise((r) => server.close(r));
});

async function openPage() {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto(baseUrl);
  await page.waitForFunction(() => customElements.get('ring-intercom-video-card'));
  page.errors = errors;
  return page;
}

const shadowText = (page, id) =>
  page.evaluate((i) => window.card.shadowRoot.getElementById(i)?.textContent.trim(), id);

const click = (page, id) =>
  page.evaluate((i) => window.card.shadowRoot.getElementById(i).click(), id);

const statusText = (page) => shadowText(page, 'status');

async function waitForCall(page) {
  await page.waitForFunction(() => window.card._connected === true, null, { timeout: 15000 });
}

// ---------- Translations ----------

test('every language defines every key the English UI uses', async () => {
  const page = await openPage();
  const missing = await page.evaluate(() => {
    // TRANSLATIONS is a top-level const of a classic script: reachable by name.
    // eslint-disable-next-line no-undef
    const all = TRANSLATIONS;
    const out = {};
    for (const [lang, table] of Object.entries(all)) {
      const gaps = Object.keys(all.en).filter((k) => !(k in table));
      if (gaps.length) out[lang] = gaps;
    }
    return out;
  });
  assert.deepEqual(missing, {});
  await page.close();
});

test('French is picked up from the HA locale', async () => {
  const page = await openPage();
  await page.evaluate(() => window.mountCard({ entity: 'camera.entree_intercom', open_door_entity: 'button.entree_open_door' }, { language: 'fr', states: window.VIDEO_STATES }));
  assert.match(await shadowText(page, 'start'), /Décrocher/);
  assert.match(await shadowText(page, 'door'), /Ouvrir la porte/);
  assert.match(await shadowText(page, 'hangup'), /Raccrocher/);
  assert.equal(await statusText(page), 'Inactif');
  await page.close();
});

test('regional HA locale (fr-CA) falls back to French', async () => {
  const page = await openPage();
  await page.evaluate(() => window.mountCard({ entity: 'camera.entree_intercom' }, { language: 'fr-CA', states: window.VIDEO_STATES }));
  assert.match(await shadowText(page, 'start'), /Décrocher/);
  await page.close();
});

test('language: fr in the config overrides an English HA', async () => {
  const page = await openPage();
  await page.evaluate(() => window.mountCard({ entity: 'camera.entree_intercom', language: 'fr' }, { language: 'en', states: window.VIDEO_STATES }));
  assert.match(await shadowText(page, 'start'), /Décrocher/);
  await page.close();
});

test('audio-only surface is translated to French', async () => {
  const page = await openPage();
  await page.evaluate(() => window.mountCard({ entity: 'camera.hall_audio' }, { language: 'fr', states: window.AUDIO_STATES }));
  const title = await page.evaluate(() => window.card.shadowRoot.querySelector('.audio-title').textContent);
  assert.equal(title, 'Interphone audio');
  await page.close();
});

// ---------- Calls (regression: unchanged behaviour) ----------

test('video call: video plays, Ring audio arrives, push-to-talk sends the mic', async () => {
  const page = await openPage();
  await page.evaluate(() => window.mountCard({ entity: 'camera.entree_intercom', open_door_entity: 'button.entree_open_door' }, { language: 'en', states: window.VIDEO_STATES }));
  await click(page, 'start');
  await waitForCall(page);

  const offer = await page.evaluate(() => window.__ring.offers[0].offer);
  assert.match(offer, /m=audio/);
  assert.match(offer, /m=video/);

  await page.waitForFunction(() => {
    const v = window.card.shadowRoot.getElementById('video');
    return v.videoWidth > 0 && v.currentTime > 0.3;
  }, null, { timeout: 10000 });
  const kinds = await page.evaluate(() =>
    window.card.shadowRoot.getElementById('video').srcObject.getTracks().map((t) => t.kind).sort());
  assert.deepEqual(kinds, ['audio', 'video']);

  // Mic is off until push-to-talk is held.
  assert.equal(await page.evaluate(() => window.card.shadowRoot.getElementById('ptt').disabled), false);
  assert.equal(await page.evaluate(() => window.card._localStream.getAudioTracks()[0].enabled), false);

  const silent = await page.evaluate(() => window.__ring.micPeak());
  await page.evaluate(() => window.card.shadowRoot.getElementById('ptt').dispatchEvent(new MouseEvent('mousedown')));
  assert.equal(await page.evaluate(() => window.card._localStream.getAudioTracks()[0].enabled), true);
  await page.waitForTimeout(500);
  const talking = await page.evaluate(() => window.__ring.micPeak());
  await page.evaluate(() => window.card.shadowRoot.getElementById('ptt').dispatchEvent(new MouseEvent('mouseup')));
  assert.equal(await page.evaluate(() => window.card._localStream.getAudioTracks()[0].enabled), false);
  assert.ok(silent < 0.01, `Ring should hear silence before PTT (peak ${silent})`);
  assert.ok(talking > 0.05, `Ring should hear the mic while PTT is held (peak ${talking})`);

  assert.deepEqual(page.errors, []);
  await page.close();
});

test('audio-only call: audio offer only, no video element, audio plays', async () => {
  const page = await openPage();
  await page.evaluate(() => window.mountCard({ entity: 'camera.hall_audio' }, { language: 'en', states: window.AUDIO_STATES }));
  assert.equal(await page.evaluate(() => !!window.card.shadowRoot.getElementById('video')), false);
  await click(page, 'start');
  await waitForCall(page);

  const offer = await page.evaluate(() => window.__ring.offers[0].offer);
  assert.match(offer, /m=audio/);
  assert.doesNotMatch(offer, /m=video/);

  await page.waitForFunction(() => {
    const a = window.card.shadowRoot.getElementById('remote-audio');
    return a.srcObject && !a.paused;
  }, null, { timeout: 10000 });
  await page.close();
});

test('open door presses the Ring button, hang up tears the call down (French)', async () => {
  const page = await openPage();
  await page.evaluate(() => window.mountCard({ entity: 'camera.entree_intercom', open_door_entity: 'button.entree_open_door' }, { language: 'fr', states: window.VIDEO_STATES }));
  await click(page, 'start');
  await waitForCall(page);

  await click(page, 'door');
  await page.waitForFunction(() => window.__serviceCalls.length === 1);
  assert.deepEqual(await page.evaluate(() => window.__serviceCalls[0]), {
    domain: 'button', service: 'press', data: { entity_id: 'button.entree_open_door' },
  });
  assert.equal(await statusText(page), 'Porte ouverte');

  await click(page, 'hangup');
  assert.equal(await statusText(page), 'Raccroché');
  assert.equal(await page.evaluate(() => window.card._pc), null);
  assert.equal(await page.evaluate(() => window.card.shadowRoot.getElementById('start').disabled), false);
  await page.close();
});

test('legacy lock_entity still opens the door', async () => {
  const page = await openPage();
  await page.evaluate(() => window.mountCard({ entity: 'camera.entree_intercom', lock_entity: 'lock.entree' }, { language: 'en', states: window.VIDEO_STATES }));
  await click(page, 'start');
  await waitForCall(page);
  await click(page, 'door');
  await page.waitForFunction(() => window.__serviceCalls.length === 1);
  assert.deepEqual(await page.evaluate(() => window.__serviceCalls[0]), {
    domain: 'lock', service: 'unlock', data: { entity_id: 'lock.entree' },
  });
  await page.close();
});

test('an HA signalling error is shown in the overlay', async () => {
  const page = await openPage();
  await page.evaluate(() => window.mountCard({ entity: 'camera.entree_intercom' }, { language: 'fr', states: window.VIDEO_STATES }));
  await page.evaluate(() => { window.__ring.failNextOffer = 'Ring a refusé'; });
  await click(page, 'start');
  await page.waitForFunction(() => window.card.shadowRoot.getElementById('status').textContent.includes('Ring a refusé'));
  assert.equal(await statusText(page), 'Erreur HA : Ring a refusé');
  await page.close();
});

// ---------- Stub config ----------

test('getStubConfig finds a video intercom and its open-door button', async () => {
  const page = await openPage();
  const stub = await page.evaluate(() =>
    customElements.get('ring-intercom-video-card').getStubConfig({ states: window.VIDEO_STATES }));
  assert.deepEqual(stub, { entity: 'camera.entree_intercom', open_door_entity: 'button.entree_open_door' });
  await page.close();
});

test('getStubConfig finds an audio-only intercom', async () => {
  const page = await openPage();
  const stub = await page.evaluate(() =>
    customElements.get('ring-intercom-video-card').getStubConfig({ states: window.AUDIO_STATES }));
  assert.deepEqual(stub, { entity: 'camera.hall_audio', open_door_entity: 'button.hall_open_door' });
  await page.close();
});

// ---------- Visual editor (ha-form) ----------

async function form(page) {
  await page.waitForFunction(() => window.editor.querySelector('ha-form')?.schema);
  return page.evaluate(() => {
    const f = window.editor.querySelector('ha-form');
    const flat = [];
    const walk = (schema) => schema.forEach((s) => { flat.push(s); if (s.schema) walk(s.schema); });
    walk(f.schema);
    return {
      data: f.data,
      names: flat.map((s) => s.name).filter(Boolean),
      labels: Object.fromEntries(flat.filter((s) => s.name).map((s) => [s.name, f.computeLabel(s)])),
      helpers: Object.fromEntries(flat.filter((s) => s.name).map((s) => [s.name, f.computeHelper(s)])),
      languages: flat.find((s) => s.name === 'language').selector.select.options.map((o) => o.value),
      expandable: flat.find((s) => s.name === 'open_door_action'),
      hasHass: !!f.hass,
    };
  });
}

const fireFormChange = (page, value) =>
  page.evaluate((v) => {
    window.editor.querySelector('ha-form').dispatchEvent(new CustomEvent('value-changed', { detail: { value: v } }));
  }, value);

test('editor renders a native ha-form with every option, in French', async () => {
  const page = await openPage();
  await page.evaluate(() => window.mountEditor({ type: 'custom:ring-intercom-video-card', entity: 'camera.entree_intercom' }, { language: 'fr', states: window.VIDEO_STATES }));
  const f = await form(page);
  assert.ok(f.hasHass);
  assert.deepEqual(f.names, ['entity', 'open_door_entity', 'language', 'video_max_height', 'open_door_action', 'service', 'entity_id']);
  assert.deepEqual(f.languages.sort(), ['ca', 'en', 'es', 'fr']);
  assert.equal(f.labels.entity, 'Entité caméra (requis)');
  assert.equal(f.labels.open_door_entity, "Entité d'ouverture de porte (optionnel)");
  assert.equal(f.expandable.title, 'Avancé : action personnalisée pour ouvrir la porte');
  assert.equal(f.expandable.expanded, false);
  assert.ok(f.helpers.video_max_height.includes('Echo Show'));
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('editor: changing a field emits config-changed; clearing it removes the key', async () => {
  const page = await openPage();
  await page.evaluate(() => window.mountEditor({ type: 'custom:ring-intercom-video-card', entity: 'camera.entree_intercom' }, { language: 'en', states: window.VIDEO_STATES }));
  await form(page);

  await fireFormChange(page, { type: 'custom:ring-intercom-video-card', entity: 'camera.entree_intercom', language: 'fr', open_door_entity: 'button.entree_open_door' });
  let last = await page.evaluate(() => window.__configChanged.at(-1));
  assert.deepEqual(last, { type: 'custom:ring-intercom-video-card', entity: 'camera.entree_intercom', language: 'fr', open_door_entity: 'button.entree_open_door' });
  // The editor itself switches to the chosen language.
  assert.equal((await form(page)).labels.entity, 'Entité caméra (requis)');

  await fireFormChange(page, { ...last, language: '', open_door_entity: undefined });
  last = await page.evaluate(() => window.__configChanged.at(-1));
  assert.deepEqual(last, { type: 'custom:ring-intercom-video-card', entity: 'camera.entree_intercom' });
  await page.close();
});

test('editor: advanced action keeps extra data and is dropped when emptied', async () => {
  const page = await openPage();
  const base = { type: 'custom:ring-intercom-video-card', entity: 'camera.entree_intercom' };
  await page.evaluate((b) => window.mountEditor({ ...b, open_door_action: { service: 'script.turn_on', entity_id: 'script.open', data: { delay: 2 } } }, { language: 'en', states: window.VIDEO_STATES }), base);
  const f = await form(page);
  assert.equal(f.expandable.expanded, true);

  await fireFormChange(page, { ...base, open_door_action: { service: '', entity_id: 'script.open', data: { delay: 2 } } });
  let last = await page.evaluate(() => window.__configChanged.at(-1));
  assert.deepEqual(last.open_door_action, { entity_id: 'script.open', data: { delay: 2 } });

  await fireFormChange(page, { ...base, open_door_action: { service: '', entity_id: '' } });
  last = await page.evaluate(() => window.__configChanged.at(-1));
  assert.deepEqual(last, base);
  await page.close();
});

test('editor migrates legacy keys (lock_entity, open_door)', async () => {
  const page = await openPage();
  await page.evaluate(() => window.mountEditor({ type: 'custom:ring-intercom-video-card', entity: 'camera.entree_intercom', lock_entity: 'lock.entree', open_door: { service: 'lock.unlock', entity_id: 'lock.entree' } }, { language: 'en', states: window.VIDEO_STATES }));
  const f = await form(page);
  assert.equal(f.data.open_door_entity, 'lock.entree');
  assert.deepEqual(f.data.open_door_action, { service: 'lock.unlock', entity_id: 'lock.entree' });
  assert.equal('lock_entity' in f.data, false);
  assert.equal('open_door' in f.data, false);
  await page.close();
});
