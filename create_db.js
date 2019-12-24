var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/autoreactdb";

MongoClient.connect(url, { useUnifiedTopology: true }, function(err, db) {
	if (err) throw err;
	console.log("Database created!");
	var dbo = db.db("autoreactdb");
	url = "mongodb://localhost:27017/";
	dbo.createCollection("reactions", function(err, res) {
		if (err) throw err;
		console.log("Collection created!");
		db.close();
	});
	dbo.collection("reactions").createIndex( { user: 1, reac: 1 }, { unique: true } );
});


// ➜ mongo
// use dbName;
// db.dropDatabase();
// exit