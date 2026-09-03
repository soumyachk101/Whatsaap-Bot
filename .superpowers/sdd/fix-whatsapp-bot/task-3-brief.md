# Task 3: Add Plugin/Skill System for Dynamic Extension Loading

## Context
This is Task 3 of 3 for the WhatsApp bot fix project. The bot currently loads all commands at startup with no way to add/remove functionality dynamically. We need a plugin system that supports hot-reload, command isolation, and integration with the /superpowers skill system.

## Requirements

### 3.1 Create Plugin Manager Module
Create `functions/pluginManager.js` that:
- Loads command files from `commands/` directories dynamically (hot-reload support)
- Supports enabling/disabling plugins without restart
- Tracks plugin metadata: name, version, author, dependencies, enabled state
- Provides plugin lifecycle hooks: `onLoad`, `onEnable`, `onDisable`, `onUnload`
- Exposes API: `loadPlugin(path)`, `unloadPlugin(name)`, `reloadPlugin(name)`, `listPlugins()`, `getPlugin(name)`

### 3.2 Create Plugin Registry
Create `functions/pluginRegistry.js` that:
- Maintains a registry of all loaded plugins with their command mappings
- Maps command aliases to their source plugin
- Supports scoped commands: global, group-only, admin-only, owner-only
- Provides conflict detection when two plugins register the same command alias
- Exposes: `register(plugin)`, `unregister(name)`, `resolve(command)`, `listConflicts()`

### 3.3 Add Skill Loader Integration
Create `functions/skillLoader.js` that:
- Scans for skill definition files (`skill.json` or `skill.yaml`) in a `skills/` directory
- Loads skill configurations (name, description, commands, permissions)
- Bridges skills to the plugin system — each skill becomes a plugin
- Supports the /superpowers format for skill metadata
- Validates skill structure before loading

### 3.4 Add Admin Plugin Management Commands
Create `commands/owner/pluginManager.js` with commands:
- `#plugin list` — List all plugins with status
- `#plugin enable <name>` — Enable a plugin
- `#plugin disable <name>` — Disable a plugin
- `#plugin reload <name>` — Hot-reload a plugin
- `#plugin info <name>` — Show plugin details
- `#skill list` — List available skills
- `#skill load <name>` — Load a skill as a plugin
- `#skill unload <name>` — Unload a skill

### 3.5 Wire Plugin System into Bot Core
Modify `functions/getAddCommands.js` to:
- Use pluginRegistry instead of direct command object registration
- Support lazy loading of plugins (only load when first command is used)
- Track plugin load errors without crashing the bot
- Add a `#reload` command that re-scans the commands directory

### 3.6 Add Plugin Isolation
Each plugin should:
- Run in its own error boundary (crashes don't affect other plugins)
- Have access to a sandboxed API (sendMessage, getUserData, etc.)
- Support rate limiting per-plugin
- Log plugin-specific errors to a separate log file

## Acceptance Criteria
- Bot can load/unload/reload plugins at runtime without restart
- No command conflicts between plugins (detected and reported)
- Skill files can be dropped into a `skills/` directory and auto-discovered
- Plugin crashes don't bring down the bot
- Admin can manage plugins via WhatsApp commands

## Files to Create
- `functions/pluginManager.js`
- `functions/pluginRegistry.js`
- `functions/skillLoader.js`
- `commands/owner/pluginManager.js`
- `skills/example-skill.json` (example skill definition)

## Files to Modify
- `functions/getAddCommands.js`
- `functions/getMessagesEvent.js` (use pluginRegistry for command dispatch)

## Report
Write your report to `.superpowers/sdd/fix-whatsapp-bot/task-3-report.md`.
Report format: status (DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED), commits made, test summary, concerns.
