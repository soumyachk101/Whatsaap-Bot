import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const baseURL = "https://www.googleapis.com/customsearch/v1";
const maxResults = 5; // Limiting to 5 results for better readability

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv } = msgInfoObj;

	// Read env vars at runtime to ensure dotenv has already loaded them
	const GOOGLE_API_KEY_SEARCH = process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY_SEARCH || "";
	const SEARCH_ENGINE_KEY = process.env.SEARCH_ENGINE_KEY || "";

	// Check if API keys are missing
	if (!GOOGLE_API_KEY_SEARCH || !SEARCH_ENGINE_KEY) {
		return sendMessageWTyping(
			from,
			{ text: "```Google API Key or Search Engine Key is Missing```" },
			{ quoted: msg }
		);
	}

	// Extract search query from quoted message or direct input
	let searchQuery = evv || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || "";

	if (!searchQuery) {
		return sendMessageWTyping(from, { text: "```Enter Word to Search```" }, { quoted: msg });
	}

	// Construct URL for Google Custom Search API
	const urlToSearch = `${baseURL}?key=${GOOGLE_API_KEY_SEARCH}&cx=${SEARCH_ENGINE_KEY}&q=${encodeURIComponent(
		searchQuery
	)}`;

	try {
		const response = await axios.get(urlToSearch, { timeout: 10000 });

		// Extract search results
		const searchResults = response.data?.items?.slice(0, maxResults); // Limiting results to 'maxResults'

		if (searchResults && searchResults.length > 0) {
			// Format and prepare message to send
			let message = "";
			searchResults.forEach((result, index) => {
				message += `*Title*: ${result.title}\n*Snippet*: ${result.snippet}\n*Link*: ${result.link}\n\n`;
			});

			sendMessageWTyping(from, { text: message }, { quoted: msg });
		} else {
			sendMessageWTyping(from, { text: "```No Results Found```" }, { quoted: msg });
		}
	} catch (error) {
		console.error("[Google Search] Error:", error.message);
		sendMessageWTyping(from, { text: "❌ Search failed. Try again later." }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["google", "gs"],
	desc: "Search on Google",
	usage: "search | gs <query>",
	handler,
});
