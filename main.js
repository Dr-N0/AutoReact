require('dotenv').config();


console.log("Start")
const { WebClient } = require('@slack/web-api');
// An access token (from your Slack app or custom integration - xoxp, xoxb)
const token = process.env.SLACK_BOT_TOKEN;
const web = new WebClient(token);
// Initialize using signing secret from environment variables
const { createEventAdapter } = require('@slack/events-api');
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
const port = process.env.PORT || 5000;

// Attach listeners to events by Slack Event "type"
slackEvents.on("message", (event) => {
	console.log(event);
	web.reactions.add({channel: event.channel, name: "thumbsup", timestamp: event.ts}).catch(console.error);
});

// Handle errors (see `errorCodes` export)
slackEvents.on('error', console.error);

// Start a basic HTTP server
slackEvents.start(port).then(() => {
	// Listening on path '/slack/events' by default
	console.log(`server listening on port ${port}`);
});
