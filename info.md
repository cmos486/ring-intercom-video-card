# Ring Intercom Video Card

Custom Lovelace card with **two-way audio + video** for Ring Intercom Video.

## Features

- 📹 Live video stream via native WebRTC
- 🎤 Two-way audio with push-to-talk
- 🔓 Open door button (Ring's `button.*` opener, a `lock.*`, or any custom service)
- 📵 Hang up button
- 🛠 Visual editor with entity pickers
- 🌍 Multi-language UI (Spanish, English, Catalan) with auto-detection
- ☎️ Audio-only intercom support (experimental)
- 🔌 Companion to the [ring-intercom-video](https://github.com/cmos486/ring-intercom-video) custom component

## ☎️ Audio-only intercom (experimental)

Ring's camera-less intercom handset (`device_kind: intercom_handset_audio`) is supported: **two-way audio only, no video and no snapshots by design**. The card detects it from the entity's `audio_only` attribute and switches automatically — nothing to configure, and push-to-talk, open door and hang up all work as usual.

This requires the **`intercom-handset-audio` branch** of the backend integration, which is what exposes the `audio_only` attribute. It has **not yet been verified end-to-end against real audio-handset hardware**, so treat it as experimental. Video intercoms are unaffected either way.

## Requirements

- HTTPS access to Home Assistant **for two-way audio** (browsers only grant microphone access in a secure context). Over plain HTTP the card still works, in listen-only mode
- The [ring-intercom-video](https://github.com/cmos486/ring-intercom-video) custom integration installed and working (audio-only intercoms need its `intercom-handset-audio` branch)

See the README for full setup instructions, Browser Mod auto-popup integration, and YAML examples.
