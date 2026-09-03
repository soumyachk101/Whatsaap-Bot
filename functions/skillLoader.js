/**
 * Skill Loader - Scans skills/ directory and bridges skills to the plugin system
 *
 * - Scans for skill.json / skill.yaml files in the skills/ directory
 * - Validates skill structure before loading
 * - Bridges each skill to the plugin system via pluginManager
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SKILLS_DIR = path.join(__dirname, "..", "skills");

/** @type {Map<string, object>} - skillName -> skill definition */
const skills = new Map();

/** @type {Set<string>} - skills that failed validation or load */
const errors = new Set();

/**
 * Validate a skill definition object.
 * @param {object} skill
 * @param {string} sourceFile
 * @returns {{valid:boolean, errors:string[]}}
 */
function validateSkill(skill, sourceFile) {
 const errs = [];
 if (!skill || typeof skill !== "object") {
 errs.push("Skill definition must be a JSON object");
 return { valid: false, errors: errs };
 }

 if (!skill.name || typeof skill.name !== "string") {
 errs.push("Skill must have a 'name' (string)");
 }
 if (skill.name && skill.name.length > 100) {
 errs.push("Skill name must be 100 characters or less");
 }

 if (!skill.description || typeof skill.description !== "string") {
 errs.push(`Skill "${skill.name || "unnamed"}" must have a 'description' (string)`);
 }

 if (skill.commands && !Array.isArray(skill.commands)) {
 errs.push("Skill 'commands' must be an array of strings");
 }

 if (skill.scope && !["public", "members", "admins", "owner", "direct", "global"].includes(skill.scope)) {
 errs.push(`Skill 'scope' must be one of: public, members, admins, owner, direct, global (got: ${skill.scope})`);
 }

 if (skill.dependencies && !Array.isArray(skill.dependencies)) {
 errs.push("Skill 'dependencies' must be an array of strings");
 }

 // Each entry in commands array must have required fields if it's an object
 if (Array.isArray(skill.commands)) {
 for (const cmd of skill.commands) {
 if (typeof cmd === "string") continue;
 if (typeof cmd === "object" && cmd !== null) {
 if (!cmd.name || typeof cmd.name !== "string") {
 errs.push("Each command entry must have a 'name' (string)");
 }
 if (!cmd.handler || typeof cmd.handler !== "function") {
 errs.push(`Command "${cmd.name || "unnamed"}" must have a 'handler' function`);
 }
 } else {
 errs.push("Commands array must contain strings or command objects");
 }
 }
 }

 return { valid: errs.length === 0, errors: errs };
}

/**
 * Convert a skill definition into a plugin-compatible object.
 * @param {object} skill
 * @param {string} sourcePath
 * @returns {object|null}
 */
function skillToPluginDef(skill, sourcePath) {
 const aliases = [];

 // If commands is an array of strings, treat them as aliases
 if (Array.isArray(skill.commands)) {
 for (const c of skill.commands) {
 if (typeof c === "string") {
 aliases.push(c);
 } else if (typeof c === "object" && c.name) {
 aliases.push(c.name);
 }
 }
 }

 // If commands is an object mapping alias -> handler
 if (skill.commands && typeof skill.commands === "object" && !Array.isArray(skill.commands)) {
 for (const [alias, handler] of Object.entries(skill.commands)) {
 aliases.push(alias);
 if (typeof handler !== "function") {
 console.warn(`⚠️ Skill ${skill.name}: command "${alias}" handler is not a function`);
 }
 }
 }

 const primaryAlias = aliases[0] || skill.name.toLowerCase().replace(/\s+/g, "-");

 const pluginDef = {
 cmd: aliases.length > 0 ? aliases : [primaryAlias],
 desc: skill.description || "",
 usage: skill.usage || primaryAlias,
 scope: skill.scope || "public",
 version: skill.version || "1.0.0",
 author: skill.author || "skill-loader",
 description: skill.description,
 dependencies: skill.dependencies || [],
 onLoad: skill.onLoad || null,
 onEnable: skill.onEnable || null,
 onDisable: skill.onDisable || null,
 onUnload: skill.onUnload || null,
 handler: skill.handler || null,
 metadata: {
 isSkill: true,
 skillName: skill.name,
 sourcePath,
 loadedAt: Date.now(),
 },
 };

 // If the skill provides a single handler, use it for the primary alias
 if (skill.handler && typeof skill.handler === "function") {
 pluginDef.handler = skill.handler;
 }

 return pluginDef;
}

