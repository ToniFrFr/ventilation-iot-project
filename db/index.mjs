'use strict';

import { Postgres } from './postgres.mjs';

const db = await Postgres.getDb();

class User {
	constructor(username) {
		this.username = username;
	}

	async authenticate(password) {
		try {
			return await db.authenticate_user(this.username, password);
		} catch(e) {
			console.error(e);
			return false;
		}
	}

	get capabilities() {
		return db.get_user_caps(this.username);
	}

	async grant_capability(capability) {
		await db.grant_cap(this.username, capability);
	}
}

