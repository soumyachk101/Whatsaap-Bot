const handler = async (sock, msg, from, args, msgInfoObj) => {
	const codeReceived = args.join(" ");
	const { sendMessageWTyping, isOwner } = msgInfoObj;

	if (!isOwner) {
		return sendMessageWTyping(from, { text: "❌ *This command is restricted to the bot owner only.*" }, { quoted: msg });
	}

	if (!codeReceived.trim()) {
		return sendMessageWTyping(from, { text: "❌ *Provide code to execute.*" }, { quoted: msg });
	}

	try {
		let consoleOutput = "";
		const captureConsoleLog = (message) => {
			consoleOutput += message + "\n";
		};
		const consoleLogProxy = new Proxy(console.log, {
			apply: (target, thisArg, argumentsList) => {
				captureConsoleLog(argumentsList.join(" "));
				Reflect.apply(target, thisArg, argumentsList);
			},
		});
		const sandbox = { console: { log: consoleLogProxy } };

		const result = await evalInContext(codeReceived, sandbox);

		const resultText = typeof result === "string" ? result : JSON.stringify(result);

		sendMessageWTyping(from, { text: `Console Output:\n${consoleOutput}\nResult: ${resultText}` }, { quoted: msg });
	} catch (err) {
		console.log(err);
		sendMessageWTyping(from, { text: `❌ Error: ${err.toString()}` }, { quoted: msg });
	}
};

const evalInContext = async (code, context) => {
	const { default: vm } = await import("node:vm");
	const sandbox = { ...context };
	const script = new vm.Script(code);
	const result = script.runInNewContext(sandbox);
	return result;
};

export default () => ({
	cmd: ["exec", "execute"],
	desc: "Execute code",
	usage: "exec <code>",
	handler,
});
