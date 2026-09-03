// Crypto prices + currency converter (free, no API key, with Binance fallback)

import axios from "axios";

const COINGECKO_IDS = {
	btc: "bitcoin", bitcoin: "bitcoin",
	eth: "ethereum", ethereum: "ethereum",
	sol: "solana", solana: "solana",
	bnb: "binancecoin", binancecoin: "binancecoin",
	xrp: "ripple", ripple: "ripple",
	ada: "cardano", cardano: "cardano",
	doge: "dogecoin", dogecoin: "dogecoin",
	matic: "matic-network", polygon: "matic-network", pol: "matic-network",
	dot: "polkadot", polkadot: "polkadot",
	avax: "avalanche-2", avalanche: "avalanche-2",
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

const BINANCE_SYMBOLS = {
	bitcoin: "BTCUSDT", btc: "BTCUSDT",
	ethereum: "ETHUSDT", eth: "ETHUSDT",
	solana: "SOLUSDT", sol: "SOLUSDT",
	binancecoin: "BNBUSDT", bnb: "BNBUSDT",
	ripple: "XRPUSDT", xrp: "XRPUSDT",
	cardano: "ADAUSDT", ada: "ADAUSDT",
	dogecoin: "DOGEUSDT", doge: "DOGEUSDT",
	"matic-network": "POLUSDT", matic: "POLUSDT", pol: "POLUSDT",
	polkadot: "DOTUSDT", dot: "DOTUSDT",
	"avalanche-2": "AVAXUSDT", avax: "AVAXUSDT",
	litecoin: "LTCUSDT", ltc: "LTCUSDT",
	chainlink: "LINKUSDT", link: "LINKUSDT",
	tron: "TRXUSDT", trx: "TRXUSDT",
	"shiba-inu": "SHIBUSDT", shib: "SHIBUSDT",
	"usd-coin": "USDCUSDT", usdc: "USDCUSDT",
	"bitcoin-cash": "BCHUSDT", bch: "BCHUSDT",
	near: "NEARUSDT",
	cosmos: "ATOMUSDT", atom: "ATOMUSDT",
	stellar: "XLMUSDT", xlm: "XLMUSDT",
	uniswap: "UNIUSDT", uni: "UNIUSDT",
	aptos: "APTUSDT", apt: "APTUSDT",
	arbitrum: "ARBUSDT", arb: "ARBUSDT",
	optimism: "OPUSDT", op: "OPUSDT",
	"the-open-network": "TONUSDT", ton: "TONUSDT",
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

const fetchFiatRate = async (fromCur = "USD", toCur = "INR") => {
	const f = fromCur.toUpperCase();
	const t = toCur.toUpperCase();
	if (f === t) return 1;
	try {
		const res = await axios.get(`https://open.er-api.com/v6/latest/${f}`, { timeout: 5000 });
		if (res.data?.rates?.[t]) return res.data.rates[t];
	} catch (_) {}
	try {
		const res = await axios.get(`https://api.frankfurter.dev/v1/latest?base=${f}&symbols=${t}`, { timeout: 5000 });
		if (res.data?.rates?.[t]) return res.data.rates[t];
	} catch (_) {}
	return null;
};

const fetchFromBinance = async (ids, convertTo = "usd") => {
	const cur = convertTo.toUpperCase();
	let fiatMultiplier = 1;
	if (cur !== "USD") {
		fiatMultiplier = await fetchFiatRate("USD", cur) || 1;
	}

	const results = [];
	for (const id of ids) {
		const pair = BINANCE_SYMBOLS[id];
		if (!pair) continue;
		try {
			const res = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`, { timeout: 5000 });
			const rawPrice = parseFloat(res.data.lastPrice);
			const change = parseFloat(res.data.priceChangePercent);
			const price = rawPrice * fiatMultiplier;
			results.push({ id, price, change });
		} catch (_) {
			// Skip single pair error
		}
	}
	return results.length > 0 ? results : null;
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;
	const cmdLower = (command || "").toLowerCase();

	// Direct coin commands: #btc, #eth, #sol, #doge, etc.
	let queryArgs = [...args];
	if (queryArgs.length === 0 && COINGECKO_IDS[cmdLower]) {
		queryArgs = [cmdLower];
	}

	if (queryArgs.length === 0) {
		return sendMessageWTyping(
			from,
			{
				text:
					`💰 *Crypto & Currency Commands:*\n\n` +
					`• \`${prefix}btc\` or \`${prefix}crypto btc eth sol\` — crypto prices (USD)\n` +
					`• \`${prefix}btc inr\` — convert 1 BTC to INR\n` +
					`• \`${prefix}convert 100 USD INR\` — currency converter\n\n` +
					`_Supported: btc, eth, sol, bnb, xrp, doge, matic, avax, link, ton, etc._`,
			},
			{ quoted: msg }
		);
	}

	// Currency conversion: "100 USD to INR" or "100 USD INR"
	const convertMatch = queryArgs.join(" ").match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]{3})\s*(?:to|in)?\s*([A-Za-z]{3})$/i);
	if (convertMatch && (cmdLower === "convert" || cmdLower === "currency")) {
		const amount = parseFloat(convertMatch[1]);
		const fromCur = convertMatch[2].toUpperCase();
		const toCur = convertMatch[3].toUpperCase();
		try {
			const rate = await fetchFiatRate(fromCur, toCur);
			if (!rate) throw new Error(`Could not fetch rate for ${fromCur} to ${toCur}`);
			const result = amount * rate;
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
	const query = queryArgs.map((a) => a.toLowerCase());
	const hasCrypto = query.some((a) => COINGECKO_IDS[a] !== undefined);

	if (!hasCrypto) {
		if (cmdLower === "convert" || cmdLower === "currency") {
			return sendMessageWTyping(from, { text: `❌ *Usage:* \`${prefix}${command} 100 USD INR\`` }, { quoted: msg });
		}
		return sendMessageWTyping(from, { text: "❌ No supported crypto found. Try: btc, eth, sol, doge, bnb..." }, { quoted: msg });
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
	const CURRENCIES = ["usd", "inr", "eur", "gbp", "jpy", "aud", "cad", "cny", "brl", "rub", "krw", "try", "zar", "pkr", "aed"];
	if (CURRENCIES.includes(lastArg) && !COINGECKO_IDS[lastArg]) {
		convertTo = lastArg;
	}

	const symbolMap = {};
	for (const [k, v] of Object.entries(COINGECKO_IDS)) {
		if (!symbolMap[v]) symbolMap[v] = k;
	}

	const cur = convertTo.toUpperCase();

	// Primary: CoinGecko (4s timeout)
	try {
		const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=${convertTo}&include_24hr_change=true&include_last_updated_at=true`;
		const res = await axios.get(url, {
			timeout: 4000,
			headers: { "User-Agent": "Mozilla/5.0" }
		});

		if (res.data && Object.keys(res.data).length > 0) {
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
		}
	} catch (cgErr) {
		console.warn("[CoinGecko unavailable, falling back to Binance]:", cgErr.message);
	}

	// Fallback: Binance (Fast & zero-rate-limit)
	try {
		const binanceData = await fetchFromBinance(ids, convertTo);
		if (binanceData && binanceData.length > 0) {
			let txt = `💰 *Crypto Prices* (${cur})\n\n`;
			for (const item of binanceData) {
				const sym = symbolMap[item.id] || item.id;
				txt += `*${sym.toUpperCase()}* — ${cur} ${formatNumber(item.price)}  ${formatChange(item.change)}\n`;
			}
			txt += `\n_Source: Binance_`;
			return sendMessageWTyping(from, { text: txt }, { quoted: msg });
		}
	} catch (bErr) {
		console.error("[Binance fallback error]:", bErr.message);
	}

	return sendMessageWTyping(from, { text: "❌ Failed to fetch crypto prices right now. Please try again later." }, { quoted: msg });
};

export default () => ({
	cmd: ["crypto", "price", "coin", "convert", "currency", "btc", "eth", "sol", "doge", "bnb", "xrp"],
	desc: "Live crypto prices + currency conversion",
	usage: "btc | crypto btc eth sol | crypto btc inr | convert 100 USD INR",
	handler,
});