/**
 * Load a skill from a JSON file.
 * @param {string} filePath
 * @returns {{success:boolean, skillName?:string, error?:string}}
 */
export async function loadSkill(filePath) {
 const absPath = path.resolve(filePath);

 if (!fs.existsSync(absPath)) {
 return { success: false, error: `File not found: ${absPath}` };
 }

 let raw;
 try {
 raw = fs.readFileSync(absPath, "utf-8");
 } catch (err) {
 return { success: false, error: `Failed to read file: ${err.message}` };
 }

 let skill;
 try {
 skill = JSON.parse(raw);
 } catch (err) {
 return { success: false, error: `Invalid JSON: ${err.message}` };
 }

 const { valid, errors: validationErrors } = validateSkill(skill, absPath);
 if (!valid) {
 const msg = validationErrors.join("; ");
 return { success: false, error: `Validation failed: ${msg}` };
 }

 if (skills.has(skill.name)) {
 return { success: false, error: `Skill "${skill.name}" already loaded` };
 }

 const pluginDef = skillToPluginDef(skill, absPath);
 skills.set(skill.name, { ...skill, _pluginDef: pluginDef, _sourcePath: absPath });

 console.log(`✅ Skill loaded: ${skill.name} (${pluginDef.scope})`);
 return { success: true, skillName: skill.name };
}

/**
 * Load a skill as a plugin via the plugin manager.
 * @param {string} skillName
 * @param {import("./pluginManager.js")} pluginManager
 * @returns {{success:boolean, error?:string}}
 */
export async function loadSkillAsPlugin(skillName, pluginManager) {
 const skill = skills.get(skillName);
 if (!skill) {
 return { success: false, error: `Skill "${skillName}" not found. Load it first.` };
 }

 const pluginDef = skill._pluginDef;
 if (!pluginDef) {
 return { success: false, error: `Skill "${skillName}" has no plugin definition` };
 }

 // Create a temporary plugin file and load it through pluginManager
 const tempDir = path.join(__dirname, "..", ".temp-plugins");
 if (!fs.existsSync(tempDir)) {
 fs.mkdirSync(tempDir, { recursive: true });
 }

 const tempFile = path.join(tempDir, `skill-${skillName.replace(/[^a-zA-Z0-9-_]/g, "_")}.js`);

 const handlerCode = pluginDef.handler
 ? `export default () => (${pluginDef.handler.toString()});`
 : `export default () => ({ handler: async () => {}, cmd: ${JSON.stringify(pluginDef.cmd)} });`;

 // Actually, we need a proper dynamic approach. Build a factory that returns the plugin def.
 const exportCode = `
export default function skillFactory() {
 return ${JSON.stringify({
 cmd: pluginDef.cmd,
 desc: pluginDef.desc,
 usage: pluginDef.usage,
 scope: pluginDef.scope,
 version: pluginDef.version,
 author: pluginDef.author,
 description: pluginDef.description,
 dependencies: pluginDef.dependencies,
 onLoad: pluginDef.onLoad ? pluginDef.onLoad.toString() : null,
 onEnable: pluginDef.onEnable ? pluginDef.onEnable.toString() : null,
 onDisable: pluginDef.onDisable ? pluginDef.onDisable.toString() : null,
 onUnload: pluginDef.onUnload ? pluginDef.onUnload.toString() : null,
 handler: pluginDef.handler ? pluginDef.handler.toString() : null,
 }, (key, val) => {
 if (key === "handler" || key === "onLoad" || key === "onEnable" || key === "onDisable" || key === "onUnload") {
 if (val === null) return null;
 return new Function(`return ${val}`)();
 }
 return val;
 })};
`;

 // Simpler approach: just generate the code as a string that exports the right thing
 const skillExport = generateSkillExport(pluginDef);

 try {
 fs.writeFileSync(tempFile, skillExport);
 } catch (err) {
 return { success: false, error: `Failed to write temp plugin file: ${err.message}` };
 }

 const result = await pluginManager.loadPlugin(tempFile);
 return result;
}

/**
 * Generate ESM code for a skill plugin file.
 */
