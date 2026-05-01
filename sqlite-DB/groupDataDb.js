import db from "../sqlite.js";

const group = db.db().collection("Groups");

const createGroupData = async (groupJid, groupMetadata) => {
	try {
		const res = await group.findOne({ _id: groupJid });
		if (res == null) {
			await group.insertOne({
				_id: groupJid,
				isBotOn: false,
				isImgOn: false,
				isChatBotOn: false,
				is91Only: false,
				antilink: false,
				nsfw: false,
				grpName: groupMetadata.subject,
				desc: groupMetadata.desc ? groupMetadata.desc.toString() : "",
				cmdBlocked: [],
				welcome: "",
				totalMsgCount: 0,
				memberWarnCount: [],
				members: [],
				chatHistory: [],
			});
		} else {
			await group.updateOne(
				{ _id: groupJid },
				{
					$set: {
						grpName: groupMetadata.subject,
						desc: groupMetadata.desc ? groupMetadata.desc.toString() : "",
					},
				}
			);
		}
	} catch (err) {
		console.error("[groupDataDb error]", err.message);
	}
};

const getGroupData = async (groupJid) => {
	try {
		const res = await group.findOne({ _id: groupJid });
		return res;
	} catch (err) {
		console.error("[groupDataDb error]", err.message);
		return -1;
	}
};

export { getGroupData, createGroupData, group };
