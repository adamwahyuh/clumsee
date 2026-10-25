<p align="center">
  <img src="resources/icon.svg" width="128" alt="Logo Clumsee" />
</p>

<h1 align="center">Clumsee</h1>

<p align="center">
  Pilih area layar, lalu tanya AI, salin teksnya, scan QR, atau cari di Google.<br />
  Aplikasi desktop untuk macOS, Windows, dan Linux.
</p>

---

## Fitur

- **Capture area layar dengan hotkey.** Tekan `Cmd/Ctrl + Shift + X`, layar menyala dengan glow warna tema, lalu seret untuk memilih area.
- **Tanya AI tentang area itu.** Mendukung Gemini, Claude, dan OpenAI. Jawaban muncul di sidebar melayang di kanan layar, bisa ditanya lanjutan, dan ada *mode pintar* untuk model yang lebih kuat.
- **Blok dan salin teks dari layar.** Teks di area pilihan dibaca dengan OCR lokal (Tesseract), lalu bisa diblok dengan mouse dan dicopy pakai `Cmd/Ctrl + C`. Prosesnya cepat, offline, dan tanpa token.
- **Cari di Google.** Teks yang diblok, atau semua teks di area, langsung dibuka sebagai pencarian Google.
- **Scan QR code dan barcode.** Kalau isinya link, klik untuk membuka di browser. Kalau bukan link, isinya bisa dicopy.
- **Mode Tanpa AI.** Pakai Clumsee hanya untuk OCR, scan QR/barcode, dan pencarian Google. Tidak perlu API key.
- **Tampilan rumus dan kode.** Rumus LaTeX ditampilkan rapi dengan KaTeX, dan blok kode diberi warna sintaks plus tombol Copy.
- **Warna tema per provider.** Defaultnya Gemini biru, Claude oranye, dan OpenAI hijau. Bisa diganti di Settings.
- **Riwayat dan pemakaian.** Percakapan tersimpan dan bisa dicari. Ada catatan token dan biaya, serta batas harian token atau USD.

## Privasi

- Gambar **hanya dikirim ke AI setelah kamu menekan Send**, dan hanya ke provider yang kamu pilih.
- OCR, scan QR, dan pencarian Google berjalan **di komputer kamu**. Gambar tidak dikirim ke mana pun.
- API key disimpan terenkripsi lewat keychain sistem (Keychain, DPAPI, atau libsecret).
- Jendela capture dan sidebar disembunyikan dari screenshot dan screen share.
- Thumbnail di riwayat bisa dimatikan di Settings.

## Download

Unduh versi terbaru di halaman **[Releases](https://github.com/adamwahyuh/clumsee/releases/latest)**.

| Sistem | File |
| --- | --- |
| macOS (Apple Silicon) | `Clumsee_<versi>_arm64.dmg` |
| macOS (Intel) | `Clumsee_<versi>_x64.dmg` |
| Windows | `Clumsee_<versi>.exe` |
| Linux | `Clumsee_<versi>.AppImage` atau `Clumsee_<versi>.deb` |

> **Catatan:** Clumsee belum ditandatangani secara digital.
> Di macOS, buka pertama kali dengan *klik kanan → Open*. Di Windows, pilih *More info → Run anyway* jika SmartScreen muncul.
> Untuk AppImage, jadikan file bisa dijalankan dulu (`chmod +x`).

## Memulai

1. Install dan buka Clumsee. Langkah setup akan muncul: pilih provider AI (atau *Tanpa AI*), isi API key, lalu atur hotkey.
2. Clumsee berjalan di tray atau menu bar. Tekan `Cmd/Ctrl + Shift + X` kapan saja untuk mulai capture.
3. Di macOS, berikan izin **Screen Recording** lewat *System Settings → Privacy & Security → Screen Recording*, lalu restart Clumsee.

### API key

| Provider | Ambil key di |
| --- | --- |
| Gemini | https://aistudio.google.com/apikey |
| Claude | https://platform.claude.com/settings/keys |
| OpenAI | https://platform.openai.com/api-keys |

## Dibangun dengan

Electron · React · TypeScript · Tailwind CSS · electron-vite · Tesseract.js · jsQR · KaTeX · highlight.js

## Pembuat

Adam Hariyadi ([adamdesign19@gmail.com](mailto:adamdesign19@gmail.com))

## Lisensi

Clumsee adalah perangkat lunak open source di bawah [Lisensi MIT](LICENSE).
