var mongodbUrl = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGODB_URL;

var mongodb = require('mongodb');
var assert = require('assert');
var db = null;
mongodb.MongoClient.connect(mongodbUrl + 'test', function(err, mdb) {
	assert.equal(null, err);
	console.log("[info] db: mongodb connected");
	db = mdb;
	
	// Add chat collection
	db.createCollection('chat', function(err, coll) {
		if(err) {
			console.err('[error] db: create "chat" collection: ' + err);
		} else {
			console.log('[info] db: "chat" collection created or already exists');
			coll.findOne({"name": "messages"}, function(err, elem) {
				if(err) {
					console.err('[error] db: nextObject: ' + err);
				} else if(elem) {
					console.log('[info] db: collection "messages" already exists');
				} else {
					coll.insert({name:"messages", messages:[]});
					console.log('[info] db: collection "messages" created');
				}
			});
		}
	});
});

var NAME_MAXLEN = 0x10;
var MESSAGE_MAXLEN = 0x100;
var HISTORY_COUNT = 0x10;

var clients = [null];

function addClient(client) {
	for(var i = 1; i < clients.length; ++i) {
		if(!clients[i]) {
			clients[i] = client;
			return i;
		}
	}
	var l = clients.length;
	clients.length++;
	clients[l] = client;
	return l;
}

function removeClient(id) {
	clients[id] = null;
}

function broadcast(pack) {
	for(var i = 1; i < clients.length; ++i) {
		var client = clients[i];
		if(client) {
			client.send(pack);
		}
	}
}

function Client(websocket) {

	var self = this;

	self.name = 'Anonymous';

	self.websocket = websocket;
	self.send = function (pack) {
		self.websocket.send(JSON.stringify(pack));
	}

	self.open = function() {
		self.id = addClient(self);
		var pack = {
			author: {
				id: 0,
				name: 'Server'
			},
			type: 'send',
			text: 'Welcome! Your ID is #' + self.id
		};
		self.send(pack);
		console.log('open ' + self.id);

		// send history from database
		db.collection('chat').findOne(
			{name: 'messages'},
			{messages: { $slice: -HISTORY_COUNT}},
			function (err, elem) {
				if(err) {
					console.error('[error] find last messages: ' + e);
				} else if(elem) {
					var arr = elem.messages;
					for(var i = arr.length - 1; i >= 0; --i) {
						self.send( {
							type: 'history',
							author: arr[i].name,
							text: arr[i].text
						});
					}
				} else {
					console.error('[error] find "chat" collection');
				}
			}
			);
	}

	self.close = function(code, message) {
		removeClient(self.id);
		console.log('close: ' + code + ' ' + message);
	}

	self.receive = function(message, flags) {
		var pack = undefined;
		try {
			pack = JSON.parse(message);
		} catch(e) {
			console.error('[error] JSON.parse: ' + e);
		}

		if(pack != undefined) {
			if(pack.type == 'set-name') {
				if(self.name != pack.text && pack.text.length > 0) {
					var name = pack.text.substr(0, NAME_MAXLEN);
					var outPack = {
						author: {
							id: self.id,
							name: self.name
						},
						type: 'set-name',
						text: name
					};
					broadcast(outPack);
					self.name = name;
				}
			} else if(pack.type == 'broadcast') {
				if(pack.text.length > 0) {
					var text = pack.text.substr(0, MESSAGE_MAXLEN);
					var outPack = {
						author: {
							id: self.id,
							name: self.name
						},
						type: 'broadcast',
						text: text
					};
					broadcast(outPack);

					// add to database
					db.collection('chat').updateOne(
						{name:'messages'}, 
						{$push: { messages: {
							name: self.name,
							text: text
						}}}
						);
				}
			} else {
				console.error('unknown type ' + pack.type);
			}
		}
		
		if(flags.binary) {
			console.log('receive binary data');
		} else {
			console.log('receive: ' + message);
		}
	}

	self.error = function(error) {
		console.log('error: ' + error);
	}
}

module.exports.WebSocketHandle = Client;