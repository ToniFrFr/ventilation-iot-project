'use strict';

// @ts-check

import { connect } from 'mqtt';
import { Measurement } from './db/index.mjs';

export class MQTT {
	constructor(db, websockets, url) {
		this.configure(url);
		this.db = db;
		this.websockets = websockets;
	}

	configure(url) {
		this.url = url;
		this.client = connect(url);
		this.client.on('connect', () => {
			console.log("MQTT: Connected");
			this.client.subscribe('controller/status', err => {
				console.log("MQTT: Subscribed to controller/status");
				if(err) {
					// throw err;
					// Don't throw, we want to keep the server up
					console.error(err);
				}
			});
		});
		this.client.on('message', async (topic, message) => {
			// All received message should have topic 'controller/status'
			if(topic === 'controller/status') {
				try {
					let msg = JSON.parse(message);
					// Sending measurements to DB
					msg.datetime = new Date();
					let measurement = new Measurement(msg);
					let table = this.db.getMeasurements();
					await table.submit(measurement);
					msg.code = "MQTT_UPDATE";

					// Send received MQTT message to all connected WebSockets.
					this.websockets.forEach((socket, _user) => socket.sent(JSON.stringify(msg)));
				} catch(e) {
					let payload = {
						code: "CLIENT_ERROR",
						message: "Could not parse status message"
					}
					this.websockets.forEach((socket, _user) => socket.sent(JSON.stringify(payload)));
				}
			} else {
				// Discard messages if topic is incorrect
				console.log("Incorrect topic in message.");
			}
		});
	}

	async pushSettings(username, message) {
		let users = this.db.getUsers();
		let user = await users.getUser(username);
		let table = this.db.getEvents();
		if(await user.hasCapability("settings")) {
			this.client.publish('controller/settings', message);
			await table.log(username, `Changed controller settings`);
		}
	}
}

