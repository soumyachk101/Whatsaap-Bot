/**
 * Plugin Manager - Core plugin lifecycle management
 *
 * Provides: loadPlugin, unloadPlugin, reloadPlugin, listPlugins, getPlugin
 * Lifecycle hooks: onLoad, onEnable, onDisable, onUnload
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import pluginRegistry from "./pluginRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory where plugin files live (e.g. commands/ subdirs, skills/)
const PLUGIN_DIRS = [
	path.join(__dirname, "..", "commands", "public"),
	path.join(__dirname, "..", "commands", "group", "members"),
	path.join(__dirname, "..", "commands", "group", "admins"),
	path.join(__dirname, "..", "commands", "owner"),
	path.join(__dirname, "..", "commands", "direct"),
	path.join(__dirname, "..", "skills"),
];

const LOG_DIR = path.join(__dirname, "..", "logs");
const PLUGIN_ERROR_LOG = path.join(LOG_DIR, "plugin-errors.log");

/** @type {Map<string, {path:string, enabled:boolean, module:any, metadata:object}>} */
const plugins = new Map();

/** @type {Set<string>} plugins that errored during load */
const errorRegistry = new Set();

let pluginLogStream = null;

function ensureLogDir() {
 if (!fs.existsSync(LOG_DIR)) {
 fs.mkdirSync(LOG_DIR, { recursive: true });
 }
}

function getLogStream() {
 ensureLogDir();
 if (!pluginLogStream) {
 pluginLogStream = fs.createWriteStream(PLUGIN_ERROR_LOG, { flags: "a" });
 }
 return pluginLogStream;
}

function logPluginError(pluginName, error) {
 const ts = new Date().toISOString();
 const msg = `[${ts}] [${pluginName}] ${error.message}\n${error.stack || ""}\n`;
 try {
 getLogStream().write(msg);
 } catch {
 console.error(`[Plugin Error Log] ${msg}`);
 }
}

/**
 * Read a plugin module from disk and return its exported factory.
 * @param {string} filePath
 * @returns {{ factory: Function|null, error: Error|null }}
 */
async function loadModule(filePath) {
 const fileUrl = pathToFileURL(filePath).href;
 try {
 const module = await import(fileUrl);
 const factory = module.default;
 if (typeof factory !== "function") {
 return { factory: null, error: new Error("Plugin does not export a default function") };
 }
 return { factory, error: null };
 } catch (err) {
 return { factory: null, error: err };
 }
}

/**
 * Determine the scope for a plugin based on its directory.
 */
function detectScope(dirPath) {
 const normalized = path.normalize(dirPath).replace(/\\/g, "/");
 if (normalized.includes("/commands/public") || normalized.includes("/commands\\public")) return "public";
 if (normalized.includes("/commands/group/members") || normalized.includes("/commands\\group\\members")) return "members";
 if (normalized.includes("/commands/group/admins") || normalized.includes("/commands\\group\\admins")) return "admins";
 if (normalized.includes("/commands/owner") || normalized.includes("/commands\\owner")) return "owner";
 if (normalized.includes("/commands/direct") || normalized.includes("/commands\\direct")) return "direct";
 if (normalized.includes("/skills")) return "skill";
 return "public";
}

/**
 * Load a plugin from a given file path.
 * @param {string} filePath
 * @returns {{ success: boolean, pluginName?: string, error?: string }}
 */
export async function loadPlugin(filePath) {
 const absPath = path.resolve(filePath);
 if (!fs.existsSync(absPath)) {
 return { success: false, error: `File not found: ${absPath}` };
 }

 const { factory, error } = await loadModule(absPath);
 if (error) {
 logPluginError(path.basename(absPath), error);
 return { success: false, error: error.message };
 }

 let pluginDef;
 try {
 pluginDef = factory();
 } catch (err) {
 logPluginError(path.basename(absPath), err);
 return { success: false, error: `Factory threw: ${err.message}` };
 }

 if (!pluginDef || typeof pluginDef !== "object") {
 return { success: false, error: "Plugin factory returned non-object" };
 }

 const pluginName = pluginDef.cmd?.[0] || path.basename(absPath, ".js");
 const scope = pluginDef.scope || detectScope(path.dirname(absPath));
 const metadata = {
 name: pluginName,
 scope,
 version: pluginDef.version || "1.0.0",
 author: pluginDef.author || "unknown",
 description: pluginDef.description || "",
 dependencies: pluginDef.dependencies || [],
 path: absPath,
 dir: path.dirname(absPath),
 loadedAt: Date.now(),
 enabled: true,
 };

 // Run onLoad hook
 if (typeof pluginDef.onLoad === "function") {
 try {
 await pluginDef.onLoad({ registry: pluginRegistry });
 } catch (err) {
 logPluginError(pluginName, err);
 console.warn(`⚠️ Plugin ${pluginName} onLoad hook failed:`, err.message);
 }
 }

 plugins.set(pluginName, {
 path: absPath,
 enabled: true,
 module: pluginDef,
 metadata,
 });

 // Register with plugin registry
 try {
 pluginRegistry.register({
 name: pluginName,
 cmd: pluginDef.cmd || [],
 desc: pluginDef.desc || "",
 usage: pluginDef.usage || "",
 scope,
 handler: pluginDef.handler,
 metadata,
 });
 } catch (err) {
 console.warn(`⚠️ Plugin ${pluginName} registration conflict:`, err.message);
 }

 console.log(`✅ Plugin loaded: ${pluginName} (${scope})`);
 return { success: true, pluginName };
}

