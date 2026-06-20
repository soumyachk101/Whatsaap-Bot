import QRCode from "qrcode";
import { downloadContentFromMessage } from "baileys";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;

	let input = args.join(" ").trim();

	// Fall back to quoted message text
	if (!input) {
		const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
		input = quoted?.conversation || quoted?.extendedTextMessage?.text || "";
	}

	if (!input) {
		return sendMessageWTyping(
			from,
			{
				text:
					`📱 *QR Code Generator*\n\n` +
					`Usage:\n` +
					`• \`${prefix}${command} <text or URL>\`\n` +
					`• Reply to any message: \`${prefix}${command}\`\n\n` +
					`_Example: ${prefix}qr https://github.com/soumyachk101_`,
			},
			{ quoted: msg }
		);
	}

	// Detect type
	let qrType = "text";
	if (/^https?:\/\//i.test(input)) qrType = "URL";
	else if (/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(input)) qrType = "Email";
	else if (/^[+0-9\-\s()]{7,}$/.test(input)) qrType = "Phone";
	else if (input.length > 200) qrType = "Long text";

	try {
		const buffer = await QRCode.toBuffer(input, {
			errorCorrectionLevel: "H",
			type: "png",
			margin: 2,
			scale: 8,
			color: {
				dark: "#000000FF",
				light: "#FFFFFFFF",
			},
		});

		const caption =
			`✅ *QR Code Generated*\n\n` +
			`📦 *Type:* ${qrType}\n` +
			`📏 *Length:* ${input.length} chars\n\n` +
			`_Scan with any QR scanner._`;

		await sendMessageWTyping(
			from,
			{ image: buffer, caption },
			{ quoted: msg }
		);
	} catch (err) {
		console.error("qr error:", err);
		sendMessageWTyping(
			from,
			{ text: `❌ Failed to generate QR code: ${err.message}` },
			{ quoted: msg }
		);
	}
};

export default () => ({
	cmd: ["qr", "qrcode"],
	desc: "Generate a QR code from text or URL",
	usage: "qr <text/url>",
	handler,
});
