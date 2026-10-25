<p align="center">
  <img src="resources/icon.svg" width="128" alt="Clumsee logo" />
</p>

<h1 align="center">Clumsee</h1>

<p align="center">
  Select an area of your screen, then ask AI about it, copy its text, scan a QR code, or search Google.<br />
  A desktop app for macOS, Windows, and Linux.
</p>

---

## Features

- **Capture a screen area with a hotkey.** Press `Cmd/Ctrl + Shift + X`, the screen lights up with a glow in your theme color, then drag to select an area.
- **Ask AI about that area.** Supports Gemini, Claude, and OpenAI. The answer appears in a floating sidebar on the right of the screen, you can ask follow-up questions, and *smart mode* switches to a stronger model.
- **Select and copy text from the screen.** Text in the selected area is read with local OCR (Tesseract), so you can highlight it with the mouse and copy it with `Cmd/Ctrl + C`. It is fast, offline, and uses no tokens.
- **Search Google.** The highlighted text, or all text in the area, opens straight away as a Google search.
- **Scan QR codes and barcodes.** If it contains a link, click to open it in your browser. Otherwise, you can copy its content.
- **No AI mode.** Use Clumsee only for OCR, QR/barcode scanning, and Google search. No API key needed.
- **Math and code rendering.** LaTeX formulas are rendered neatly with KaTeX, and code blocks get syntax highlighting plus a Copy button.
- **Theme color per provider.** By default Gemini is blue, Claude is orange, and OpenAI is green. You can change them in Settings.
- **English or Indonesian.** Switch the interface and the answer language in Settings.
- **History and usage.** Conversations are saved and searchable. Token and cost usage is tracked, with optional daily limits in tokens or USD.

## Privacy

- Images are **only sent to AI after you press Send**, and only to the provider you chose.
- OCR, QR scanning, and Google search run **on your computer**. Images are not sent anywhere.
- API keys are stored encrypted with the system keychain (Keychain, DPAPI, or libsecret).
- The capture window and sidebar are hidden from screenshots and screen sharing.
- History thumbnails can be turned off in Settings.

## Download

Get the latest version from the **[Releases](https://github.com/adamwahyuh/clumsee/releases/latest)** page.

| System | File |
| --- | --- |
| macOS (Apple Silicon) | `Clumsee_<version>_arm64.dmg` |
| macOS (Intel) | `Clumsee_<version>_x64.dmg` |
| Windows | `Clumsee_<version>.exe` |
| Linux | `Clumsee_<version>.AppImage` or `Clumsee_<version>.deb` |

> **Note:** Clumsee is not code-signed yet.
> On macOS, open it the first time with *right-click → Open*. On Windows, choose *More info → Run anyway* if SmartScreen appears.
> For the AppImage, make the file executable first (`chmod +x`).

## Getting started

1. Install and open Clumsee. A setup guide appears: choose an AI provider (or *No AI*), enter your API key, then set your hotkey.
2. Clumsee runs in the tray or menu bar. Press `Cmd/Ctrl + Shift + X` any time to start a capture.
3. On macOS, grant **Screen Recording** permission in *System Settings → Privacy & Security → Screen Recording*, then restart Clumsee.

### API keys

| Provider | Get a key at |
| --- | --- |
| Gemini | https://aistudio.google.com/apikey |
| Claude | https://platform.claude.com/settings/keys |
| OpenAI | https://platform.openai.com/api-keys |

## Built with

Electron · React · TypeScript · Tailwind CSS · electron-vite · Tesseract.js · jsQR · KaTeX · highlight.js

## Author

Adam Hariyadi ([adamdesign19@gmail.com](mailto:adamdesign19@gmail.com))

## License

Clumsee is open source software under the [MIT License](LICENSE).
