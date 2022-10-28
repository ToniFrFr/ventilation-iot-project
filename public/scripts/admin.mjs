'use strict';
// @ts-check
import { displayError, clearLoading } from './common.mjs';

let button = document.getElementById('btn_history');
let button_all = document.getElementById('btn_history_all');
let historyContainer = document.getElementById('history_container');

let client = new WebSocket('@URL@');

client.onmessage = (input) => {
	const msg = JSON.parse(input.data);
	const code = msg.code;

	if(code === "DB_RESPONSE") {
		clearLoading()
		let results = msg.events;
		for (let item of historyContainer.children) {
			item.remove();
		}
		for (let item of results) {
			let time = new Date(item.datetime);
			let username = item.username;
			let log = item.message;
			let row = document.createElement('tr');
			let timeCell = document.createElement('td');
			let userCell = document.createElement('td');
			let logCell = document.createElement('td');
			timeCell.textContent = time.toLocaleString();
			userCell.textContent = username;
			logCell.textContent = log;
			row.appendChild(timeCell);
			row.appendChild(userCell);
			row.appendChild(logCell);

			historyContainer.appendChild(row);
		}
	} else if(code === "CLIENT_ACK") {
		clearLoading();
	} else if(code === "CLIENT_ERROR") {
		displayError(msg.message);
		clearLoading();
	} else {
		console.error(`Unrecognized message code ${code}`);
	}
}

function fetch_events(username) {
	client.send(JSON.stringify({
		code: "EVENT_LOG",
		username: username
	}));
}

let setMqttBtn = document.getElementById("set_broker");
setMqttBtn.addEventListener("click", async (input) => {
	setMqttBtn.classList.add('button--loading');
	let url = document.getElementById("new_broker").value;
	client.send(JSON.stringify({
		code: "MQTT_BROKER",
		url: url
	}));
});

let createBtn = document.getElementById("create_user");
createBtn.addEventListener("click", async (input) => {
	let username = document.getElementById("new_username").value;
	let password = document.getElementById("new_password").value;
	client.send(JSON.stringify({
		code: "CREATE_USER",
		username: username,
		password: password
	}));
});

button_all.addEventListener("click", async (input) => {
    input.preventDefault();
	button_all.classList.add('button--loading');
	fetch_events(null);
});

button.addEventListener("click", async (input) => {
	input.preventDefault();
	button.classList.add('button--loading');

    let selectedUser = document.getElementById('user_selection').value;
    if (selectedUser == "") {
        // Selection empty -> Show history for all users
        console.log('Showing history for all users');
		fetch_events(null);
    } else {
        // Show history for selected user
        console.log('Showing history for ' + selectedUser);
		fetch_events(selectedUser);
    }
});

