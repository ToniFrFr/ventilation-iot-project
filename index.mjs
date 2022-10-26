'use strict';

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
import { controllerRouter } from './routes/controller.mjs';
import { Db, Measurement } from './db/index.mjs';
import { getSession } from './auth.mjs';
import { authRouter, isAuthenticated } from './routes/auth.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.set('view engine', 'ejs');

app.use('/controller', controllerRouter);

app.get("/:script", (req, res, next) => {
	if(req.params.script === 'brain.js' || req.params.script === 'grapher.js') {
		next();
	}
	next('route');
}, (req, res) => {
	readFile(path.join(__dirname, 'public', 'scripts', req.params.script), { encoding: "UTF-8" })
		.then(contents => {
			console.log(process.env.DOMAIN || "localhost");
			let data = contents.replaceAll('@DOMAIN@', process.env.DOMAIN || "localhost");
			res.send(data);
		}).catch(_ => {
			console.error(`Error: can't find script ${req.params.script}.`)
			res.sendStatus(404);
		});
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

const session = getSession(db);
app.use(session);
app.use('/auth', authRouter(db, session));

var server;
if('SERVER_CRT'in process.env && 'SERVER_KEY' in process.env) {
	server = https
		.createServer({
			cert: readFileSync(process.env.SERVER_CRT),
			key: readFileSync(process.env.SERVER_KEY)
		},
		app)
} else {
	server = http.createServer(app);
}


// WebSockets configuration for server-client communication
const wss = new WebSocketServer({ clientTracking: false, noServer: true });

server.on('upgrade', function (request, socket, head) {
	console.log('Parsing session from request...');

	session(request, {}, () => {
		if (!request.session.user) {
			socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
			socket.destroy();
			return;
		}

		console.log('Session is parsed!');

		wss.handleUpgrade(request, socket, head, function (ws) {
			wss.emit('connection', ws, request);
		});
	});
});

// Clients
const map = new Map();
wss.on('connection', (socket, request) => {
	const user = request.session.user;
	map.set(user, socket);
    console.log('sockets / connection');

    // Server-side receives a message from client
    socket.on('message', async (msg) => {
        let recMsg = JSON.parse(msg);
        console.log('index.mjs | socket.on(message), receiving WebSocket from client:');

        // Received message is a request to database
        if (recMsg.code == "DB_REQUEST") {
            console.log('DB Request received');
			console.log(recMsg);

            // Selection = temperature, relative humidity, co2, pressure
            let selection = recMsg.selection;
            let beginning = new Date(recMsg.start);
            let end = new Date(recMsg.end);

            let table = db.getMeasurements();
            let samples = table.getSamplesByTime(beginning, end);
            let sampleList = [];

            for await (let sample of samples) {
                sampleList.push(sample);
            }

            let resp_payload = {
                code: "DB_RESPONSE",
                selection: selection,
                data: sampleList
            };
			map.forEach((socket, _user) => socket.send(JSON.stringify(resp_payload)));
        }

        // Received message is a MQTT to be sent to controller
        if (recMsg.code == "MQTT_SEND") {
            console.log('MQTT SEND received');

            if (recMsg.auto === "true") {
                console.log('Setting pressure');
                let msg_to_controller = {
                    auto: true,
                    pressure: parseFloat(recMsg.pressure)
                };
                console.log(msg_to_controller);
                mqttClient.publish(`controller/settings`, JSON.stringify(msg_to_controller))
            } else {
                console.log('Setting speed');
                let msg_to_controller = {
                    auto: false,
                    speed: parseFloat(recMsg.speed)
                };
                console.log(msg_to_controller);
                mqttClient.publish(`controller/settings`, JSON.stringify(msg_to_controller))
            }
        }
    })

    socket.on('close', () => {
        console.log('sockets / close');
		map.delete(user);
    })
})

// New MQTT connection

// Actual:
// const mqttClient = connect('mqtt://192.168.75.42:1883');
// Simulator:
const mqttClient = connect('mqtt://192.168.75.42:1883')

// On successful connection, subscribe to topic 'controller/status'
mqttClient.on('connect', () => {
    console.log('MQTT: Connected')
    mqttClient.subscribe('controller/status', err => {
        console.log('MQTT: Subscribed to controller/status.');
        if (err) throw err;
    })
})

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

        // Send received MQTT message to all connected WebSockets.
        // This might not stay this way, possibly send to DB and fetch from there to WebSockets?
		map.forEach((socket, _user) => socket.send(JSON.stringify(mqtt_message_parsed)));
    }

    // Discard messages if topic is incorrect
    else {
        console.log('mqttClient.on() index.js, incorrect MQTT topic received');
    }
})

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
app.get('/history', isAuthenticated(), (_req, res) => {
    res.render('history');
});

// For redirecting everything to the login page when unauthorized
app.get('*', (_req, res) => {
	res.redirect('/login');
});


if('DOMAIN' in process.env) {
	const port = process.env.LISTEN_PID > 0 ? 'systemd' : (process.env.PORT | 3000);
	server.listen(port, process.env.DOMAIN);
} else {
	console.error("Error: environment variable DOMAIN must be configured");
}

