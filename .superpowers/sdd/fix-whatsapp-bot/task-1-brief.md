# Task 1: Fix Bot Response Pipeline

## Context
This is Task 1 of 3 for the WhatsApp bot fix project. The bot is not responding properly to messages — commands silently fail or delay, and error recovery is weak.

## Requirements

### 1.1 Fix Command Execution Reliability
In `functions/getMessagesEvent.js`, the `getCommand` function's error handling has a flaw: the catch block at line 613-620 tries to send an error message but references `from` and `msg` which may be undefined in the outer scope if the error occurred before they were assigned. Fix the error handling to use the correct variables from the message context.

### 1.2 Fix Message Queue Starvation
In `functions/messageQueue.js`, the `processQueue` function has a `maxConcurrent` of 25 but `activeSends` tracking is not per-chat, so one busy chat can starve all others. Fix the concurrency model to limit sends per-chat to 5, while allowing 25 total concurrent sends across all chats.

### 1.3 Fix Group Metadata Timeout Blocking
In `functions/getMessagesEvent.js` lines 226-246, when group metadata is not cached, the fetch blocks command execution with a 5000ms timeout. Move this to a non-blocking background fetch, and add a fallback minimal metadata object so commands never block on group lookups.

### 1.4 Add Command Response Timeout Watchdog
Add a response timeout watchdog in `functions/getMessagesEvent.js` that sends a fallback error message if a command handler takes more than 30 seconds to respond. Log the slow command name for debugging.

### 1.5 Fix Chatbot Double-Reply Pattern
In `commands/public/chatbot.js` lines 434-474 and 567-572, the chatbot sends a response inside the handler AND the outer command dispatcher may also process the same message. Ensure the chatbot command properly returns after handling to prevent double-processing.

## Acceptance Criteria
- All commands respond within 5 seconds for text commands
- No silent failures — error messages always reach the user
- Message queue processes messages fairly across chats
- Group metadata fetch never blocks command execution
- No double-replies from chatbot commands

## Files to Modify
- `functions/getMessagesEvent.js`
- `functions/messageQueue.js`
- `commands/public/chatbot.js`
- `commands/public/aimodes.js` (same double-reply issue)

## Report
Write your report to `.superpowers/sdd/fix-whatsapp-bot/task-1-report.md`.
Report format: status (DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED), commits made, test summary, concerns.
