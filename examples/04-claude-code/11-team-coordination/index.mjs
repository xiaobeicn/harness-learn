const tasks = [
	{ id: "1", subject: "Define API", status: "pending", owner: null, blockedBy: [] },
	{ id: "2", subject: "Implement client", status: "pending", owner: null, blockedBy: ["1"] },
];
const mailboxes = new Map();

function claim(taskId, agent) {
	const task = tasks.find(candidate => candidate.id === taskId);
	const unresolved = task.blockedBy.filter(id => tasks.find(candidate => candidate.id === id)?.status !== "completed");
	if (unresolved.length) return { ok: false, reason: `blocked by ${unresolved.join(",")}` };
	if (task.owner && task.owner !== agent) return { ok: false, reason: `owned by ${task.owner}` };
	task.owner = agent;
	task.status = "in_progress";
	return { ok: true };
}

function send(to, from, message) {
	const inbox = mailboxes.get(to) ?? [];
	inbox.push({ from, message, read: false });
	mailboxes.set(to, inbox);
}

console.log("claim task 2:", claim("2", "client-agent"));
console.log("claim task 1:", claim("1", "api-agent"));
tasks[0].status = "completed";
console.log("claim task 2 after unblock:", claim("2", "client-agent"));
send("team-lead", "client-agent", { type: "permission_request", tool: "Bash", command: "npm test" });
console.log(JSON.stringify({ tasks, leaderMailbox: mailboxes.get("team-lead") }, null, 2));