/**
 * Unload a plugin by name.
 * @param {string} name
 * @returns {{ success: boolean, error?: string }}
 */
export async function unloadPlugin(name) {
 const plugin = plugins.get(name);
 if (!plugin) {
 return { success: false, error: `Plugin "${name}" not found` };
 }

 // Run onUnload hook
 if (plugin.module.onUnload) {
 try {
 await plugin.module.onUnload({ registry: pluginRegistry });
 } catch (err) {
 logPluginError(name, err);
 console.warn(`⚠️ Plugin ${name} onUnload hook failed:`, err.message);
 }
 }

 pluginRegistry.unregister(name);
 plugins.delete(name);
 errorRegistry.delete(name);

 console.log(`🔌 Plugin unloaded: ${name}`);
 return { success: true };
}

/**
 * Hot-reload a plugin: unload then reload from same path.
 * @param {string} name
 * @returns {{ success: boolean, pluginName?: string, error?: string }}
 */
export async function reloadPlugin(name) {
 const plugin = plugins.get(name);
 if (!plugin) {
 return { success: false, error: `Plugin "${name}" not found` };
 }

 // Run onDisable hook
 if (plugin.module.onDisable) {
 try {
 await plugin.module.onDisable({ registry: pluginRegistry });
 } catch (err) {
 logPluginError(name, err);
 }
 }

 const filePath = plugin.path;

 // Unregister and remove
 pluginRegistry.unregister(name);
 plugins.delete(name);
 errorRegistry.delete(name);

 // Clear require cache for the file so dynamic import gets fresh code
 try {
 const filesInCache = Object.keys(require.cache || {});
 for (const cached of filesInCache) {
 if (cached === filePath || cached.endsWith(path.basename(filePath))) {
 delete require.cache[cached];
 }
 }
 } catch {
 // ignore cache clearing errors
 }

 console.log(`🔄 Reloading plugin: ${name}`);
 return await loadPlugin(filePath);
}

/**
 * List all loaded plugins.
 * @returns {Array<{name:string, scope:string, enabled:boolean, metadata:object}>}
 */
export function listPlugins() {
 const result = [];
 for (const [name, plugin] of plugins) {
 result.push({
 name,
 scope: plugin.metadata.scope,
 enabled: plugin.enabled,
 metadata: plugin.metadata,
 hasError: errorRegistry.has(name),
 });
 }
 return result;
}

/**
 * Get a plugin by name.
 * @param {string} name
 * @returns {object|undefined}
 */
export function getPlugin(name) {
 return plugins.get(name) || undefined;
}

/**
 * Mark a plugin as enabled or disabled without unregistering.
 * @param {string} name
 * @param {boolean} enabled
 * @returns {{ success: boolean, error?: string }}
 */
export async function setPluginEnabled(name, enabled) {
 const plugin = plugins.get(name);
 if (!plugin) {
 return { success: false, error: `Plugin "${name}" not found` };
 }

 if (plugin.enabled === enabled) {
 return { success: true };
 }

 plugin.enabled = enabled;
 plugin.metadata.enabled = enabled;

 if (enabled) {
 if (typeof plugin.module.onEnable === "function") {
 try {
 await plugin.module.onEnable({ registry: pluginRegistry });
 } catch (err) {
 logPluginError(name, err);
 }
 }
 console.log(`✅ Plugin enabled: ${name}`);
 } else {
 if (typeof plugin.module.onDisable === "function") {
 try {
 await plugin.module.onDisable({ registry: pluginRegistry });
 } catch (err) {
 logPluginError(name, err);
 }
 }
 console.log(`⏸️ Plugin disabled: ${name}`);
 }

 return { success: true };
}

/**
 * Scan plugin directories and load all plugins.
 * @param {string[]} [dirs]
 * @returns {{ loaded: number, failed: number, plugins: string[] }}
 */
export async function scanAndLoad(dirs) {
 const directories = dirs || PLUGIN_DIRS;
 const loaded = [];
 let failed = 0;

 for (const dir of directories) {
 if (!fs.existsSync(dir)) continue;
 try {
 const files = fs.readdirSync(dir);
 for (const file of files) {
 if (!file.endsWith(".js")) continue;
 const fullPath = path.join(dir, file);
 const result = await loadPlugin(fullPath);
 if (result.success) {
 loaded.push(result.pluginName);
 } else {
 failed++;
 console.warn(`⚠️ Failed to load plugin ${file}: ${result.error}`);
 }
 }
 } catch (err) {
 console.error(`❌ Error scanning directory ${dir}:`, err.message);
 }
 }

 return { loaded: loaded.length, failed, plugins: loaded };
}

/**
 * Get the plugin error log file path.
 */
export function getPluginLogPath() {
 return PLUGIN_ERROR_LOG;
}

/**
 * Clear the plugin error registry for a given plugin.
 */
export function clearPluginError(name) {
 errorRegistry.delete(name);
}

export default {
 loadPlugin,
 unloadPlugin,
 reloadPlugin,
 listPlugins,
 getPlugin,
 setPluginEnabled,
 scanAndLoad,
 clearPluginError,
 getPluginLogPath,
};
