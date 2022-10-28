'use strict';

// @ts-check

import express from 'express';
import dotenv from 'dotenv';
import { connect } from 'mqtt';
import ejs from 'ejs';
import path from 'path';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import https from 'https';
import http from 'http';
import systemd from 'systemd';
import { Db, Measurement } from './db/index.mjs';
import { getSession } from './auth.mjs';
import { authRouter, createHasCapability, isAuthenticated } from './routes/auth.mjs';
import { ValidationError, DatabaseError } from './error.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.LISTEN_PID > 0 ? 'systemd' : (process.env.PORT | 3000);
const TLS = ('SERVER_CRT' in process.env && 'SERVER_KEY' in process.env);
const DOMAIN = process.env.DOMAIN || "localhost";

const app = express();
app.set('view engine', 'ejs');

app.get("/:script", (req, res, next) => {
	if(req.params.script === 'main.js' || req.params.script === 'admin.js') {
		readFile(path.join(__dirname, 'public', 'scripts', req.params.script), { encoding: "UTF-8" })
			.then(contents => {
				let url = DOMAIN;
				if(PORT !== 'systemd') {
					url = url + ":" + PORT;
				}
				if(TLS) {
					url = "wss://" + url;
				} else {
					url = "ws://" + url;
				}
				let data = contents.replaceAll('@URL@', url);
				res.send(data);
			}).catch(_ => {
				console.error(`Error: can't find script ${req.params.script}.`)
				res.sendStatus(404);
			});
	} else {
		next('route');
	}
});

app.use(express.static(__dirname + '/public/css'));

const dbConfig = {
    database: process.env.NODE_ENV === 'production' ? 'iotproject' : 'iotdev',
    host: process.env.PGHOST, // This is technically redundant, the library checks environment for PGHOST itself
    user: 'iotapi',
    ssl: {
        rejectUnauthorized: false,
    }
};

const db = new Db(dbConfig);
await db.connect();

const hasAdmin = createHasCapability(db, "admin");

const session = getSession(db, TLS);
app.use(session);
app.use('/auth', authRouter(db, session));

var server;
if('SERVER_CRT' in process.env && 'SERVER_KEY' in process.env) {
	server = https
		.createServer({
			cert: readFileSync(process.env.SERVER_CRT),
			key: readFileSync(process.env.SERVER_KEY)
		},
		app)
} else {
	server = http.createServer(app);
}

const websockets = new Map();

// WebSockets configuration for server-client communication
const wss = new WebSocketServer({ clientTracking: false, noServer: true });

server.on('upgrade', function (request, socket, head) {
	session(request, {}, () => {
		if (!request.session.user) {
			socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
			socket.destroy();
			return;
		}
		wss.handleUpgrade(request, socket, head, function (ws) {
			wss.emit('connection', ws, request);
		});
	});
});

