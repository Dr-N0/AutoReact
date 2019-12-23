// Author: Beckett Jenen (Dr-N0)

// NODE MODULES
require('dotenv').config();
const express = require('express');
const app = express();
var bodyParser = require('body-parser');
var mongo = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var url = process.env.DB_URL;

const { WebClient } = require('@slack/web-api');
const token = process.env.SLACK_BOT_TOKEN; // An access token (from your Slack app or custom integration - xoxp, xoxb)
const web = new WebClient(token);
const { createEventAdapter } = require('@slack/events-api');

// CONFIGURATION FOR MODULES
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET); // Initialize using signing secret from environment variables
const port = process.env.PORT || 5000;

console.log("Start...");
setUserVariables();

// GLOBALS
var re;

// FUNCTIONS
function createReact(username, reaction){
	try {
		var MongoClient = require('mongodb').MongoClient;
		var url = process.env.DB_URL;
		MongoClient.connect(url, function(err, db) {
			if (err) throw err;
			var dbo = db.db("autoreactdb");
			var object = { user: username, reac: reaction};
			dbo.collection("reactions").insertOne(object, function(err, res) {
				if (err) throw err;
				console.log("Reaction added!");
				db.close();
			});
		});
	}
	catch(err) {
		console.log(err.message);
	}
}

function setUserVariables(){
	try{
		MongoClient.connect(url, function(err, db) {
			if (err) throw err;
			var dbo = db.db("autoreactdb");
			dbo.collection("reactions").find({}).toArray(function(err, result) {
				if (err) throw err;		
				re = result;
				db.close();
			});
		});
	}
	catch(err) {
		console.log(err.message);
	}
}

// ROUTES
app.post('/add', (req, res) => {
	let text = req.body.text;
	var comTokens = text.split(" ");
	if (comTokens[0][1] == "@" && comTokens[1][0] == ":" && comTokens[1].lastIndexOf(":") != 0) {
		u = comTokens[0].split(/[@|]/);
		r = comTokens[1].split(/[::]/);
		console.log(u[1])
		console.log(r[1])
		createReact(u[1], r[1]);
		setUserVariables();
	}else{
		res.send("Syntax Error: The command you entered was incorrect");
	}
	res.send(text);
});

app.post('/remove', (req, res) => {
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

// SLACK EVENTS API
slackEvents.on("message", (event) => {
	if (event.subtype != "bot_message") {
		// web.chat.postMessage({channel: event.channel, text: event.user}).catch(console.error);
	}
	console.log(event);
	console.log(re);
	
	for (var j = 0; j < re.length; j++) {
		if (event.user == re[j].user) {
			web.reactions.add(
			{
				channel: event.channel, 
				name: re[j].reac, 
				timestamp: event.ts
			}).catch(console.error);
		}
	}
});

// Handle errors (see `errorCodes` export)
slackEvents.on('error', console.error);

// Start a basic HTTP server
slackEvents.start(port).then(() => {
	// Listening on path '/slack/events' by default
	console.log(`Events port = ${port}`);
});