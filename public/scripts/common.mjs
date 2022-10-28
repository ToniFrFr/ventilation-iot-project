export function displayError(msg) {
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

export function clearLoading() {
	let buttons = document.getElementsByClassName("button--loading");
	for (let i = 0; i < buttons.length; i++) {
		if(buttons[i].classList.contains('button--loading')) {
			buttons[i].classList.remove('button--loading');
		}
	}
}

