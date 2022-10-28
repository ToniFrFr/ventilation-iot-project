let button = document.getElementById('btn_history');
let button_all = document.getElementById('btn_history_all');
let historyContainer = document.getElementById('history_container');

function displayError(msg) {
	let errors = document.getElementById('errors');
	let max = 0;
	for (let error of errors.children) {
		let n = error.id.split(" ")[1];
		if (n > max) {
			max = n;
		}
	}
	let box = document.createElement('div');
	let text = document.createElement('p');
	let bold = document.createElement('b');
	let button = document.createElement('button');
	box.id = `error ${max + 1}`;
	box.classList.add('error_box');
	bold.textContent = `Error: ${msg}`;
	button.onclick = () => { document.getElementById(box.id).remove(); };
	button.textContent = 'Dismiss';
	text.appendChild(bold);
	box.appendChild(text);
	box.appendChild(button);
	errors.appendChild(box);
}

function clearLoading() {
	let buttons = document.getElementsByClassName("button--loading");
	for (let i = 0; i < buttons.length; i++) {
		if(buttons[i].classList.contains('button--loading')) {
			buttons[i].classList.remove('button--loading');
		}
	}
}

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
			timeCell = document.createElement('td');
			userCell = document.createElement('td');
			logCell = document.createElement('td');
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
	} else if(code === "CLIENT_ERR") {
		displayError(recMsq.message);
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

