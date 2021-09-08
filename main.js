// Author: Beckett Jenen (Dr-N0)
// NODE MODULES
if (process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}
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
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
app.use('/slack/events', slackEvents.requestListener());
app.use(bodyParser.json());
// support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
// Initialize using signing secret from environment variables
const port = process.env.PORT || 5000;

// GLOBALS
// Local representation of db
var re;
// Username list, makes it easier to check messages. Lowers N for the O(N)
var ulist = [];
var update = true;

// SETUP PROCESSES
console.log("Start...");
setUserVariables();

// FUNCTIONS
// Creates reaction in the database.
// The function takes in a username in the format (UJTPQPX51)
// and a reaction which is just text stripped from : : slack barriers.
function createReact(username, reaction){
    try {
        // Open db and pass args
        MongoClient.connect(
            url,
            { useUnifiedTopology: true },
            function(err, db) {
            // Handle errors from opening db
            if (err){
                throw err;
            }
            var dbo = db.db(process.env.URL);
            var object = { user: username, reac: reaction };
            // Add reaction to db
            dbo.collection("reactions").insertOne(object, function(err, res) {
            // A rule exists to prevent duplicate reactions per one username,
            // this error is hit if that rule is broken.
                if (err){
                    console.log("\nInsert error (most likely a duplicate)\n");
                    console.log(err);
                    db.close();
                }else{
                    // Update ulist
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

// Deletes reaction in the database.
// The function takes in a username in the format (UJTPQPX51)
// and a reaction which is just text stripped from : : slack barriers.
function deleteReact(username, reaction){
    try {
        // Open db and pass args
        MongoClient.connect(
            url,
            { useUnifiedTopology: true },
            function(err, db) {
            // Handle errors from opening db
            if (err){
                throw err;
            }
            var dbo = db.db(process.env.URL);
            var object1 = { user: username, reac: reaction };
            // Delete reaction from db
            dbo.collection("reactions").deleteOne(object1, function(err, obj) {
            // A rule exists to prevent duplicate reactions per one username,
            // this error is hit if that rule is broken.
                if (err){
                    throw err;
                }
                // Update ulist
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

// Sets/refreshes/updates variables.
// It grabs the current database list
// and sets the returned java object to a global object in the program.
// It also updates the ulist (some light dos protection) if it doesn't exist.
function setUserVariables(){
    try{
        // Open db and pass args
        MongoClient.connect(
            url,
            { useUnifiedTopology: true },
            function(err, db) {
            // Handle errors from opening db
            if (err){
                throw err;
            }
            var dbo = db.db(process.env.URL);
            // Find all reactions (protection if anything else is added)
            dbo.collection("reactions").find({}).toArray(function(err, result) {
                // Handle errors from going through db
                if (err){
                    throw err;
                }
                // Set current variable to updated db
                re = result;
                // Update ulist
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

// Sends the add or delete request.
// This is the function that sends interactive messages to the users dm.
// It also passes that information to the /interactivity route through the JSON.
function chatCommunication(a, b, option){
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
        // Send message to user
        web.chat.postMessage({
                channel: a,
                text: "<@" + a + "> wants to add :" + b + ": to your name.\nDisclaimer: This emote will be reacted on every message you post.\nDo you want this emote to be added?",
                attachments: attachments_json
            }).catch(console.error);
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
        // Send message to user
        web.chat.postMessage({
                channel: a,
                text: "<@" + a + "> wants to delete :" + b + ": from your name.\nDisclaimer: This emote will no longer be reacted on every message you post.\nDo you want this emote to be deleted?",
                attachments: attachments_json
            }).catch(console.error);
    }
}

// ROUTES
// Slash command "/add".
// When someone types /add this route will parse any arguments
// and send an add request to the specified user.
app.post("/add", (req, res) => {
    // Parsing
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
        // Sends request
        chatCommunication(u[1], r[1], "add");
    }else{
        res.send("Syntax Error: The command you entered was incorrect");
    }
    res.send("( "+ text + " )");
});

// Slash command "/delete".
// When someone types /delete this route will parse any arguments
// and send a delete request to the specified user.
app.post("/delete", (req, res) => {
    let text = req.body.text;
    let info = req.body.user_id;
    var comTokens = text.split(" ");
    if (comTokens[0][1] == "@"
        && comTokens[1][0] == ":"
        && comTokens[1].lastIndexOf(":") != 0) {
        var u = comTokens[0].split(/[@|]/);
        var r = comTokens[1].split(/[::]/);
// Delete request can only be created if it's on yourself.
        if (info == u[1]) {
            console.log(u[1])
            console.log(r[1])
            chatCommunication(u[1], r[1], "delete");
        }else{
            res.send("You are not authorized to send that command!");
        }
    }else{
        res.send("Syntax Error: The command you entered was incorrect");
    }
    res.send("( "+ text + " )");
});

// Interactivity API route.
// Takes the response from the function chatCommunication()
// and actually activates createReact/deleteReact.
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

app.listen(port, () => {
    console.log(`Slash port = 3000`)
});

// SLACK EVENTS API
// Handles all of the Slack Events API input.
// It also checks if the ulist contains the correct username of the message
// and distributes reactions accordingly.
slackEvents.on("message", (event) => {
    //  Update ulist
    if(ulist.includes(event.user)){
        if (update == true) {
            setUserVariables();
            update = false;
        }
    }
    
    // O(N) time, but ulist variable lowers the N on average.
    // Lowest complexity since the db needs to be checked though at least once.
    for (var j = 0; j < re.length; j++) {
        if (event.user == ulist[j]) {
//             const rollTheDice = Math.random() > 0.5;
//             if (rollTheDice) {
                
//             }
            web.reactions.add({
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
// slackEvents.start(port).then(() => {
//     // Listening on path '/slack/events' by default
//     console.log(`Events port = ${port}`);
// });
