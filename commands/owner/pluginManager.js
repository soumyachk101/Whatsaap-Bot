/**
 * Owner Plugin & Skill Management Commands
 *
 * Commands:
 * #plugin list — List all plugins with status
 * #plugin enable — Enable a plugin
 * #plugin disable — Disable a plugin
 * #plugin reload — Hot-reload a plugin
 * #plugin info — Show plugin details
 * #reload — Re-scan the commands directory
 * #skill list — List available skills
 * #skill load — Load a skill as a plugin
 * #skill unload — Unload a skill
 */

import pluginManager, {
 listPlugins as pmListPlugins,
 getPlugin as pmGetPlugin,
 setPluginEnabled,
 reloadPlugin,
 loadPlugin,
 scanAndLoad,
 getPluginLogPath,
} from "../../functions/pluginManager.js";
import skillLoader, {
 scanSkills,
 loadSkillAsPlugin,
 unloadSkill,
 getSkills,
 getSkill,
} from "../../functions/skillLoader.js";

/**
 * Format a plugin for display.
 */
function formatPlugin(p) {
 const status = p.enabled ? "✅ Active" : "⏸️ Disabled";
 const errorTag = p.hasError ? " ❌(error)" : "";
 return `${status}${errorTag} | ${p.name} (${p.scope}) | v${p.metadata.version || "?"}`;
}

/**
 * Get a scoped reply based on command scope.
 */
function scopedReply(sendMessageWTyping, from, msg, text) {
 return sendMessageWTyping(from, { text }, { quoted: msg });
}

