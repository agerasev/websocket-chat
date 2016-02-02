var clients = {};
var idCounter = 0;

function Client(websocket) {
	var self = this;
	this.websocket = websocket;
	this.open = function() {
		clients[self.id = ++idCounter] = self;
		this.websocket.send('#0: Welcome! Your ID is #' + self.id);
		console.log('open ' + self.id);
	}
	this.close = function(code, message) {
		delete clients[self.id];
		console.log('close: ' + code + ' ' + message);
	}
	this.receive = function(message, flags) {
		for(id in clients) {
			clients[id].websocket.send('#' + self.id + ': ' + message);
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