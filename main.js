var mongodbUrl = process.env.OPENSHIFT_MONGODB_DB_URL || 'mongodb://localhost:27017/';

var mongodb = require('mongodb');
var assert = require('assert');
var db = null;
mongodb.MongoClient.connect(mongodbUrl + 'test', function(err, mdb) {
	assert.equal(null, err);
	console.log("[ info ] mongodb connected");
	db = mdb;
	db.createCollection('chat');
});

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
			send(client.websocket, pack);
		}
	}
}

function send(websocket, pack) {
	websocket.send(JSON.stringify(pack));
}

function Client(websocket) {

	var self = this;

	this.name = 'Anonymous';

	this.websocket = websocket;

	this.open = function() {
		self.id = addClient(self);
		var pack = {
			author: {
				id: 0,
				name: 'Server'
			},
			type: 'send',
			text: 'Welcome! Your ID is #' + self.id
		};
		send(self.websocket, pack);
		console.log('open ' + self.id);
	}

	this.close = function(code, message) {
		removeClient(self.id);
		console.log('close: ' + code + ' ' + message);
	}

	this.receive = function(message, flags) {
		var pack = undefined;
		try {
			pack = JSON.parse(message);
		} catch(e) {
			console.error('error JSON.parse: ' + e);
		}

		if(pack != undefined) {
			if(pack.type == 'set-name') {
				if(self.name != pack.text && pack.text.length > 0) {
					var outPack = {
						author: {
							id: self.id,
							name: self.name
						},
						type: 'set-name',
						text: pack.text
					};
					broadcast(outPack);
					self.name = pack.text;
				}
			} else if(pack.type == 'broadcast') {
				if(pack.text.length > 0) {
					var outPack = {
						author: {
							id: self.id,
							name: self.name
						},
						type: 'broadcast',
						text: pack.text
					};
					broadcast(outPack);
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

	this.error = function(error) {
		console.log('error: ' + error);
	}
}

module.exports.WebSocketHandle = Client;