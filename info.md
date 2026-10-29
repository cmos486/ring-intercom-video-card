# Ring Intercom Video Card

Custom Lovelace card with **two-way audio + video** for Ring Intercom Video.

## Features

- 👀 Muted video preview without picking up (on screen, or only when someone rings)
- 📞 Pick up = instant two-way audio on the same WebRTC session
- 🎤 Push-to-talk floating on the video (hold, or tap to talk / tap to mute)
- 🛎️ Reacts to the doorbell: rings, highlights itself, starts the preview
- 🔓 Open door bubble (Ring's `button.*` opener, a `lock.*`, or any custom service), optional hold-to-open
- 🪟 Optional full-screen pop-up when picking up
- 🔁 Auto-reconnect, auto hang-up, deep link `?ring_intercom=answer` for phone notifications
- 🎨 Bubble Card look, follows your HA theme
- 🛠 Visual editor built on Home Assistant's native form
- 🌍 Multi-language UI (Spanish, English, Catalan, French) with auto-detection
- 🔌 Companion to the [ring-intercom-video](https://github.com/cmos486/ring-intercom-video) custom component

## Requirements

- HTTPS access to Home Assistant **for two-way audio** (browsers only grant microphone access in a secure context). Over plain HTTP the card still works, in listen-only mode
- The [ring-intercom-video](https://github.com/cmos486/ring-intercom-video) custom integration installed and working

See the README for full setup instructions, phone notifications, Browser Mod auto-popup integration, and YAML examples.