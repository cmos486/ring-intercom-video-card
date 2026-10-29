# 📞 Ring Intercom Video Card

[![HACS](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/cmos486/ring-intercom-video-card)](https://github.com/cmos486/ring-intercom-video-card/releases)

A Home Assistant custom Lovelace card with **two-way audio and video** for the Ring Intercom Video device (2024/2025 model with built-in camera).

This is the **frontend card**. It needs the companion backend custom integration to work — see [Dependencies](#-dependencies) below.

---

## ✨ Features

- 👀 **Muted video preview without picking up** — as soon as the card is on screen, or only when someone rings
- 📞 **Pick up = instant two-way audio** on the same WebRTC session (no reconnection, no renegotiation)
- 🎤 **Push-to-talk** floating on the video — hold to talk, or tap to talk / tap to mute
- 🛎️ **Reacts to the doorbell** (`ding_entity`): the card rings, highlights itself and can start the preview
- 🔓 **Open door** bubble (the Ring integration's `button.*` opener, a `lock.*`, or any custom service), with optional **hold-to-open** confirmation
- 🪟 **Optional full-screen pop-up** when picking up, without dropping the stream
- 🔁 **Auto-reconnect**, **auto hang-up** after inactivity, hang up when the app goes to background
- 📱 **Phone-friendly**: deep link `?ring_intercom=answer` for notifications, keeps the screen awake during a call
- 🎨 **Bubble Card look**, follows your HA theme and reuses Bubble Card theme variables when present
- 🛠 **Visual editor** built on Home Assistant's native form — no YAML needed
- 🌍 **Multi-language UI** with auto-detection: Spanish, English, Catalan, French
- 📐 **Optional `video_max_height`** to fit small screens like the Echo Show 5
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

Browsers require a **secure context** to access the microphone (`getUserMedia`). If you access HA over plain HTTP (`http://192.168.x.x:8123`), the microphone is unavailable and the card falls back to **listen only**: you get video and the visitor's voice, the push-to-talk button stays disabled, and the card says `Listen only: microphone needs HTTPS`.

So the card works over plain HTTP — you just can't talk back. For two-way audio you need any of:

- 🏠 Nabu Casa Home Assistant Cloud (HTTPS automatic)
- 🔐 A reverse proxy with Let's Encrypt (nginx, Caddy, Traefik, Nginx Proxy Manager...)
- 🔒 Native HA HTTPS with a valid certificate

### 📋 Other requirements

- 🏡 Home Assistant **2024.4** or newer
- 📦 A **Ring Intercom Handset Video** device (the 2024/2025 model with camera) paired in your Ring account
- 🌍 A modern browser (Chrome, Firefox, Safari, Edge — all current versions)

---

## 📥 Installation

### 🟢 Via HACS (recommended)

Step by step:

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
 RING-INTERCOM-VIDEO-CARD  v2.0.0
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
   - 📹 **Camera entity**: pick the `camera.*` created by the backend integration
   - 🏷️ **Name** (optional): defaults to the camera's friendly name
   - 🔓 **Open door entity** (optional): pick the entity that opens the door and the "Open door" button appears. With the **official Ring integration** that is the `button.*` **Open door** entity; with **ring-mqtt** it is the `lock.*`. A `script.*`, `switch.*`, `input_button.*`, `scene.*` or `cover.*` works too — the card calls the right service for that domain.
   - 🛎️ **Ding entity** (optional): the Ring `event.*` (device class `doorbell`) or `binary_sensor.*` that fires when someone rings. Auto-detected when there is exactly one
   - 🖥️ **Display**: automatic preview, pop-up on pick up, video area, language
   - 📞 **Call**: push-to-talk mode, auto hang-up, background behavior, reconnection, ringing duration
   - 🚪 **Door**: hold-to-open and its duration
   - ⚙️ **Advanced**: instead of a single entity, you can call any service when "Open door" is pressed
6. Click **Save**

---

## ⚙️ Configuration

The visual editor covers the typical cases, but here's the full schema for reference:

| Option | Type | Required | Description |
|---|---|---|---|
| `entity` | string | ✅ Yes | Camera entity from the backend integration (`camera.*`) |
| `open_door_entity` | string | ❌ No | Entity that opens the door. The service is derived from its domain (see table below). |
| `lock_entity` | string | ❌ No | **Deprecated**, kept working: old name for `open_door_entity`. |
| `open_door_action` | object | ❌ No | Advanced: custom service call for "Open door". Overrides `open_door_entity` if set. |
| `open_door_action.service` | string | — | Service to call (e.g. `script.turn_on`, `automation.trigger`). Optional: if omitted, it is derived from `entity_id`. |
| `open_door_action.entity_id` | string | — | Entity passed as `entity_id` to the service |
| `open_door_action.data` | object | — | Additional service data |
| `name` | string | ❌ No | Name shown in the card. Defaults to the camera's friendly name. |
| `icon` | string | ❌ No | Icon of the card. Default `mdi:doorbell-video`. |
| `ding_entity` | string | ❌ No | `event.*` or `binary_sensor.*` fired when someone rings. The card rings, highlights itself and (depending on `preview`) starts the video. |
| `language` | string | ❌ No | Force UI language: `es`, `en`, `ca`, `fr`. If omitted, follows Home Assistant's language. |
| `video_max_height` | string | ❌ No | Caps the video height with any CSS length (`px`, `vh`, `%`...). When set, the video uses `object-fit: contain` so it never deforms. If omitted, the video keeps its default size (no limit) — existing configs are unaffected. |
| `video_mode` | string | ❌ No | `always` (default) or `on_call`: the video area is hidden while nothing is streaming, the card shrinks to a single bubble. |
| `preview` | string | ❌ No | Muted video preview without picking up: `visible` (default, as soon as the card is on screen), `ring` (only when `ding_entity` fires) or `off` (video only after picking up). |
| `preview_timeout` | number | ❌ No | Seconds before an unattended preview stops. `0` = never. Default `60`. |
| `answer_mode` | string | ❌ No | `inline` (default) or `popup`: picking up opens a full-screen overlay. The live stream is kept, nothing reconnects. |
| `ptt_mode` | string | ❌ No | `hold` (default, hold to talk) or `toggle` (tap to talk, tap again to mute). |
| `auto_hangup` | number | ❌ No | Hang up after N seconds without talking or opening the door. `0` = never (default). A countdown is shown during the last 10 s. |
| `hangup_when_hidden` | boolean | ❌ No | Hang up when the tab / app goes to the background or the phone locks. Default `true`. |
| `auto_reconnect` | boolean | ❌ No | Retry up to 3 times (1 s, 2 s, 4 s) when the connection drops, keeping the call and the microphone. Default `true`. |
| `ring_timeout` | number | ❌ No | Seconds the card stays in "ringing" state after a ding. Default `30`. |
| `door_confirm` | boolean | ❌ No | `true` = press and hold the door bubble to open (prevents accidental unlocks). Default `false` (tap). |
| `door_hold_time` | number | ❌ No | Hold duration in ms when `door_confirm` is on. Default `1000`, minimum `300`. |
| `ice_servers` | string | ❌ No | `ha` (default): use the ICE servers configured in Home Assistant, like HA's own camera player. `none`: previous behavior, no STUN. |

### 🔓 Which service each entity gets

`open_door_entity` (and an `open_door_action` with no `service`) is resolved by domain:

| Entity domain | Service called | Typical source |
|---|---|---|
| `button.*` | `button.press` | **Official Ring integration** — `button.<device>_open_door` |
| `lock.*` | `lock.unlock` | **ring-mqtt** |
| `switch.*` | `switch.turn_on` | A relay / dry contact |
| `input_button.*` | `input_button.press` | Helper driving your own automation |
| `input_boolean.*` | `input_boolean.turn_on` | Helper driving your own automation |
| `script.*` | `script.turn_on` | Your own open-door sequence |
| `scene.*` | `scene.turn_on` | Your own open-door sequence |
| `cover.*` | `cover.open_cover` | A gate |

Anything else needs the **Advanced** mode with an explicit `service`.

### 📝 Example — Simple, official Ring integration

The Ring integration has no `lock` entity for intercoms: its opener is a **button**.

```yaml
type: custom:ring-intercom-video-card
entity: camera.entrada_principal_video_camera
open_door_entity: button.entrada_principal_open_door
```

### 📝 Example — Simple, ring-mqtt

```yaml
type: custom:ring-intercom-video-card
entity: camera.entrada_principal_video_camera
open_door_entity: lock.entrada_principal_video_lock
```

### 📝 Example — Advanced (custom service)

```yaml
type: custom:ring-intercom-video-card
entity: camera.entrada_principal_video_camera
open_door_action:
  service: script.turn_on
  entity_id: script.abrir_puerta
```

### 📝 Example — Phone / dashboard, everything on

```yaml
type: custom:ring-intercom-video-card
entity: camera.entrada_principal_video_camera
open_door_entity: button.entrada_principal_open_door
ding_entity: event.entrada_principal_video_ding
video_mode: on_call       # compact bubble while idle
preview: ring             # video starts by itself when someone rings
answer_mode: popup        # full screen when picking up
ptt_mode: toggle          # tap to talk / tap to mute
door_confirm: true        # hold to open
auto_hangup: 120
```

### 📝 Example — Wall panel

A wall panel that displays the card all day must **not** use `preview: visible`: the intercom has a single capture path, so a panel holding a preview open would leave every other device with a black picture.

```yaml
type: custom:ring-intercom-video-card
entity: camera.entrada_principal_video_camera
open_door_entity: button.entrada_principal_open_door
ding_entity: event.entrada_principal_video_ding
preview: ring
hangup_when_hidden: false
```

### 📝 Example — Forced language

```yaml
type: custom:ring-intercom-video-card
entity: camera.entrada_principal_video_camera
open_door_entity: button.entrada_principal_open_door
language: ca
```

### 📝 Example — Limit video height (small screens / Echo Show 5)

On small displays such as an **Echo Show 5** (480 px tall), the default `4:3` video can push the control buttons off-screen. Set `video_max_height` to cap the video so the buttons stay visible. The value accepts any CSS length and the video is letterboxed (`object-fit: contain`) so it never deforms:

```yaml
type: custom:ring-intercom-video-card
entity: camera.entrada_principal_video_camera
open_door_entity: button.entrada_principal_open_door
video_max_height: 230px   # or 50vh, etc.
```

Typical use inside a `browser_mod` popup triggered when the intercom rings:

```yaml
service: browser_mod.popup
data:
  title: Intercom
  size: fullscreen
  content:
    type: custom:ring-intercom-video-card
    entity: camera.entrada_principal_video_camera
    open_door_entity: button.entrada_principal_open_door
    video_max_height: 230px
```

> ℹ️ This option is fully optional and backward-compatible: if you don't set it, the card renders exactly as before.

### 📝 Example — No door button

If neither `open_door_entity` nor `open_door_action` is configured, the **Open door** button is automatically hidden. Useful if you only want video + audio.

```yaml
type: custom:ring-intercom-video-card
entity: camera.entrada_principal_video_camera
```

---

## 🌍 Internationalization

The card UI is available in:

| Code | Language |
|---|---|
| 🇪🇸 `es` | Español |
| 🇬🇧 `en` | English |
| 🇪🇸 `ca` | Català |
| 🇫🇷 `fr` | Français |

**Auto-detection**: by default, the card reads `hass.locale.language` (or `hass.language`) and picks the matching translation. If your HA is set to Spanish, the card shows Spanish. If it's set to Italian (not supported yet), it falls back to English.

**Manual override**: set the `language` option in the card config to force a specific language regardless of HA.

Want another language? PRs welcome — add a new block to the `TRANSLATIONS` constant in `ring-intercom-video-card.js`.

---

## 🎬 How to use it

The card has three states:

| State | What you get |
|---|---|
| **Idle** | A bubble with the name, the status and a green **Pick up** button. Tap the video area to start a preview manually. |
| **Preview** | Live video, **muted**, no microphone (`PREVIEW` badge). Starts by itself depending on `preview`. Close it with ✕. |
| **Call** | The visitor's voice is unmuted and your microphone is attached to the **same** session (`LIVE` badge). Push-to-talk floats on the video. |

1. 🛎️ Someone rings — with `ding_entity` set, the card shakes, says *Someone is ringing!* and starts the preview
2. 👀 Look at who is there without being heard
3. 👆 **Pick up** — two-way audio starts instantly (the browser asks for the microphone the first time)
4. 🗣️ **Hold** the push-to-talk pill to speak (or tap it with `ptt_mode: toggle`)
5. 🔓 Tap the **Open door** bubble (or hold it until it fills up with `door_confirm: true`)
6. 📵 **Hang up** — or let `auto_hangup` do it

### 💡 Tips

- The **microphone is muted by default** in a call — you have to hold the button to send audio. Release it as soon as you stop talking to avoid echo.
- The video element always **starts muted**: muted playback is allowed by every autoplay policy, including the Android app's WebView. It is unmuted when you pick up. If a browser refuses, you keep the picture and get a **"Tap to enable audio"** button.
- **One device at a time**: the intercom digitizes a single analog signal, so only one WebRTC session carries a picture. The card closes its preview when it goes off screen, when the app goes to the background and after `preview_timeout`, to leave the stream to other devices.
- If you **forget to hang up**, the indoor intercom handset may stay "occupied". `auto_hangup` and `hangup_when_hidden` are there for that.
- In the dashboard editor the card never opens a session.

---

## 📱 Phone notifications (even when locked)

The card understands a **deep link**: add `?ring_intercom=answer` (pick up directly) or `?ring_intercom=preview` to the URL of the view that contains it. Add `&entity=camera.xxx` if several intercom cards share the view. The parameter is removed from the URL once handled.

Combined with an actionable notification from the Companion app:

```yaml
alias: Intercom - doorbell notification
mode: single
triggers:
  - trigger: state
    entity_id: event.entrada_principal_video_ding
    not_from: [unavailable, unknown]
actions:
  - action: notify.mobile_app_your_phone
    data:
      title: 🔔 Someone is at the door
      message: Tap to look, or answer directly.
      data:
        tag: intercom-ding
        url: /dashboard-home/intercom?ring_intercom=preview          # iOS
        clickAction: /dashboard-home/intercom?ring_intercom=preview  # Android
        push:
          interruption-level: time-sensitive   # iOS: breaks through Focus
        ttl: 0
        priority: high                         # Android
        channel: Intercom
        importance: high
        actions:
          - action: URI
            title: 📞 Answer
            uri: /dashboard-home/intercom?ring_intercom=answer
```

While a preview or a call is running, the card asks the browser to **keep the screen awake** (Screen Wake Lock API, where supported), so the phone does not lock in the middle of a conversation. When the phone is unlocked again, the preview resumes on its own.

---

## 🪟 Auto-popup on incoming call (Browser Mod integration)

A common use case: when someone rings the intercom, **automatically show the card as a popup** on your wall panel / tablet without the user having to navigate to a specific dashboard.

This is achieved with the [browser_mod](https://github.com/thomasloven/hass-browser_mod) custom integration.

### 🧩 Requirements

- 📱 **Browser Mod** installed via HACS
- 🌐 The target device (tablet, wall panel...) needs to be registered as a browser in Browser Mod with a known `browser_id` (e.g. `wallpanel`)
- 🛎️ A trigger entity from your intercom — typically `event.<your_intercom>_timbre_de_la_puerta` or similar `binary_sensor.*_ding` from the Ring integration

### ⚙️ Setup steps

#### 1. Install Browser Mod from HACS

HACS → **Integrations** → search **Browser Mod** → Download → Restart HA → Settings → Devices & services → **Add integration** → Browser Mod.

#### 2. Register your device as a browser

On the target device (e.g. wall panel tablet):

1. Open HA in the app or browser
2. Navigate to **menu → Browser Mod** (or directly to `/browser-mod`)
3. Enter a recognizable name in **Browser ID** (e.g. `wallpanel`)
4. Activate ☑️ **Register**, ☑️ **Camera**, ☑️ **Microphone**
5. Save

#### 3. Create the popup automation

Use this automation as a starting point. Replace entity IDs with your own:

```yaml
alias: popup_intercom_llamada_wallpanel
description: >
  Shows the intercom card as a popup on the wall panel when the doorbell rings.
  Auto-closes after 60s of inactivity.
mode: restart
trigger:
  - platform: state
    entity_id: event.entrada_principal_video_timbre_de_la_puerta
action:
  - service: browser_mod.popup
    data:
      browser_id:
        - wallpanel
      title: Llamada en el portero
      content:
        type: custom:ring-intercom-video-card
        entity: camera.entrada_principal_video_camera
        open_door_entity: button.entrada_principal_open_door
      dismissable: true
      autoclose: false
      timeout: 60000
      style: "--popup-min-width: 480px; --popup-max-width: 520px;"
```

#### 4. Wake up the screen (optional but recommended)

If your tablet's screen is off when the doorbell rings, you'll want to wake it up first. The HA Companion app supports a command for this:

```yaml
alias: activar_pantalla_wallpanel_por_timbre
description: Wake up wallpanel screen when doorbell rings
trigger:
  - platform: state
    entity_id: event.entrada_principal_video_timbre_de_la_puerta
action:
  - service: notify.mobile_app_wallpanel
    data:
      message: command_screen_on
```

> Note: `notify.mobile_app_wallpanel` is created automatically when you install the HA Companion app on the tablet and name it `wallpanel`.

### 🎨 Customizing the popup

#### Centering / sizing

The `style:` field accepts CSS variables specific to Browser Mod:

```yaml
style: |
  --popup-min-width: 480px;
  --popup-max-width: 520px;
  --popup-border-radius: 16px;
```

#### Show only at certain hours

If you don't want the popup to appear at night:

```yaml
condition:
  - condition: time
    after: "06:00:00"
    before: "23:00:00"
```

#### Send notification to phone when no one's home

Combine the popup with a `notify.*` to your phone:

```yaml
action:
  - choose:
      - conditions:
          - condition: state
            entity_id: person.you
            state: home
        sequence:
          - service: browser_mod.popup
            data:
              browser_id:
                - wallpanel
              # ... (popup config above)
      - conditions:
          - condition: state
            entity_id: person.you
            state: not_home
        sequence:
          - service: notify.mobile_app_your_phone
            data:
              title: "🛎️ Doorbell"
              message: "Someone is at the door"
```

---

## 🔍 How it works (technical)

For the curious:

```
Browser  <──signaling via HA──>  Ring Cloud  <──media P2P──>  Ring Intercom
   │                                                                │
   └──────── audio + video over WebRTC (peer-to-peer) ──────────────┘
```

- The card builds an `RTCPeerConnection` with two transceivers: `audio: sendrecv` and `video: recvonly`. The audio sender starts **without a track** during a preview; picking up attaches the microphone with `RTCRtpSender.replaceTrack()`, so the preview becomes a call without any renegotiation
- ICE servers come from HA (`camera/webrtc/get_client_config`), exactly like HA's own camera player; if that call fails the card falls back to none
- It calls Home Assistant's standard `camera/webrtc/offer` WebSocket API
- The backend integration ([ring-intercom-video](https://github.com/cmos486/ring-intercom-video)) forwards the SDP offer to Ring's signaling servers
- ICE candidates are exchanged via `camera/webrtc/candidate`
- Once negotiated, **media flows peer-to-peer** (Ring may use TURN relays depending on NAT)
- No transcoding, no extra services, no `go2rtc`

This is the same WebRTC machinery the official HA Ring integration already uses for doorbell cameras — this card just adds the missing UI and the microphone track on top.

---

## 🧯 Troubleshooting

### ❓ Card says "Listen only" and push-to-talk stays disabled

The call is fine — the browser just won't hand over a microphone. The card tells you which case you're in:

| Message | Cause | Fix |
|---|---|---|
| `Listen only: microphone needs HTTPS` | HA served over plain HTTP, so it isn't a secure context | Switch to HTTPS (Nabu Casa, Let's Encrypt, etc.) |
| `Listen only: microphone permission denied` | You denied permission for this site | Click the lock/info icon in the address bar and reset site permissions |
| `Listen only: microphone unavailable` | No microphone on the device, or it's held by another app | Check your OS audio input settings |

During a listen-only call, pressing push-to-talk asks for the microphone again — that press is a user gesture, which some browsers require.

### ❓ Card goes straight to "Disconnected" when I tap Pick up

In **v1.2.0 and earlier** this meant "something failed and the reason was thrown away" — the card set the real error on the overlay and then immediately overwrote it during teardown. Since **v1.2.1** the message survives, so whatever the overlay now says *is* the cause. Update the card first, then read the overlay.

For the full picture, open the browser console (F12) and look for lines prefixed with `[ring-intercom-video-card]`.

### 📱 Android Companion app: `PC state: connected` but only a grey play button

Fixed in **v1.2.2**. The Home Assistant Android app is a WebView, and its `mediaPlaybackRequiresUserGesture` setting is on by default: it refuses to start **audible** media unless a user gesture is still in flight. By the time the microphone, the SDP exchange and ICE have finished, the tap on **Pick up** has long expired, so playback never started and the WebView drew its own grey play button over the dead video element. Desktop and mobile browsers don't hit this because they also allow playback on sites the user has already interacted with.

Since v1.2.2 the video element **starts muted** — muted video autoplay is allowed even in the WebView — and the card unmutes it as soon as the audio track arrives. If the WebView refuses the unmute, you keep the picture and get a **"Tap to enable audio"** button; the tap is the gesture it was waiting for.

You can also enable **Settings → Companion app → Autoplay videos** in the Android app, which turns that WebView restriction off globally (it affects Frigate and other WebRTC cards too — see [home-assistant/android#6578](https://github.com/home-assistant/android/issues/6578)).

### 🎥 Video shows but no audio reaches the door

- Check that the green button actually turns **red** while held
- Open DevTools (F12) → Console — you should see `[ring-intercom-video-card] Mic: ON` when pressing
- Make sure you're on HTTPS — some browsers silently mute mic on insecure contexts

### 🛎️ The card does not react when someone rings

- Check that `ding_entity` is set. Ring names it after your device and your language (e.g. `event.hall_sonnerie` in French): look for an `event.*` with device class `doorbell` on the Ring device
- Open that entity in **Developer Tools → States** and ring the intercom: its state (a timestamp) must change. If it does not, Home Assistant is not receiving the ding from Ring — this is upstream of the card
- To test the card alone, set a new timestamp on the entity from **Developer Tools → States**
- **Known issue with the official Ring integration**: its realtime ding events can silently stop after a while (the push connection drops), while unlock events keep working because they come from a periodic history check — see [home-assistant/core#157764](https://github.com/home-assistant/core/issues/157764) and [#131527](https://github.com/home-assistant/core/issues/131527). The integration's [realtime event stability steps](https://www.home-assistant.io/integrations/ring/) (clean up *Authorized Client Devices* in Ring's Control Center, then *Reconfigure*) often help, but not durably for everyone
- **Recommended**: install [Ring Intercom Plus](https://github.com/SH1FT-W/ring-intercom-plus) and use its `binary_sensor.<intercom>_ding` as `ding_entity`. It follows the official realtime event when it works and falls back on the regular activity check (about a minute late) when it doesn't, so a ring is never missed. It also raises a repair issue when realtime events look dead
### ❌ `Reconnecting… (3/3)` then `Disconnected`

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

- If using `open_door_entity`: make sure the service for its domain (`button.press`, `lock.unlock`…) works manually on that entity (Developer Tools → Actions)
- If using `open_door_action`: check the service exists and works standalone
- Look at HA logs around the time you pressed the button

### 🪟 Browser_mod popup doesn't appear

- Verify `sensor.<browser_id>_browser_id` state is the expected name (not `unavailable`)
- If you changed the HA URL (e.g. HTTP → HTTPS), Browser Mod loses the registration. Re-register on the device after changing URLs
- Make sure the target browser is active and visible (`sensor.<browser_id>_browser_visibility` should be `visible` for the popup to render). If the screen is off, send `command_screen_on` first

### 🌍 Card shows in English when my HA is in another language

- If the language code is unsupported, the card falls back to English. Supported: `es`, `en`, `ca`, `fr`. PRs welcome to add more
- You can force a language by setting `language: es` (or `en`, `ca`, `fr`) in the card config

---

## 🤝 Contributing

Pull requests and issues welcome! When reporting a bug please include:

- 🏡 Home Assistant version
- 🌐 Browser and version
- 🖥️ Console logs from the card (search for `[ring-intercom-video-card]`)
- 🎟️ A description of what you expected vs. what happened

To add a new language, edit `ring-intercom-video-card.js` and add a new key to the `TRANSLATIONS` constant. All keys must match the existing ones — see `en` for the canonical reference.

---

## 🙏 Credits

- 📦 Built on top of [python-ring-doorbell](https://github.com/python-ring-doorbell/python-ring-doorbell) and the [HA Ring integration](https://www.home-assistant.io/integrations/ring/)
- 🤝 Companion to [ring-intercom-video](https://github.com/cmos486/ring-intercom-video) by the same author
- 🪟 Auto-popup feature uses [browser_mod](https://github.com/thomasloven/hass-browser_mod) by [@thomasloven](https://github.com/thomasloven)

---

## 📜 License

[Apache License 2.0](LICENSE)

Copyright © 2026 Kilian Ubeda Cano
