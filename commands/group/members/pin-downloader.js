import dotenv from 'dotenv';
dotenv.config();
const PIN_KEY = process.env.PIN_KEY || "";

import axios from "axios";

const handler = async (sock, msg, from, args, msgInfoObj) => {
    const { sendMessageWTyping } = msgInfoObj;

    if (!PIN_KEY)
        return sendMessageWTyping(from,
            { text: "```Pinterest API Key is Missing```" },
            { quoted: msg }
        );

    if (!args[0] || !args[0].includes("https://pin.it")) return sendMessageWTyping(from, { text: "Provide the pinurl" }, { quoted: msg });
    try {
        const res = await axios.get(`https://api.xteam.xyz/dl/pinterestdl?url=${args[0]}/&APIKEY=${PIN_KEY}`);
        if (res.data.status == true) {
            const hdImg = res.data.result.hd_img;
            const highImg = res.data.result.high_img;
            if (hdImg) {
                hdImg.endsWith('mp4')
                    ? sendMessageWTyping(from, { video: { url: hdImg } }, { quoted: msg })
                    : sendMessageWTyping(from, { image: { url: hdImg } }, { quoted: msg });
            } else if (highImg) {
                highImg.endsWith('mp4')
                    ? sendMessageWTyping(from, { video: { url: highImg } }, { quoted: msg })
                    : sendMessageWTyping(from, { image: { url: highImg } }, { quoted: msg });
            } else {
                sendMessageWTyping(from, { text: "Not Found / Error" }, { quoted: msg });
            }
        } else {
            sendMessageWTyping(from, { text: "error" }, { quoted: msg });
        }
    } catch (err) {
        console.error("Pinterest download error:", err);
        sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
    }
}

export default () => ({
    cmd: ["pin"],
    desc: "Download pin from pinterest",
    usage: "pin <pinurl>",
    handler
});