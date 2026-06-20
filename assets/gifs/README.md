# `assets/gifs/`

This folder holds short **screen recordings** that show off the bot in action.
Each gif is referenced from the main `README.md`.

| File | What it shows |
|------|---------------|
| `dashboard-login.gif` | Logging into the React admin panel at `/admin` |
| `pairing-code.gif` | Linking the bot via 8-character pairing code (no QR scan) |
| `song-download.gif` | Sending `-song shape of you` in a chat and getting the MP3 back |
| `antilink-toggle.gif` | Admin toggling anti-link from the dashboard |
| `group-activation.gif` | Activating the bot in a group from the Groups page |

## Recording tips

- 720p, ≤ 8 s, ≤ 3 MB per file (GitHub renders larger ones slowly).
- Capture with macOS `Cmd+Shift+5`, Windows `Xbox Game Bar`, or `peek` on Linux.
- Convert with: `ffmpeg -i input.mov -vf "fps=15,scale=720:-1" -loop 0 output.gif`
- Name the file exactly as referenced in `README.md` to keep links working.

The SVGs in `assets/diagrams/` are the **vector source** for the workflow
animations and are already linked from the README. Replace the gifs here any
time — the README will pick them up automatically.
