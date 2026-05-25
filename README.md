# 📞 Ring Intercom Video Card

[![HACS](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/cmos486/ring-intercom-video-card)](https://github.com/cmos486/ring-intercom-video-card/releases)

A Home Assistant custom Lovelace card with **two-way audio and video** for the Ring Intercom Video device (2024/2025 model with built-in camera).

This is the **frontend card**. It needs the companion backend custom integration to work — see [Dependencies](#-dependencies) below.

---

## ✨ Features

- 📹 **Live video** stream from the intercom (native WebRTC, no transcoding)
- 🎤 **Two-way audio** with push-to-talk button
- 🔓 **Open door** button (uses Ring's native `lock.unlock` or any custom service)
- 📵 **Hang up** button (clean session teardown, releases mic and camera)
- 🛠 **Visual editor** with entity pickers — no YAML needed
- 🔌 Pure browser-side WebRTC, no `go2rtc`, no extra add-ons, no transcoding server
- 🌐 Works on desktop and mobile browsers (with HTTPS)

---

## 🧩 Dependencies

This card is **only the user interface**. For it to actually work, you also need:

### ⚙️ Backend integration (REQUIRED)

👉 **[ring-intercom-video](https://github.com/cmos486/ring-intercom-video)** custom integration.

This integration is what creates the `camera.*` entity for your Ring Intercom Video and handles the WebRTC signaling between Home Assistant and Ring's servers. **Without it the card has nothing to connect to**.

Install the backend integration first, verify it created a `camera.*` entity for your intercom, and only then install this card.

### 🌐 HTTPS access to Home Assistant

Browsers require a **secure context** to access the microphone (`getUserMedia`). If you access HA over plain HTTP (`http://192.168.x.x:8123`), the microphone will not work and you'll get a one-way audio at best.

You need any of:
- 🏠 Nabu Casa Home Assistant Cloud (HTTPS automatic)
- 🔐 A reverse proxy with Let's Encrypt (nginx, Caddy, Traefik...)
- 🔒 Some equivalent HTTPS solution

### 📋 Other requirements

- 🏡 Home Assistant **2024.4** or newer
- 📦 A **Ring Intercom Handset Video** device (the 2024/2025 model with camera) paired in your Ring account
- 🌍 A modern browser (Chrome, Firefox, Safari, Edge — all current versions)

---

## 📥 Installation

### 🟢 Via HACS (recommended)

Step by step, with screenshots-equivalent instructions:

#### 1️⃣ Make sure HACS is installed

If you don't have HACS, install it first following the [official HACS docs](https://hacs.xyz/docs/setup/download/). Then come back here.

#### 2️⃣ Install the backend integration

Before this card, you need [ring-intercom-video](https://github.com/cmos486/ring-intercom-video) installed:

1. In HACS → **Integrations** → click ⋮ (top right) → **Custom repositories**
2. Add:
   - Repository: `https://github.com/cmos486/ring-intercom-video`
   - Type: `Integration`
3. Install **Ring Intercom Video Camera**
4. **Restart Home Assistant**
5. Verify: a `camera.*` entity has appeared for your intercom (look in Settings → Devices & Services → Ring)

If this step doesn't produce a camera entity, fix that first — the card will not work without it.

#### 3️⃣ Install this card via HACS

1. In HACS → **Frontend** → click ⋮ (top right) → **Custom repositories**
2. Add:
   - Repository: `https://github.com/cmos486/ring-intercom-video-card`
   - Type: `Lovelace`
3. Find **Ring Intercom Video Card** in the list and click **Download**
4. HACS will register the JavaScript resource automatically
5. **Hard refresh** your browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS)
6. ✅ Done

To confirm it loaded, open the browser console (F12) — you should see a blue banner like:

```
 RING-INTERCOM-VIDEO-CARD  v1.0.0
```

### 🔧 Manual installation (alternative)

If you prefer not to use HACS:

1. Download `ring-intercom-video-card.js` from the latest [release](https://github.com/cmos486/ring-intercom-video-card/releases)
2. Copy it to `/config/www/ring-intercom-video-card.js` on your HA instance
3. Go to **Settings → Dashboards → ⋮ → Resources** and add:
   - URL: `/local/ring-intercom-video-card.js`
   - Resource type: `JavaScript Module`
4. Hard refresh your browser

---

## ➕ Adding the card to a dashboard

1. Open the dashboard where you want the card
2. Click **✏️ Edit dashboard** (pencil icon, top right)
3. Click **➕ Add Card**
4. Search for **Ring Intercom Video Card** in the picker
5. The **visual editor** will open:
   - 📹 **Camera entity**: pick the `camera.*` created by the backend integration. The picker auto-suggests intercom cameras.
   - 🔓 **Lock entity** (optional): pick the `lock.*` provided by the Ring integration to enable the "Open door" button.
   - ⚙️ **Advanced** (toggle): instead of a simple lock, you can call any service (script, automation, switch...) when "Open door" is pressed.
6. Click **Save**

---

## ⚙️ Configuration

The visual editor covers the typical cases, but here's the full schema for reference:

| Option | Type | Required | Description |
|---|---|---|---|
| `entity` | string | ✅ Yes | Camera entity from the backend integration (`camera.*`) |
| `lock_entity` | string | ❌ No | Lock entity used for the "Open door" button. Calls `lock.unlock`. |
| `open_door_action` | object | ❌ No | Advanced: custom service call for "Open door". Overrides `lock_entity` if set. |
| `open_door_action.service` | string | — | Service to call (e.g. `script.turn_on`, `automation.trigger`) |
| `open_door_action.entity_id` | string | — | Entity passed as `entity_id` to the service |
| `open_door_action.data` | object | — | Additional service data |

### 📝 Example — Simple (just lock)

```yaml
type: custom:ring-intercom-video-card
entity: camera.entrada_principal_video_camera
lock_entity: lock.entrada_principal_video
```

### 📝 Example — Advanced (custom service)

```yaml
type: custom:ring-intercom-video-card
entity: camera.entrada_principal_video_camera
open_door_action:
  service: script.turn_on
  entity_id: script.abrir_puerta
```

### 📝 Example — No door button

If neither `lock_entity` nor `open_door_action` is configured, the **Open door** button is automatically hidden. Useful if you only want video + audio.

```yaml
type: custom:ring-intercom-video-card
entity: camera.entrada_principal_video_camera
```

---

## 🎬 How to use it

When someone rings the intercom or you just want to check the door:

1. 🛎️ Intercom rings (or you decide to peek)
2. 👆 Click **📞 Conectar** in the card
3. 🎤 Browser asks for microphone permission → **Allow** (first time only)
4. ⏳ Wait a second or two — you'll see `PC state: connected` in the overlay
5. 📺 Live video appears, the green **PULSAR PARA HABLAR** button activates
6. 🗣️ **Hold** the green button to speak through the intercom
7. 🔓 Click **Abrir puerta** to unlock the door
8. 📵 Click **Colgar** when you're done to release the session

### 💡 Tips

- The **microphone is muted by default** — you have to hold the button to send audio. Release it as soon as you stop talking to avoid echo.
- The **audio from the door is always heard** while connected — you don't need to press anything to hear them.
- If you **forget to hang up**, the indoor intercom handset may stay "occupied" and not work normally. Always click **📵 Colgar** when you finish.
- The card uses **native browser WebRTC** — latency is typically under 300ms.

---

## 🔍 How it works (technical)

For the curious:

```
Browser  <──signaling via HA──>  Ring Cloud  <──media P2P──>  Ring Intercom
   │                                                                │
   └──────── audio + video over WebRTC (peer-to-peer) ──────────────┘
```

- The card builds an `RTCPeerConnection` with two transceivers: `audio: sendrecv` and `video: recvonly`
- It calls Home Assistant's standard `camera/webrtc/offer` WebSocket API
- The backend integration ([ring-intercom-video](https://github.com/cmos486/ring-intercom-video)) forwards the SDP offer to Ring's signaling servers
- ICE candidates are exchanged via `camera/webrtc/candidate`
- Once negotiated, **media flows peer-to-peer** (Ring may use TURN relays depending on NAT)
- No transcoding, no extra services, no `go2rtc`

This is the same WebRTC machinery the official HA Ring integration already uses for doorbell cameras — this card just adds the missing UI and the microphone track on top.

---

## 🧯 Troubleshooting

### ❓ "Pidiendo microfono..." hangs or fails

The browser is rejecting the microphone request:

- 🔒 You're accessing HA over **plain HTTP**. Switch to HTTPS (Nabu Casa, Let's Encrypt, etc.)
- 🚫 You denied permission previously. Click the lock/info icon in the address bar and reset site permissions
- 🎙️ No microphone available on your device

### 🎥 Video shows but no audio reaches the door

- Check that the green button actually turns **red** while held
- Open DevTools (F12) → Console — you should see `[ring-intercom-video-card] Mic: ON` when pressing
- Make sure you're on HTTPS — some browsers silently mute mic on insecure contexts

### ❌ `PC state: failed` right after connecting

Usually a network/NAT issue:

- Check that your client can reach Ring's WebRTC endpoints
- Look at ICE candidate errors in DevTools console
- Try from a different network (e.g. mobile data) to isolate

### 📷 Camera entity not appearing in the editor dropdown

- Verify [ring-intercom-video](https://github.com/cmos486/ring-intercom-video) is installed and Ring discovered the device
- Restart Home Assistant after installing the backend
- Check Settings → Devices & Services → Ring — your intercom should be listed

### 🔄 The card says "Loaded v0.x.x" — old version

You're caching an old copy:

- Hard refresh: `Ctrl+Shift+R` (Win/Linux) or `Cmd+Shift+R` (macOS)
- Clear the Lovelace resource cache by toggling its URL with a `?v=X` query param
- In HACS, re-download the card if needed

### 🛎️ "Open door" doesn't actually unlock

- If using `lock_entity`: make sure `lock.unlock` works manually on that entity (Developer Tools → Services)
- If using `open_door_action`: check the service exists and works standalone
- Look at HA logs around the time you pressed the button

---

## 🤝 Contributing

Pull requests and issues welcome! When reporting a bug please include:

- 🏡 Home Assistant version
- 🌐 Browser and version
- 🖥️ Console logs from the card (search for `[ring-intercom-video-card]`)
- 🎟️ A description of what you expected vs. what happened

---

## 🙏 Credits

- 📦 Built on top of [python-ring-doorbell](https://github.com/python-ring-doorbell/python-ring-doorbell) and the [HA Ring integration](https://www.home-assistant.io/integrations/ring/)
- 🤝 Companion to [ring-intercom-video](https://github.com/cmos486/ring-intercom-video) by the same author

---

## 📜 License

[Apache License 2.0](LICENSE)

Copyright © 2026 Kilian Ubeda Cano