function generateSkillExport(pluginDef) {
 const safeHandler = pluginDef.handler
 ? `export const _handler = ${pluginDef.handler.toString()};`
 : `export const _handler = async () => {};`;

 const safeOnLoad = pluginDef.onLoad
 ? `export const _onLoad = ${pluginDef.onLoad.toString()};`
 : `export const _onLoad = null;`;

 const safeOnEnable = pluginDef.onEnable
 ? `export const _onEnable = ${pluginDef.onEnable.toString()};`
 : `export const _onEnable = null;`;

 const safeOnDisable = pluginDef.onDisable
 ? `export const _onDisable = ${pluginDef.onDisable.toString()};`
 : `export const _onDisable = null;`;

 const safeOnUnload = pluginDef.onUnload
 ? `export const _onUnload = ${pluginDef.onUnload.toString()};`
 : `export const _onUnload = null;`;

 return `${safeHandler}
${safeOnLoad}
${safeOnEnable}
${safeOnDisable}
${safeOnUnload}

export default function() {
 return {
 cmd: ${JSON.stringify(pluginDef.cmd)},
 desc: ${JSON.stringify(pluginDef.desc)},
 usage: ${JSON.stringify(pluginDef.usage)},
 scope: ${JSON.stringify(pluginDef.scope)},
 version: ${JSON.stringify(pluginDef.version)},
 author: ${JSON.stringify(pluginDef.author)},
 description: ${JSON.stringify(pluginDef.description)},
 dependencies: ${JSON.stringify(pluginDef.dependencies)},
 handler: _handler,
 onLoad: _onLoad,
 onEnable: _onEnable,
 onDisable: _onDisable,
 onUnload: _onUnload,
 };
}
`;
}

/**
 * Unload a skill (both from skills map and from plugin manager).
 * @param {string} skillName
 * @param {import("./pluginManager.js")} pluginManager
 * @returns {{success:boolean, error?:string}}
 */
export async function unloadSkill(skillName, pluginManager) {
 const skill = skills.get(skillName);
 if (!skill) {
 return { success: false, error: `Skill "${skillName}" not found` };
 }

 const pluginName = skill._pluginDef?.cmd?.[0] || skillName.toLowerCase().replace(/\s+/g, "-");

 // Try to unload from plugin manager if it was loaded as a plugin
 if (pluginManager.getPlugin(pluginName)) {
 await pluginManager.unloadPlugin(pluginName);
 }

 skills.delete(skillName);

 // Clean up temp file
 const tempDir = path.join(__dirname, "..", ".temp-plugins");
 const tempFile = path.join(tempDir, `skill-${skillName.replace(/[^a-zA-Z0-9-_]/g, "_")}.js`);
 try { fs.unlinkSync(tempFile); } catch {}

 console.log(`🗑️ Skill unloaded: ${skillName}`);
 return { success: true };
}

/**
 * Scan the skills directory and load all valid skills.
 * @returns {{loaded:string[], failed:Array<{name:string, error:string}>}}
 */
export async function scanSkills() {
 const result = { loaded: [], failed: [] };

 if (!fs.existsSync(SKILLS_DIR)) {
 console.log(`📁 Skills directory not found: ${SKILLS_DIR}`);
 return result;
 }

 const entries = fs.readdirSync(SKILLS_DIR);
 const skillFiles = entries.filter((f) => f === "skill.json" || f === "skill.yaml" || f === "skill.yml");

 for (const file of skillFiles) {
 const filePath = path.join(SKILLS_DIR, file);
 const loadResult = await loadSkill(filePath);
 if (loadResult.success) {
 result.loaded.push(loadResult.skillName);
 } else {
 result.failed.push({ name: file, error: loadResult.error || "Unknown error" });
 errors.add(file);
 }
 }

 return result;
}

/**
 * Get all loaded skills.
 * @returns {Array<object>}
 */
export function getSkills() {
 return Array.from(skills.values()).map((s) => ({
 name: s.name,
 description: s.description,
 scope: s.scope,
 version: s.version,
 author: s.author,
 commands: s.commands,
 sourcePath: s._sourcePath,
 }));
}

/**
 * Get a skill by name.
 * @param {string} name
 * @returns {object|undefined}
 */
export function getSkill(name) {
 return skills.get(name);
}

/**
 * Get skills that have errored.
 */
export function getSkillErrors() {
 return Array.from(errors);
}

/**
 * Check if a skill is loaded.
 * @param {string} name
 */
export function hasSkill(name) {
 return skills.has(name);
}

export default {
 loadSkill,
 loadSkillAsPlugin,
 unloadSkill,
 scanSkills,
 getSkills,
 getSkill,
 hasSkill,
 getSkillErrors,
};
