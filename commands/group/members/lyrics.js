import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import Genius from "genius-lyrics";

const GENIUS_ACCESS_SECRET = process.env.GENIUS_ACCESS_SECRET || "";
const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

let GeniusClient = null;
if (GENIUS_ACCESS_SECRET) {
	try {
		GeniusClient = new Genius.Client(GENIUS_ACCESS_SECRET);
	} catch (_) {}
}

const fetchFromLrclib = async (query) => {
	const res = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, { timeout: 10000 });
	if (res.data && Array.isArray(res.data) && res.data.length > 0) {
		const match = res.data.find(item => item.plainLyrics) || res.data[0];
		if (match && match.plainLyrics) {
			return {
				title: match.trackName || query,
				artist: match.artistName || "Unknown Artist",
				lyrics: match.plainLyrics,
			};
		}
	}
	return null;
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv } = msgInfoObj;

	if (!args[0]) return sendMessageWTyping(from, { text: "❌ Please enter a song name." }, { quoted: msg });

	const songQuery = evv || args.join(" ");

	try {
		let songTitle = "";
		let artistName = "";
		let lyricsText = "";

		// Try Genius API if secret is provided
		if (GeniusClient) {
			try {
				const searches = await GeniusClient.songs.search(songQuery);
				if (searches && searches.length > 0) {
					const firstSong = searches[0];
					const lyrics = await firstSong.lyrics(true);
					if (lyrics) {
						songTitle = firstSong.title;
						artistName = firstSong.artist?.name || "Unknown Artist";
						lyricsText = lyrics;
					}
				}
			} catch (geniusErr) {
				console.warn("Genius API failed, falling back to LRCLIB:", geniusErr.message);
			}
		}

		// Fallback to LRCLIB (free, no API key required)
		if (!lyricsText) {
			const lrclibRes = await fetchFromLrclib(songQuery);
			if (lrclibRes) {
				songTitle = lrclibRes.title;
				artistName = lrclibRes.artist;
				lyricsText = lrclibRes.lyrics;
			}
		}

		if (!lyricsText) {
			return sendMessageWTyping(from, { text: `❌ No lyrics found for: *${songQuery}*` }, { quoted: msg });
		}

		const mess = `🎵 *${songTitle}*\n🎤 *Artist:* ${artistName}\n\n*Lyrics:*${readMore}${lyricsText}`;
		sendMessageWTyping(from, { text: mess }, { quoted: msg });
	} catch (error) {
		console.error("Lyrics error:", error);
		sendMessageWTyping(from, { text: `❌ Error fetching lyrics: ${error.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["l", "lyric", "lyrics"],
	desc: "Get lyrics of a song",
	usage: "lyric <song name>",
	handler,
});
