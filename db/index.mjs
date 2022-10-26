'use strict';

//@ts-check

import { Postgres } from './postgres.mjs';

export class Db {
	constructor(config) {
		this.config = config;
	}

	async connect() {
		this.db = new Postgres(this.config);
		await this.db.init();

	}

	getUsers() {
		try {
			return new Users(this.db.getUsersTable());
		} catch(e) {
			console.error(e);
			throw new Error("Did you forget to connect to the database?");
		}
	}

	getMeasurements() {
		try {
			return new Measurements(this.db.getMeasurementsTable());
		} catch(e) {
			console.error(e);
			throw new Error("Did you forget to connect to the database?");
		}
	}
}

class User {
	constructor(table, username) {
		this.table = table;
		this.username = username;
	}

	async authenticate(password) {
		try {
			return await this.table.authenticateUser(this.username, password);
		} catch(e) {
			console.error(e);
			return false;
		}
	}

	async getCapabilities() {
		this.table.getUserCaps(this.username);
	}

	async grantCapability(capability) {
		this.table.grantCap(this.username, capability);
	}
}

export class Measurement {
	constructor(msg) {
		this.nr = msg.nr;
		this.datetime = msg.datetime === undefined ? new Date() : msg.datetime;
		this.pressure = msg.pressure;
		this.co2 = msg.co2;
		this.temp = msg.temp;
		this.rh = msg.rh;
		this.speed = msg.speed;
		this.auto = msg.auto;
	}
}

class Users {
	constructor(table) {
		this.table = table;
	}

	async createUser(username, password) {
		await this.table.createUser(username, password);
		return new User(this, username);
	}

	async getUser(username) {
		return new User(this, username);
	}
}

class Measurements {
	constructor(table) {
		this.table = table;
		this.epoch = table.epoch;
	}

	async* getSamples(epoch, nr_low, nr_high) {
		for await (let sample of this.table.getSamplesByNr(epoch, nr_low, nr_high)) {
			yield new Measurement(sample);
		}
	}

	async* getSamplesByTime(time_low, time_high) {
		for await (let sample of this.table.getSamplesByTime(time_low, time_high)) {
			yield new Measurement(sample);
		}
	}

	async submit(sample) {
		await this.table.saveSample(sample);
	}
}

