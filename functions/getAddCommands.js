import fs from "fs";
import util from "util";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import pluginRegistry from "./pluginRegistry.js";
import pluginManager, { scanAndLoad as scanPlugins } from "./pluginManager.js";

const readdir = util.promisify(fs.readdir);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainPath = path.join(__dirname, "../commands/");

// ── Traditional command maps (preserved as fallback) ──────────────────────
let commandsPublic = {};
let commandsMembers = {};
let commandsAdmins = {};
let commandsOwners = {};

let adminCommandsList = [];
let publicCommandsList = [];
let groupCommandsList = [];
let ownerCommandsList = [];
let directCommandsList = [];

const loadCommands = async (dirPath, commandsObj, cmdDetails) => {
 let filenames = await readdir(dirPath);
 for (const file of filenames) {
 if (file.endsWith(".js")) {
 try {
 const filePath = path.join(dirPath, file);
 const fileUrl = pathToFileURL(filePath).href;
 const module = await import(fileUrl);

 const commandFunc = module.default;
 if (!commandFunc || typeof commandFunc !== "function") {
 console.warn(`Warning: ${file} does not export a function`);
 continue;
 }

 const cmd_info = commandFunc();

 if (!cmd_info) {
 console.warn(`Warning: ${file} function returned null/undefined`);
 continue;
 }
 if (!cmd_info.cmd || !Array.isArray(cmd_info.cmd)) {
 console.warn(`Warning: ${file} has invalid cmd array:`, cmd_info.cmd);
 continue;
 }
 if (!cmd_info.handler || typeof cmd_info.handler !== "function") {
 console.warn(`Warning: ${file} has invalid handler`);
 continue;
 }

 const cmdLower = cmd_info.cmd.map((c) => c.toLowerCase());
 cmdDetails.push({ cmd: cmdLower, desc: cmd_info.desc, usage: cmd_info.usage });
 for (let c of cmdLower) {
 if (commandsObj[c]) {
 console.warn(`Warning: Duplicate command alias '${c}' found in ${file}. Overwriting previous registration.`);
 }
 commandsObj[c] = cmd_info.handler;
 }
 } catch (error) {
 console.error(`Error loading ${file}:`, error.message);
 }
 }
 }
};

/**
 * Register all loaded traditional commands with the plugin registry.
 * This bridges the existing system with the new plugin system.
 */
const registerWithPluginRegistry = () => {
 const registerGroup = (scope, commandsObj, cmdList) => {
 for (const [alias, handler] of Object.entries(commandsObj)) {
 const pluginName = `builtin-${scope}-${alias}`;
 try {
 pluginRegistry.register({
 name: pluginName,
 cmd: [alias],
 desc: cmdList.find((c) => c.cmd.includes(alias))?.desc || "",
 usage: cmdList.find((c) => c.cmd.includes(alias))?.usage || alias,
 scope,
 handler,
 metadata: {
 isBuiltin: true,
 scope,
 alias,
 path: "builtin",
 loadedAt: Date.now(),
 },
 });
 } catch (err) {
 console.warn(`Plugin registry registration conflict for ${alias}:`, err.message);
 }
 }
 };

 registerGroup("public", commandsPublic, publicCommandsList);
 registerGroup("members", commandsMembers, groupCommandsList);
 registerGroup("admins", commandsAdmins, adminCommandsList);
 registerGroup("owner", commandsOwners, ownerCommandsList);
 if (directCommandsList.length > 0) {
 registerGroup("direct", commandsPublic, directCommandsList);
 }
};

/**
 * Re-scan commands directory and reload all commands.
 * Also re-registers with plugin registry.
 */
export async function reloadCommands() {
 // Clear existing
 commandsPublic = {};
 commandsMembers = {};
 commandsAdmins = {};
 commandsOwners = {};

 adminCommandsList = [];
 publicCommandsList = [];
 groupCommandsList = [];
 ownerCommandsList = [];
 directCommandsList = [];

 // Clear plugin registry
 pluginRegistry.clear();

 // Re-load traditionally
 console.log("Re-scanning commands directory...");
 await loadCommands(mainPath + "public/", commandsPublic, publicCommandsList);
 directCommandsList = [...publicCommandsList];
 console.log(`Reloaded ${Object.keys(commandsPublic).length} public commands`);
 await loadCommands(mainPath + "group/members/", commandsMembers, groupCommandsList);
 console.log(`Reloaded ${Object.keys(commandsMembers).length} member commands`);
 await loadCommands(mainPath + "group/admins/", commandsAdmins, adminCommandsList);
 console.log(`Reloaded ${Object.keys(commandsAdmins).length} admin commands`);
 await loadCommands(mainPath + "owner/", commandsOwners, ownerCommandsList);
 console.log(`Reloaded ${Object.keys(commandsOwners).length} owner commands`);

 // Re-register with plugin registry
 registerWithPluginRegistry();

 // Also scan for plugins
 try {
 await scanPlugins();
 } catch (err) {
 console.warn("Plugin scan failed during reload:", err.message);
 }

 console.log("Command reload complete!");
}

const addCommands = async () => {
 console.log("Loading commands...");
 await loadCommands(mainPath + "public/", commandsPublic, publicCommandsList);
 directCommandsList = [...publicCommandsList];
 console.log(`Loaded ${Object.keys(commandsPublic).length} public commands`);
 await loadCommands(mainPath + "group/members/", commandsMembers, groupCommandsList);
 console.log(`Loaded ${Object.keys(commandsMembers).length} member commands`);
 await loadCommands(mainPath + "group/admins/", commandsAdmins, adminCommandsList);
 console.log(`Loaded ${Object.keys(commandsAdmins).length} admin commands`);
 await loadCommands(mainPath + "owner/", commandsOwners, ownerCommandsList);
 console.log(`Loaded ${Object.keys(commandsOwners).length} owner commands`);

 // Register built-in commands with plugin registry
 registerWithPluginRegistry();

 // Scan plugin directories
 try {
 await scanPlugins();
 } catch (err) {
 console.warn("Plugin scan failed:", err.message);
 }

 console.log("All commands loaded!");
};

// Store command loading promise
const commandLoadPromise = addCommands();
const commandsReady = () => commandLoadPromise;

const cmdToText = async () => {
 await commandLoadPromise;
 return {
 publicCommands: publicCommandsList,
 groupCommands: groupCommandsList,
 adminCommands: adminCommandsList,
 ownerCommands: ownerCommandsList,
 directCommands: directCommandsList,
 };
};

/**
 * Look up a command handler via the plugin registry first, then fall back to built-in maps.
 * @param {string} alias
 * @param {string} scope - "public" | "members" | "admins" | "owner"
 * @returns {{handler: Function, pluginName: string, scope: string}|null}
 */
export function pluginCommandLookup(alias, scope) {
 const lower = alias.toLowerCase();
 const registryEntry = pluginRegistry.resolve(lower);
 if (registryEntry) {
 return {
 handler: registryEntry.handler,
 pluginName: registryEntry.pluginName,
 scope: registryEntry.scope,
 };
 }

 // Fallback to built-in command maps
 const scopeMap = {
 public: commandsPublic,
 members: commandsMembers,
 admins: commandsAdmins,
 owner: commandsOwners,
 };
 const builtin = scopeMap[scope]?.[lower];
 if (builtin) {
 return {
 handler: builtin,
 pluginName: `builtin-${scope}-${lower}`,
 scope,
 };
 }

 return null;
}

export {
 commandsPublic,
 commandsMembers,
 commandsAdmins,
 commandsOwners,
 cmdToText,
 commandsReady,
};