// Clients
wss.on('connection', (socket, request) => {
	const user = request.session.user;
	websockets.set(user, socket);

    // Server-side receives a message from client
    socket.on('message', async (msg) => {
        let recMsg = JSON.parse(msg);
		let payload;
		let events = db.getEvents();

        // Received message is a request to database for measurements
        if (recMsg.code == "DB_REQUEST") {
			console.log("Sending DB_RESPONSE");
			try {
				// Selection = temperature, relative humidity, co2, pressure
				let selection = recMsg.selection;
				let beginning, end;
				if(recMsg.start === null) {
					throw new ValidationError("Start date is invalid");
				}
				if(recMsg.end === null) {
					throw new ValidationError("End date is invalid");
				}
				try { beginning = new Date(recMsg.start); }
				catch(e) { throw new ValidationError("Start date is invalid"); }
				try { end = new Date(recMsg.end); }
				catch(e) { throw new ValidationError("End date is invalid"); }

				let samples;
				try {
					let table = db.getMeasurements();
					samples = table.getSamplesByTime(beginning, end);
				} catch(e) {
					throw new DatabaseError("Could not fetch requested data from database");
				}
				let sampleList = [];

				for await (let sample of samples) {
					sampleList.push(sample);
				}

				payload = {
					code: "DB_RESPONSE",
					selection: selection,
					data: sampleList
				};
			} catch(e) {
				let message;
				if(e.name === "ValidationError") {
					message = e.message;
					console.error(`Error: invalid request from user: ${e.message}`);
				} else if(e.name === "DatabaseError") {
					message = e.message;
					console.error(`Error: could not read requested data from the database`);
				} else {
					message = "Unknown error has occured"
					console.error(e);
				}
				payload = {
					code: "CLIENT_ERROR",
					message: message,
				};
			}
        }

        // Received message is a request to database for event logs
        if (recMsg.code == "EVENT_LOG") {
			console.log("Sending DB_RESPONSE");
			try {
				let username = recMsg.username;
				let table = db.getUsers();
				// null means request all
				if(username !== null) {
					// This tests whether user exists
					await table.getUser(username);
				}

				let eventList;
				try {
					if (username) {
						eventList = events.getEventsByUser(username);
					} else {
						eventList = events.getEvents();
					}
				} catch(e) {
					throw new DatabaseError("Could not fetch requested data from database");
				}

				let responseList = [];
				for await (let e of eventList) {
					responseList.push(e);
				}

				payload = {
					code: "DB_RESPONSE",
					events: responseList
				};
			} catch(e) {
				let message;
				if(e.name === "DatabaseError") {
					message = e.message;
					console.error(`Error: could not read requested data from the database`);
				} else {
					message = "Unknown error has occured"
					console.error(e);
				}
				payload = {
					code: "CLIENT_ERROR",
					message: message,
				};
			}
        }

		if (recMsg.code == "CREATE_USER") {
			try {
				let table = db.getUsers();
				let admin = await table.getUser(user);
				if(admin.hasCapability("admin")) {
					await table.createUser(recMsg.username, recMsg.password);
					payload = {
						code: "CLIENT_ACK"
					};
				}
				payload = {
					code: "CLIENT_ERROR",
					message: "Not permitted to create accounts"
				};
			} catch(e) {
				payload = {
					code: "CLIENT_ERROR",
					message: "Could not create account",
				};
			}
		}

		// Recieved message is a request to list users
        // Received message is a MQTT to be sent to controller
        if (recMsg.code == "MQTT_SEND") {
			try {
				let mqtt_payload = {
					auto: recMsg.auto === "true"
				};
				if (mqtt_payload.auto) {
					mqtt_payload.pressure = parseFloat(recMsg.pressure);
				} else {
					mqtt_payload.speed = parseFloat(recMsg.speed);
				}
				try {
					mqttClient.publish(`controller/settings`, JSON.stringify(mqtt_payload));
					payload = {
						code: "CLIENT_ACK"
					};
				} catch(e) {
					payload = {
						code: "CLIENT_ERROR",
						message: "Could not send message to MQTT broker"
					};
				}
			} catch(e) {
				payload = {
					code: "CLIENT_ERROR",
					message: "Received invalid MQTT settings message"
				};
			}
		}

		try {
			socket.send(JSON.stringify(payload));
		} catch(e) {
			console.error(`Error: could not send through websockets: ${e}`);
		}
	});

    socket.on('close', () => {
        console.log('sockets / close');
		websockets.delete(user);
    });
})

// Simulator:
// const mqttClient = connect('mqtt://192.168.75.42:1883');
// Actual:
const mqttClient = connect('mqtt://192.168.1.254:1883')

// On successful connection, subscribe to topic 'controller/status'
mqttClient.on('connect', () => {
    console.log('MQTT: Connected')
    mqttClient.subscribe('controller/status', err => {
        console.log('MQTT: Subscribed to controller/status.');
        if (err) throw err;
    });
});

// Received MQTT message
mqttClient.on('message', async (topic, message) => {
    // All received messages should have topic 'controller/status'
    if (topic === 'controller/status') {
        console.log('index.js | mqttClient.on(), receiving MQTT from broker');
        let mqtt_message_parsed = JSON.parse(message);

        // Sending measurements to DB
        mqtt_message_parsed.datetime = new Date();
        let measurement = new Measurement(mqtt_message_parsed);
        let table = db.getMeasurements();
        await table.submit(measurement);
		console.log(mqtt_message_parsed);
		mqtt_message_parsed.code = "MQTT_UPDATE";

        // Send received MQTT message to all connected WebSockets.
        // This might not stay this way, possibly send to DB and fetch from there to WebSockets?
		websockets.forEach((socket, _user) => socket.send(JSON.stringify(mqtt_message_parsed)));
    }

    // Discard messages if topic is incorrect
    else {
        console.log('mqttClient.on() index.js, incorrect MQTT topic received');
    }
});

// Front page
app.get('/', isAuthenticated(), (_req, res) => {
    res.render('index');
});

// Login page redirect when logged in
app.get('/login', isAuthenticated("/"));

// Login page
app.get('/login', (req, res) => {
	if(req.query.error) {
		res.render('login', { error: true });
	} else {
		res.render('login', { error: false });
	}
});

// Activity history
app.get('/admin', hasAdmin, (_req, res) => {
    res.render('admin');
});

// For redirecting everything to the login page when unauthorized
app.get('*', (_req, res) => {
	res.redirect('/login');
});


if(DOMAIN) {
	server.listen(PORT, DOMAIN);
} else {
	console.error("Error: environment variable DOMAIN must be configured");
}

