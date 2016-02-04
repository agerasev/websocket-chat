function print(pack) {
	var elem = document.createElement("div");
	elem.className = 'message';

	if(pack.type == 'send' || pack.type == 'broadcast') {
		var author = document.createElement("div");
		author.className = 'msg-author';
		author.innerText = author.textContent = pack.author.name + '(#' + pack.author.id + ')';
		elem.appendChild(author);

		var text = document.createElement("div");
		text.className = 'msg-text';
		text.innerText = text.textContent = pack.text;
		elem.appendChild(text);

	} else if(pack.type == 'set-name') {
		var text = document.createElement("div");
		text.className = 'msg-author';
		var idStr = '(#' + pack.author.id + ')';
		text.innerText = text.textContent = pack.author.name + idStr + ' was renamed to ' + pack.text + idStr;
		elem.appendChild(text);
	}

	var history = document.getElementById('history');
	history.insertBefore(elem, history.firstChild);
}

function send(websocket, pack) {
	websocket.send(JSON.stringify(pack));
}

function broadcast(websocket, text) {
	var pack = {
		type: "broadcast",
		text: text
	};
	send(websocket, pack);
}

function setName(websocket, newName) {
	var pack = {
		type: "set-name",
		text: newName
	};
	send(websocket, pack);
}

function ready() {

	// insert placeholder

	var placeholder = document.getElementById('placeholder');
	placeholder.style.minHeight = document.getElementById('control').offsetHeight + 'px';


	// assing listeners

	function setNameListener() {
		var input = document.getElementById('input-name');
		setName(websocket, input.value);
	}

	function sendListener() {
		var input = document.getElementById('input-message');
		broadcast(websocket, input.value);
		input.value = '';
	}

	var websocket = openWebSocket();

	websocket.onopen = function(event) {
		console.log('open');
	};

	websocket.onclose = function(event) { 
		console.log('close');
	};

	websocket.onmessage = function(event) {
		print(JSON.parse(event.data));
	};

	document.getElementById('button-set-name').onclick = setNameListener;
	document.getElementById('button-send').onclick = sendListener;

	$("#input-name").keyup(function(e) {
		if((e.keyCode || e.which) == 13) { // Enter keycode
			setNameListener();
		}
	});

	$("#input-message").keyup(function(e) {
		if((e.keyCode || e.which) == 13) { // Enter keycode
			sendListener();
		}
	});
}

$(document).ready(ready);