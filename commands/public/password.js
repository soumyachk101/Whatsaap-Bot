// Secure password generator using crypto.randomBytes
import crypto from "crypto";

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?/~|";
const AMBIGUOUS = new Set("0OoIl1|`'\"\\/,.;:");

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;

	let length = 16;
	const flags = new Set();

	for (const arg of args) {
		const a = arg.toLowerCase();
		if (/^\d+$/.test(a)) {
			length = parseInt(a);
		} else if (a === "no" || a.startsWith("no")) {
			// "nosymbols", "nonumber", "noupper", "nolower", "noambiguous"
			if (a.includes("symbol")) flags.add("nosymbols");
			else if (a.includes("number") || a.includes("digit")) flags.add("nonumbers");
			else if (a.includes("upper")) flags.add("noupper");
			else if (a.includes("lower")) flags.add("nolower");
			else if (a.includes("ambig") || a.includes("ambigous")) flags.add("noambig");
		} else if (a === "symbols" || a === "s") flags.delete("nosymbols");
	}

	if (length < 4) length = 4;
	if (length > 128) length = 128;

	// Build charset
	let charset = "";
	const required = [];
	if (!flags.has("nolower")) {
		charset += LOWERCASE;
		required.push(LOWERCASE);
	}
	if (!flags.has("noupper")) {
		charset += UPPERCASE;
		required.push(UPPERCASE);
	}
	if (!flags.has("nonumbers")) {
		charset += DIGITS;
		required.push(DIGITS);
	}
	if (!flags.has("nosymbols")) {
		charset += SYMBOLS;
		required.push(SYMBOLS);
	}

	// Remove ambiguous chars if requested
	if (flags.has("noambig")) {
		charset = [...charset].filter((c) => !AMBIGUOUS.has(c)).join("");
		for (let i = 0; i < required.length; i++) {
			required[i] = [...required[i]].filter((c) => !AMBIGUOUS.has(c)).join("");
			if (required[i].length === 0) required.splice(i, 1);
		}
	}

	if (charset.length === 0) {
		return sendMessageWTyping(
			from,
			{ text: "❌ All char sets disabled! Use at least one of: lower, upper, number, symbol." },
			{ quoted: msg }
		);
	}

	// Build password using crypto.randomInt (cryptographically secure)
	const chars = [];
	// First, ensure at least one of each required set
	for (const set of required) {
		const idx = crypto.randomInt(0, set.length);
		chars.push(set[idx]);
	}
	// Fill the rest
	for (let i = chars.length; i < length; i++) {
		const idx = crypto.randomInt(0, charset.length);
		chars.push(charset[idx]);
	}
	// Shuffle
	for (let i = chars.length - 1; i > 0; i--) {
		const j = crypto.randomInt(0, i + 1);
		[chars[i], chars[j]] = [chars[j], chars[i]];
	}

	const password = chars.join("");

	// Calculate strength
	const strength =
		length >= 20 && charset.length >= 70 ? "💪 Very Strong"
			: length >= 14 && charset.length >= 60 ? "🔒 Strong"
			: length >= 10 && charset.length >= 50 ? "⚠️ Medium"
			: "❌ Weak";

	const entropy = Math.round(length * Math.log2(charset.length));

	const text =
		`🔐 *Secure Password Generated!*\n\n` +
		`\`\`\`${password}\`\`\`\n\n` +
		`📏 Length: *${length}*\n` +
		`🛡️ Strength: *${strength}*\n` +
		`🧮 Entropy: *${entropy} bits*\n\n` +
		`_Tip: Save it in a password manager. Don't share!_`;

	return sendMessageWTyping(from, { text }, { quoted: msg });
};

export default () => ({
	cmd: ["password", "passwd", "pass", "genpass"],
	desc: "Generate cryptographically secure passwords",
	usage: "password 16 | password 20 nosymbols | password 24 noambig",
	handler,
});
