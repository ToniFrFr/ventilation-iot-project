'use strict';

import { authenticate_user, get_user_caps } from 'postgres';

class User {
	constructor(username) {
		this.username = username;
	}

	async authenticate(password) {
		try {
			return await authenticate_user(this.username, password);
		} catch(e) {
			console.error(e);
			return false;
		}
	}

	get capabilities() {
		return get_user_caps(this.username);
	}

}


