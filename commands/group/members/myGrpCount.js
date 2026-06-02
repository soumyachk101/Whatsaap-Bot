import { group } from "../../../sqlite-DB/groupDataDb.js";

const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, senderJid } = msgInfoObj;

	const taggedJid = msg?.message?.extendedTextMessage?.contextInfo?.participant;
	const targetJid = taggedJid || senderJid;
	const filter = {
		"members.id": targetJid,
	};
	group
		.find(filter)
		.toArray()
		.then((res) => {
			if (res && res.length > 0) {
				let mess = "",
					userName = "",
					totalMessageCount = 0;
				res.sort((a, b) => {
					const aMember = a.members.find((member) => member.id === targetJid);
					const bMember = b.members.find((member) => member.id === targetJid);
					return (bMember?.count || 0) - (aMember?.count || 0);
				});
				res.forEach((grp) => {
					let data = grp.members.filter((member) => member.id === targetJid);
					if (data.length > 0) {
						userName = data[0].name;
						totalMessageCount += data[0].count;
						mess += `${data[0].count} - ${grp.grpName}\n`;
					}
				});
				sendMessageWTyping(
					from,
					{
						text: `*${userName}'s Message Count In All Groups are*: ${totalMessageCount}\n\n ${readMore}\n\n${mess}`,
					},
					{ quoted: msg }
				);
			} else {
				sendMessageWTyping(from, { text: "No Data Found" }, { quoted: msg });
			}
		})
		.catch((err) => {
			console.error("myGrpCount error:", err);
			sendMessageWTyping(from, { text: "❌ Error fetching group counts." }, { quoted: msg });
		});
};

export default () => ({
	cmd: ["totalg"],
	desc: "Get your message count in all groups",
	usage: "totalg | reply to a message to get message count of that member",
	handler,
});
