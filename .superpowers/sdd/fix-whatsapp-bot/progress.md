# SDD ledger — plan: fix-whatsapp-bot

## Setup
BASE: 2132e5d1cc2d23669bce954de07f755e265f5b87

## Conflict Scan
| Task pair | Shared resource | Finding |
|---|---|---|
| Task 1 ↔ Task 3 | getMessagesEvent.js, getAddCommands.js | Task 1 fixes getMessagesEvent error handling; Task 3 replaces command dispatch with pluginRegistry. Ruling: Task 3 should integrate Task 1's fixes. No conflict — Task 3 uses modified getMessagesEvent. |
| Task 1 ↔ Task 2 | download.js, getMessagesEvent.js | No shared changes — Task 1 touches response pipeline, Task 2 touches media pipeline. Clean. |
| Task 2 ↔ Task 3 | getAddCommands.js | Task 2 doesn't touch command loading. Clean. |
| Task 1 self-check | messageQueue.js | Concurrency model change is self-consistent. Clean. |
| Task 2 self-check | cobaltHelper.js | yt-dlp check, reel handling, buffer fallback all in same file. Clean. |
| Task 3 self-check | pluginManager.js, pluginRegistry.js, skillLoader.js | New files, no self-contradiction. Clean. |

Scan result: clean with one integration note. No blocking conflicts.

## Task Progress
- Task 1: complete (commits 2132e5d..0081e99) — under review
- Task 2: complete (commits 2132e5d..4af53e1) — under review
- Task 3: complete (commits 2132e5d..f48a84d) — under review
- Security fix: owner-only guard added to #plugin and #skill commands (c7a3fa0)