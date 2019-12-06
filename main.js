require('dotenv').config();
const express = require('express');
const app = express();
// app.use(express.json());
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

console.log("Start");
const { WebClient } = require('@slack/web-api');
// An access token (from your Slack app or custom integration - xoxp, xoxb)
const token = process.env.SLACK_BOT_TOKEN;
const web = new WebClient(token);
// Initialize using signing secret from environment variables
const { createEventAdapter } = require('@slack/events-api');
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
const port = process.env.PORT || 5000;

app.post('/add', (req, res) => {
	let text = req.body.text;
	var comTokens = text.split(" ");
	if (comTokens[0][1] == "@") {
		console.log(comTokens);
	}
	res.send(text);
});

app.listen(3000, () => {
	console.log(`Slash port = 3000`)
});

// Attach listeners to events by Slack Event "type"
slackEvents.on("message", (event) => {
	console.log(event);
	// web.chat.postMessage({channel: event.channel, text: "f in chat bois"}).catch(console.error);
	web.reactions.add({channel: event.channel, name: "guin", timestamp: event.ts}).catch(console.error);
});

// Handle errors (see `errorCodes` export)
slackEvents.on('error', console.error);

// Start a basic HTTP server
slackEvents.start(port).then(() => {
	// Listening on path '/slack/events' by default
	console.log(`Events port = ${port}`);
});