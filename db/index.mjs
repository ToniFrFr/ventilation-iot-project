'use strict';

//@ts-check

import { Postgres } from './postgres.mjs';

const db = await Postgres.getDb();

export class User {
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

export class Measurement {
	constructor(msg) {
		this.nr = msg.nr;
		this.datetime = msg.datetime;
		this.pressure = msg.pressure;
		this.co2 = msg.co2;
		this.temperature = msg.temperature;
		this.rh = msg.rh;
		this.speed = msg.speed;
		this.auto = msg.auto;
	}

	static async* get_samples(nr_low, nr_high) {
		for await (let sample of db.get_samples(nr_low, nr_high)) {
			yield new Measurement(sample);
		}
	}

	async submit() {
		await db.save_sample(this);
	}
}

