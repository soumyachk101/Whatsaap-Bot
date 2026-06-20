// Crypto prices + currency converter (free, no API key)

import axios from "axios";

const COINGECKO_IDS = {
	btc: "bitcoin", bitcoin: "bitcoin",
	eth: "ethereum", ethereum: "ethereum",
	sol: "solana", solana: "solana",
	bnb: "binancecoin", bnb: "binancecoin",
	xrp: "ripple", ripple: "ripple",
	ada: "cardano", cardano: "cardano",
	doge: "dogecoin", dogecoin: "dogecoin",
	matic: "matic-network", polygon: "matic-network",
	dot: "polkadot", polkadot: "polkadot",
	avax: "avalanche-2", avax: "avalanche-2",
	ltc: "litecoin", litecoin: "litecoin",
	link: "chainlink", chainlink: "chainlink",
	trx: "tron", tron: "tron",
	shib: "shiba-inu", shibainu: "shiba-inu",
	usdt: "tether", tether: "tether",
	usdc: "usd-coin",
	bch: "bitcoin-cash",
	near: "near",
	atom: "cosmos",
	xlm: "stellar",
	uni: "uniswap",
	fil: "filecoin",
	apt: "aptos",
	arb: "arbitrum",
	op: "optimism",
	ton: "the-open-network",
};

const formatNumber = (n, decimals = 2) => {
	if (n == null || isNaN(n)) return "—";
	if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
	if (n >= 0.01) return n.toFixed(4);
	if (n >= 0.0001) return n.toFixed(6);
	return n.toExponential(2);
};

const formatChange = (c) => {
	if (c == null) return "";
	const arrow = c >= 0 ? "📈 +" : "📉 ";
	return `${arrow}${c.toFixed(2)}%`;
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;

	if (args.length === 0) {
		return sendMessageWTyping(
			from,
			{
				text:
					`💰 *Crypto & Currency Commands:*\n\n` +
					`• \`${prefix}${command} btc eth sol\` — crypto prices (USD)\n` +
					`• \`${prefix}${command} btc inr\` — convert 1 BTC to INR\n` +
					`• \`${prefix}convert 100 USD INR\` — currency converter\n\n` +
					`_Supported: ${Object.keys(COINGECKO_IDS).slice(0, 10).join(", ")}..._`,
			},
			{ quoted: msg }
		);
	}

	// Currency conversion: "100 USD to INR" or "100 USD INR"
	const convertMatch = args.join(" ").match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]{3})\s*(?:to|in)?\s*([A-Za-z]{3})$/i);
	if (convertMatch && command === "convert") {
		const amount = parseFloat(convertMatch[1]);
		const fromCur = convertMatch[2].toUpperCase();
		const toCur = convertMatch[3].toUpperCase();
		try {
			const res = await axios.get(`https://api.exchangerate.host/convert`, {
				params: { from: fromCur, to: toCur, amount },
				timeout: 10_000,
			});
			if (!res.data || !res.data.success || res.data.result == null) {
				throw new Error("Bad response");
			}
			const result = res.data.result;
			const rate = res.data.info?.rate || (result / amount);
			return sendMessageWTyping(
				from,
				{
					text:
						`💱 *Currency Conversion*\n\n` +
						`${amount} ${fromCur} = *${result.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${toCur}*\n\n` +
						`📊 Rate: 1 ${fromCur} = ${rate.toFixed(6)} ${toCur}`,
				},
				{ quoted: msg }
			);
		} catch (e) {
			console.error("Convert error:", e.message);
			return sendMessageWTyping(from, { text: "❌ Currency conversion failed. Try again." }, { quoted: msg });
		}
	}

	// Check if it's a crypto query (contains any coin name)
	const query = args.map((a) => a.toLowerCase());
	const hasCrypto = query.some((a) => COINGECKO_IDS[a] !== undefined);

	if (!hasCrypto) {
		// Not crypto, try as currency conversion if the command is `convert`
		if (command === "convert") {
			return sendMessageWTyping(from, { text: `❌ *Usage:* \`${prefix}convert 100 USD INR\`` }, { quoted: msg });
		}
		return sendMessageWTyping(from, { text: "❌ No supported crypto found. Try: btc, eth, sol, doge..." }, { quoted: msg });
	}

	// Collect unique coin ids
	const ids = [];
	const seen = new Set();
	for (const arg of query) {
		const id = COINGECKO_IDS[arg];
		if (id && !seen.has(id)) {
			ids.push(id);
			seen.add(id);
		}
	}

	// Last arg could be a currency to convert to (e.g. "btc inr")
	let convertTo = "usd";
	const lastArg = query[query.length - 1].toLowerCase();
	const CURRENCIES = ["usd", "inr", "eur", "gbp", "jpy", "aud", "cad", "cny", "brl", "rub", "krw", "try", "zar"];
	if (CURRENCIES.includes(lastArg) && !COINGECKO_IDS[lastArg]) {
		convertTo = lastArg;
		// Remove last arg from ids (it's actually a currency)
		// (no need, since COINGECKO_IDS won't have it)
	}

	try {
		const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=${convertTo}&include_24hr_change=true&include_last_updated_at=true`;
		const res = await axios.get(url, { timeout: 10_000 });

		if (!res.data) throw new Error("Empty response");

		const symbolMap = {};
		for (const [k, v] of Object.entries(COINGECKO_IDS)) {
			if (!symbolMap[v]) symbolMap[v] = k;
		}

		const cur = convertTo.toUpperCase();
		let txt = `💰 *Crypto Prices* (${cur})\n\n`;

		for (const id of ids) {
			const data = res.data[id];
			if (!data) continue;
			const price = data[convertTo];
			const change = data[`${convertTo}_24h_change`];
			const sym = symbolMap[id] || id;
			txt += `*${sym.toUpperCase()}* — ${cur} ${formatNumber(price)}  ${formatChange(change)}\n`;
		}

		txt += `\n_Source: CoinGecko_`;

		return sendMessageWTyping(from, { text: txt }, { quoted: msg });
	} catch (e) {
		console.error("Crypto error:", e.message);
		return sendMessageWTyping(from, { text: "❌ Failed to fetch crypto prices. Try again later." }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["crypto", "price", "coin"],
	desc: "Live crypto prices + currency conversion",
	usage: "crypto btc eth sol | crypto btc inr | convert 100 USD INR",
	handler,
});

export const convertCmd = () => ({
	cmd: ["convert", "currency"],
	desc: "Convert currencies",
	usage: "convert 100 USD INR",
	handler,
});
