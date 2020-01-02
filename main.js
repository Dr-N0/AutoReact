// Author: Beckett Jenen (Dr-N0)

// NODE MODULES
require("dotenv").config();
const express = require("express");
const app = express();
var bodyParser = require("body-parser");
var mongo = require("mongodb");
var MongoClient = require("mongodb").MongoClient;
var url = process.env.DB_URL;

const { WebClient } = require("@slack/web-api");
const token = process.env.SLACK_BOT_TOKEN;
// An access token
const web = new WebClient(token);
const { createEventAdapter } = require("@slack/events-api");

// CONFIGURATION FOR MODULES
app.use(bodyParser.json());
// support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
// support encoded bodies
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
// Initialize using signing secret from environment variables
const port = process.env.PORT || 5000;

// GLOBALS
var re;
var ulist = [];
var update = true;

// SETUP PROCESSES
console.log("Start...");
setUserVariables();

// FUNCTIONS
function createReact(username, reaction){
    try {
        MongoClient.connect(
            url,
            { useUnifiedTopology: true },
            function(err, db) {
            if (err){
                throw err;
            }
            var dbo = db.db("autoreactdb");
            var object = { user: username, reac: reaction };
            dbo.collection("reactions").insertOne(object, function(err, res) {
                if (err){
                    console.log("\nInsert error (most likely a duplicate)\n");
                    console.log(err);
                    db.close();
                }else{
                    if (ulist.length != 0) {
                        ulist.push(username);
                    }
                    console.log("Reaction added!");
                    db.close();
                }
            });
        });
    }
    catch(err) {
        console.log(err.message);
    }
}

function deleteReact(username, reaction){
    try {
        MongoClient.connect(
            url,
            { useUnifiedTopology: true },
            function(err, db) {
            if (err){
                throw err;
            }
            var dbo = db.db("autoreactdb");
            var object1 = { user: username, reac: reaction };
            dbo.collection("reactions").deleteOne(object1, function(err, obj) {
                if (err){
                    throw err;
                }
                if (ulist.length != 0 && obj.deletedCount != 0) {
                    var index = ulist.indexOf(username);
                    if (index !== -1) {
                        ulist.splice(index, 1);
                    }
                }
                console.log("Reaction deleted!");
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
        MongoClient.connect(
            url,
            { useUnifiedTopology: true },
            function(err, db) {
            if (err){
                throw err;
            }
            var dbo = db.db("autoreactdb");
            dbo.collection("reactions").find({}).toArray(function(err, result) {
                if (err){
                    throw err;
                }
                re = result;
                if (ulist.length == 0) {
                    for(var j = 0; j < re.length; j++){
                        ulist.push(re[j].user)
                    }
                }
                db.close();
            });
        });
    }
    catch(err) {
        console.log(err.message);
    }
}
// username, reaction
function chatCommunication(text, username, a, b, option){
	if (option == "add") {
		attachments_json = [
	        {
	            "text": b,
	            "fallback": "You are unable to post this to Jumpstart",
	            "callback_id": "send_to_auto_react",
	            "color": "#800080",
	            "attachment_type": "default",
	            "actions": [
	                {
	                    "name": "yes_a_ar",
	                    "text": "Yes",
	                    "style": "primary",
	                    "type": "button",
	                    "value": a+"~"+b
	                },
	                {
	                    "name": "no_a_ar",
	                    "text": "No",
	                    "style": "danger",
	                    "type": "button",
	                    "value": "no"
	                }
	            ]
	        }
	    ]
    	web.chat.postMessage({channel: username, text: "<@" + username + "> wants to add :" + b + ": to your name.\nDisclaimer: This emote will be reacted on every message you post.\nDo you want this emote to be added?", attachments: attachments_json}).catch(console.error);
	}else if(option == "delete"){
		attachments_json = [
	        {
	            "text": b,
	            "fallback": "You are unable to delete this emote",
	            "callback_id": "send_to_auto_react",
	            "color": "#800080",
	            "attachment_type": "default",
	            "actions": [
	                {
	                    "name": "yes_d_ar",
	                    "text": "Yes",
	                    "style": "primary",
	                    "type": "button",
	                    "value": a+"~"+b
	                },
	                {
	                    "name": "no_d_ar",
	                    "text": "No",
	                    "style": "danger",
	                    "type": "button",
	                    "value": "no"
	                }
	            ]
	        }
	    ]
    	web.chat.postMessage({channel: username, text: "<@" + username + "> wants to delete :" + b + ": from your name.\nDisclaimer: This emote will no longer be reacted on every message you post.\nDo you want this emote to be deleted?", attachments: attachments_json}).catch(console.error);
	}
}

// ROUTES
app.post("/add", (req, res) => {
    let text = req.body.text;
    let info = req.body.user_id;
    var comTokens = text.split(" ");
    if (comTokens[0][1] == "@"
        && comTokens[1][0] == ":"
        && comTokens[1].lastIndexOf(":") != 0) {
        var u = comTokens[0].split(/[@|]/);
        var r = comTokens[1].split(/[::]/);
        console.log(u[1]);
        console.log(r[1]);
        chatCommunication(text, info, u[1], r[1], "add");
    }else{
        res.send("Syntax Error: The command you entered was incorrect");
    }
    res.send("( "+ text + " )");
});

app.post("/delete", (req, res) => {
    let text = req.body.text;
    let info = req.body.user_id;
    var comTokens = text.split(" ");
    if (comTokens[0][1] == "@"
        && comTokens[1][0] == ":"
        && comTokens[1].lastIndexOf(":") != 0) {
        var u = comTokens[0].split(/[@|]/);
        var r = comTokens[1].split(/[::]/);
        if (info == u[1]) {
            console.log(u[1])
            console.log(r[1])
            chatCommunication(text, info, u[1], r[1], "delete");
        }else{
            res.send("You are not authorized to send that command!");
        }
    }else{
        res.send("Syntax Error: The command you entered was incorrect");
    }
    res.send("( "+ text + " )");
});

app.post("/interactivity", (req, res) => {
	var reqParse = JSON.parse(req.body.payload).actions[0];
	var reqParseValue = reqParse.value.split("~");
	var reqName = reqParse.name;
	var reqU = reqParseValue[0];
	var reqR = reqParseValue[1];
    console.log(reqParse);
    console.log(reqU);
    console.log(reqR);
    if (reqName == "yes_a_ar") {
    	createReact(reqU, reqR);
        setUserVariables();
    }else if(reqName == "yes_d_ar"){
    	deleteReact(reqU, reqR);
        setUserVariables();
    }else{
    	res.send("No U");
    }
    res.send("Route Finished");
});

app.listen(3000, () => {
    console.log(`Slash port = 3000`)
});

// SLACK EVENTS API
slackEvents.on("message", (event) => {
    console.log(event);
    console.log(re);
    console.log(ulist);

    for (var j = 0; j < re.length; j++) {
        if (event.user == ulist[j]) {
            if (update == true) {
                setUserVariables();
                update = false;
            }
            web.reactions.add(
            {
                channel: event.channel,
                name: re[j].reac,
                timestamp: event.ts
            }).catch(console.error);
        }
    }

    update = true;
});

// Handle errors (see `errorCodes` export)
slackEvents.on("error", console.error);

// Start a basic HTTP server
slackEvents.start(port).then(() => {
    // Listening on path '/slack/events' by default
    console.log(`Events port = ${port}`);
});