const handler = async (sock, msg, from, args, msgInfoObj) => {
 const { sendMessageWTyping, command, isOwner } = msgInfoObj;

 try {
 // ── #plugin list ─────────────────────────────────────────────────────────
 if (command === "plugin") {
 if (!isOwner) {
 return scopedReply(sendMessageWTyping, from, msg, "🚫 Only the owner can use #plugin commands.");
 }
 if (args.length === 0 || args[0] === "list") {
 const plugins = pmListPlugins();
 if (plugins.length === 0) {
 return scopedReply(sendMessageWTyping, from, msg, "📭 No plugins loaded yet.");
 }

 const lines = plugins.map((p) => `• ${formatPlugin(p)}`).join("\n");
 const header = `📦 *Plugin Registry* (${plugins.length})\n━━━━━━━━━━━━━━━━━━━━\n`;
 return scopedReply(sendMessageWTyping, from, msg, header + lines);
 }

 // ── #plugin info ─────────────────────────────────────────────────────────
 if (args[0] === "info") {
 const name = (args[1] || "").trim();
 if (!name) {
 return scopedReply(sendMessageWTyping, from, msg, "Usage: #plugin info <name>");
 }
 const plugin = pmGetPlugin(name);
 if (!plugin) {
 return scopedReply(sendMessageWTyping, from, msg, `❌ Plugin "${name}" not found.`);
 }

 const m = plugin.metadata;
 const info = [
 `📋 *Plugin: ${m.name}*`,
 `Scope: ${m.scope}`,
 `Version: ${m.version || "?"}`,
 `Author: ${m.author || "?"}`,
 `Enabled: ${plugin.enabled ? "Yes" : "No"}`,
 `Path: ${m.path}`,
 `Loaded: ${new Date(m.loadedAt).toISOString()}`,
 `Description: ${m.description || "(none)"}`,
 `Dependencies: ${m.dependencies?.length ? m.dependencies.join(", ") : "(none)"}`,
 ].join("\n");
 return scopedReply(sendMessageWTyping, from, msg, info);
 }

 // ── #plugin enable ───────────────────────────────────────────────────────
 if (args[0] === "enable") {
 const name = (args[1] || "").trim();
 if (!name) {
 return scopedReply(sendMessageWTyping, from, msg, "Usage: #plugin enable <name>");
 }
 const result = await setPluginEnabled(name, true);
 if (!result.success) {
 return scopedReply(sendMessageWTyping, from, msg, `❌ ${result.error}`);
 }
 return scopedReply(sendMessageWTyping, from, msg, `✅ Plugin "${name}" enabled.`);
 }

 // ── #plugin disable ──────────────────────────────────────────────────────
 if (args[0] === "disable") {
 const name = (args[1] || "").trim();
 if (!name) {
 return scopedReply(sendMessageWTyping, from, msg, "Usage: #plugin disable <name>");
 }
 const result = await setPluginEnabled(name, false);
 if (!result.success) {
 return scopedReply(sendMessageWTyping, from, msg, `❌ ${result.error}`);
 }
 return scopedReply(sendMessageWTyping, from, msg, `⏸️ Plugin "${name}" disabled.`);
 }

 // ── #plugin reload ───────────────────────────────────────────────────────
 if (args[0] === "reload") {
 const name = (args[1] || "").trim();
 if (!name) {
 return scopedReply(sendMessageWTyping, from, msg, "Usage: #plugin reload <name>");
 }
 const result = await reloadPlugin(name);
 if (!result.success) {
 return scopedReply(sendMessageWTyping, from, msg, `❌ ${result.error}`);
 }
 return scopedReply(sendMessageWTyping, from, msg, `🔄 Plugin "${name}" reloaded successfully.`);
 }

 return scopedReply(sendMessageWTyping, from, msg,
 `Usage:
 #plugin list — List all plugins
 #plugin info <name> — Plugin details
 #plugin enable <name> — Enable plugin
 #plugin disable <name> — Disable plugin
 #plugin reload <name> — Hot-reload plugin`
 );
 }

 // ── #reload (re-scan commands directory) ─────────────────────────────────
 if (command === "reload") {
 if (!isOwner) {
 return scopedReply(sendMessageWTyping, from, msg, "🚫 Only the owner can use #reload.");
 }
 const result = await scanAndLoad();
 const msgText = `🔄 *Command Directory Rescan*\n` +
 `Loaded: ${result.loaded} plugin(s)\n` +
 `Failed: ${result.failed} plugin(s)`;
 return scopedReply(sendMessageWTyping, from, msg, msgText);
 }

 // ── #skill list ──────────────────────────────────────────────────────────
 if (command === "skill") {
 if (!isOwner) {
 return scopedReply(sendMessageWTyping, from, msg, "🚫 Only the owner can use #skill commands.");
 }
 if (args.length === 0 || args[0] === "list") {
 let skills = getSkills();

 // Also show loaded skills from plugin manager
 const loadedPlugins = pmListPlugins().filter((p) => p.metadata?.isSkill);
 if (loadedPlugins.length > 0) {
 for (const p of loadedPlugins) {
 const existing = skills.find((s) => s.name === p.metadata?.skillName);
 if (!existing) {
 skills.push({
 name: p.name,
 description: p.metadata?.description || "(loaded as plugin)",
 scope: p.scope,
 });
 }
 }
 }

 if (skills.length === 0) {
 return scopedReply(sendMessageWTyping, from, msg, "📭 No skills found in skills/ directory.");
 }

 const lines = skills.map((s) => `• *${s.name}* (${s.scope || "?"}): ${s.description || "(no description)"}`).join("\n");
 const header = `🎯 *Skills* (${skills.length})\n━━━━━━━━━━━━━━━━━━━━\n`;
 return scopedReply(sendMessageWTyping, from, msg, header + lines);
 }

 // ── #skill load ──────────────────────────────────────────────────────────
 if (args[0] === "load") {
 const skillName = (args[1] || "").trim();
 if (!skillName) {
 return scopedReply(sendMessageWTyping, from, msg, "Usage: #skill load <name>");
 }

 const skill = getSkill(skillName);
 if (!skill) {
 return scopedReply(sendMessageWTyping, from, msg, `❌ Skill "${skillName}" not found. Run #skill list to see available skills.`);
 }

 const result = await loadSkillAsPlugin(skillName, pluginManager);
 if (!result.success) {
 return scopedReply(sendMessageWTyping, from, msg, `❌ Failed to load skill: ${result.error}`);
 }
 return scopedReply(sendMessageWTyping, from, msg, `✅ Skill "${skillName}" loaded as plugin.`);
 }

 // ── #skill unload ────────────────────────────────────────────────────────
 if (args[0] === "unload") {
 const skillName = (args[1] || "").trim();
 if (!skillName) {
 return scopedReply(sendMessageWTyping, from, msg, "Usage: #skill unload <name>");
 }

 const skill = getSkill(skillName);
 if (!skill) {
 return scopedReply(sendMessageWTyping, from, msg, `❌ Skill "${skillName}" not found.`);
 }

 const result = await unloadSkill(skillName, pluginManager);
 if (!result.success) {
 return scopedReply(sendMessageWTyping, from, msg, `❌ ${result.error}`);
 }
 return scopedReply(sendMessageWTyping, from, msg, `🗑️ Skill "${skillName}" unloaded.`);
 }

 return scopedReply(sendMessageWTyping, from, msg,
 `Usage:
 #skill list — List available skills
 #skill load <name> — Load a skill as a plugin
 #skill unload <name> — Unload a skill`
 );
 }
} catch (error) {
 console.error("❌ Plugin manager command error:", error);
 return scopedReply(
 sendMessageWTyping,
 from,
 msg,
 `❌ *Plugin Manager Error:*\n_${error.message}_`
 );
};
};

export default () => ({
 cmd: ["plugin", "reload", "skill"],
 desc: "Manage plugins and skills dynamically",
 usage: "plugin list | plugin info <name> | plugin enable <name> | plugin disable <name> | plugin reload <name> | reload | skill list | skill load <name> | skill unload <name>",
 handler,
});
