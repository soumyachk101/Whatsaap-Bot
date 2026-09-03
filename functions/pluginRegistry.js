/**
 * Plugin Registry - Central command mapping and conflict detection
 *
 * Maintains a registry of all loaded plugins with their command mappings.
 * Maps command aliases to their source plugin.
 * Supports scoped commands: global, group-only, admin-only, owner-only.
 * Detects conflicts when two plugins register the same command alias.
 */

class PluginRegistry {
 constructor() {
 /** @type {Map<string, {pluginName:string, scope:string, handler:Function}>} */
 this.commands = new Map();

 /** @type {Map<string, object>} - pluginName -> plugin metadata */
 this.plugins = new Map();

 /** @type {Array<{alias:string, existing:string, incoming:string}>} */
 this.conflicts = [];
 }

 /**
 * Register a plugin and its commands.
 * @param {{name:string, cmd:string[], desc:string, usage:string, scope:string, handler:Function, metadata:object}}
 */
 register({ name, cmd, desc, usage, scope, handler, metadata }) {
 if (this.plugins.has(name)) {
 console.warn(`⚠️ Plugin "${name}" is already registered. Re-registering.`);
 }

 this.plugins.set(name, {
 name,
 cmd,
 desc,
 usage,
 scope,
 handler,
 metadata: metadata || {},
 loadedAt: Date.now(),
 });

 for (const alias of cmd) {
 const lower = alias.toLowerCase();
 if (this.commands.has(lower)) {
 const existing = this.commands.get(lower);
 if (existing.pluginName !== name) {
 this.conflicts.push({
 alias: lower,
 existing: existing.pluginName,
 incoming: name,
 });
 console.warn(`⚠️ Command conflict: "${lower}" registered by "${existing.pluginName}" and "${name}". "${existing.pluginName}" wins.`);
 }
 }
 // Always register (last writer wins, but conflict is recorded)
 this.commands.set(lower, { pluginName: name, scope, handler });
 }
 }

 /**
 * Unregister a plugin and remove its commands.
 * @param {string} name
 */
 unregister(name) {
 const plugin = this.plugins.get(name);
 if (!plugin) return;

 for (const alias of plugin.cmd) {
 const lower = alias.toLowerCase();
 const current = this.commands.get(lower);
 if (current && current.pluginName === name) {
 this.commands.delete(lower);
 }
 }

 this.plugins.delete(name);

 // Remove related conflicts
 this.conflicts = this.conflicts.filter(
 (c) => c.existing !== name && c.incoming !== name
 );
 }

 /**
 * Resolve a command alias to its handler.
 * @param {string} alias
 * @returns {{pluginName:string, scope:string, handler:Function}|null}
 */
 resolve(alias) {
 const entry = this.commands.get(alias.toLowerCase());
 return entry || null;
 }

 /**
 * Check if a command exists in the registry.
 * @param {string} alias
 * @returns {boolean}
 */
 has(alias) {
 return this.commands.has(alias.toLowerCase());
 }

 /**
 * List all registered command aliases grouped by scope.
 * @returns {{global:string[], public:string[], members:string[], admins:string[], owner:string[], direct:string[]}}
 */
 listByScope() {
 const result = {
 global: [],
 public: [],
 members: [],
 admins: [],
 owner: [],
 direct: [],
 };

 for (const [alias, entry] of this.commands) {
 const scope = entry.scope || "public";
 if (scope === "public") {
 result.public.push(alias);
 } else if (result[scope]) {
 result[scope].push(alias);
 } else {
 result.public.push(alias);
 }
 }

 return result;
 }

 /**
 * List all registered plugins.
 * @returns {Array<object>}
 */
 listPlugins() {
 return Array.from(this.plugins.values()).map((p) => ({
 name: p.name,
 scope: p.scope,
 cmdCount: p.cmd.length,
 commands: p.cmd,
 desc: p.desc,
 usage: p.usage,
 loadedAt: p.loadedAt,
 }));
 }

 /**
 * Get a plugin by name.
 * @param {string} name
 * @returns {object|undefined}
 */
 getPlugin(name) {
 return this.plugins.get(name);
 }

 /**
 * List all command conflicts.
 * @returns {Array<{alias:string, existing:string, incoming:string}>}
 */
 listConflicts() {
 return [...this.conflicts];
 }

 /**
 * Check if a plugin is registered.
 * @param {string} name
 * @returns {boolean}
 */
 hasPlugin(name) {
 return this.plugins.has(name);
 }

 /**
 * Get all command aliases.
 * @returns {string[]}
 */
 getAliases() {
 return Array.from(this.commands.keys());
 }

 /**
 * Clear the entire registry (for testing / full reload).
 */
 clear() {
 this.commands.clear();
 this.plugins.clear();
 this.conflicts = [];
 }

 /**
 * Get stats about the registry.
 */
 getStats() {
 return {
 totalPlugins: this.plugins.size,
 totalCommands: this.commands.size,
 totalConflicts: this.conflicts.length,
 scopes: this.listByScope(),
 };
 }
}

// Singleton instance
const pluginRegistry = new PluginRegistry();

export default pluginRegistry;
export { PluginRegistry };
