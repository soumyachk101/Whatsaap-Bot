// Truth or Dare — viral group fun

const TRUTHS = [
	"What's the most embarrassing thing you've ever done? 😅",
	"Have you ever lied to your best friend? What was it about?",
	"What's a secret you've never told anyone?",
	"Who in this group would you date if you had to choose? 💕",
	"What's the last lie you told?",
	"What's the weirdest dream you've ever had?",
	"If you had to marry someone in this group, who would it be? 💍",
	"What's the most childish thing you still do?",
	"What's the biggest fear you have? 😨",
	"Have you ever cheated on a test? What subject?",
	"What's the most embarrassing thing in your search history? 🔍",
	"If you could read one person's mind, whose would it be?",
	"What's your biggest regret?",
	"Have you ever pretended to like a gift you hated? 🎁",
	"What's the weirdest food combination you actually enjoy? 🍕",
	"Who do you have a secret crush on? 😳",
	"Have you ever ghosted someone? Why?",
	"What's the most trouble you've been in? 😬",
	"If you had 24 hours to live, what would you do? ⏰",
	"Have you ever said 'I love you' and didn't mean it?",
	"What's the pettiest reason you've ended a friendship?",
	"Have you ever stolen anything? What was it?",
	"What's the longest you've gone without showering? 🛁",
	"What's something you do when no one's watching? 👀",
	"Have you ever had a crush on a friend's partner?",
	"What's the most embarrassing song on your playlist? 🎵",
	"Have you ever blamed someone else for something you did?",
	"What's your most irrational fear?",
	"Have you ever been caught talking to yourself? 🗣️",
	"What's something you've never told your parents?",
];

const DARES = [
	"Send a voice note singing the chorus of your favorite song 🎤",
	"Type with your eyes closed for the next 2 minutes 👀",
	"Send the 10th photo from your gallery 📸",
	"Change your display name to 'I Love Bot OG' for 1 hour 😎",
	"Send a selfie with the most embarrassing face you can make 🤪",
	"Type a paragraph about why the person who dared you is awesome 🌟",
	"Speak only in emojis for the next 10 messages 😀😎",
	"Send a voice note impersonating your favorite celebrity 🎭",
	"Post your screen time screenshot 📱",
	"Change your bio to 'I just did a dare' for 1 day 📝",
	"Send the last 5 people you texted their names (or nicknames) 💬",
	"Make a poem about the person who just dared you ✍️",
	"Record a video doing 10 jumping jacks 🏃",
	"Send a screenshot of your last Google search 🤫",
	"Type 'I am the best' 50 times without stopping 😤",
	"Imitate a chicken for 30 seconds in a voice note 🐔",
	"Text your crush 'Hi' right now 💀",
	"Send a message to the 3rd person in your chat list saying 'I miss you' 💔",
	"Post your last screenshot 📱",
	"Speak in third person for the next 5 messages 🗣️",
	"Make a song about the person above you in the group 🎵",
	"Change your WhatsApp status to 'I love dares' for 24 hours 📢",
	"Send a funny meme to the group 🖼️",
	"Reveal your screen time for the day 📊",
	"Type the entire alphabet backwards in one message 🔤",
	"Send a 10-second video of you dancing 💃",
	"Call someone in the group right now and say 'I love you' 📞",
	"Send a voice note saying 'I'm a potato' in 5 different accents 🥔",
	"Post your most-used emoji 10 times in a row 🔁",
	"Write a love letter to the bot and send it here 💌",
];

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;
	let sub = (args[0] || "tod").toLowerCase();

	if (command === "truth" || command === "dare") {
		sub = command;
	}

	if (sub === "help" || sub === "?") {
		return sendMessageWTyping(
			from,
			{
				text:
					`🎲 *Truth or Dare Commands:*\n\n` +
					`• \`${prefix}${command}\` or \`${prefix}tod\` — random truth or dare\n` +
					`• \`${prefix}truth\` — truth only\n` +
					`• \`${prefix}dare\` — dare only`,
			},
			{ quoted: msg }
		);
	}

	let mode;
	if (sub === "truth" || sub === "t") mode = "truth";
	else if (sub === "dare" || sub === "d") mode = "dare";
	else mode = Math.random() < 0.5 ? "truth" : "dare";

	const prompt = mode === "truth"
		? TRUTHS[Math.floor(Math.random() * TRUTHS.length)]
		: DARES[Math.floor(Math.random() * DARES.length)];

	const emoji = mode === "truth" ? "🤔" : "😈";
	const title = mode === "truth" ? "TRUTH" : "DARE";
	const colors = mode === "truth" ? "💭" : "🔥";

	const text = `${colors} *${title}* ${colors}\n\n${emoji} ${prompt}\n\n_${mode === "truth" ? "Be honest, no lying! 🤞" : "No excuses, do it! 💪"}_`;

	return sendMessageWTyping(from, { text }, { quoted: msg });
};

export default () => ({
	cmd: ["tod", "truthdare", "tor", "truth", "dare"],
	desc: "Truth or Dare — random prompts for fun",
	usage: "tod | truth | dare",
	handler,
});
