'use strict'

import express from 'express';
// const bodyparser = require('body-parser');
// const jsonparser = bodyparser.json();
import dotenv from 'dotenv';
import { connect } from 'mqtt';
import ejs from 'ejs';
import path from 'path';
// const fs = require('fs');
import { WebSocketServer } from 'ws';
import controllerRouter from './routes/controller.js';
import { Db, Measurement } from './db/index.mjs';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('view engine', 'ejs')

// app.use(bodyparser.urlencoded({ extended: false }))
// app.use(bodyparser.json())

app.use('/controller', controllerRouter)
app.use(express.static(__dirname + '/public/scripts'))
app.use(express.static(__dirname + '/public/css'))

const PORT = process.env.PORT | 3000;

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

// WebSockets configuration for server-client communication
const server = new WebSocketServer({
    port: 3030
})

// Clients
let sockets = []
server.on('connection', function (socket) {
    sockets.push(socket)
    console.log('sockets / connection')

    // Server-side receives a message from client
    socket.on('message', async function(msg) {
        let recMsg = JSON.parse(msg)
        console.log('--------------START---------------')
        console.log('index.JS | socket.on(message), receiving WebSocket from client:')

        // Received message is a request to database
        if (recMsg.code == "DB_REQUEST") {
            console.log('DB Request received')

            // Selection = temperature, relative humidity, co2, pressure
            let selection = recMsg.selection
			let table = db.getMeasurements();
            let samples = await table.getSamplesByNr(recMsg.start, recMsg.end)
            let sampleList = []

            for await (let sample of samples) {
                sampleList.push(sample)
            }
            let resp_payload = {
                code: "DB_RESPONSE",
                selection: selection,
                data: sampleList
            }
            sockets.forEach(s => s.send(JSON.stringify(resp_payload)))
        }

        // Received message is a MQTT to be sent to controller
        if (recMsg.code == "MQTT_SEND") {
            console.log('MQTT SEND received')

            if (recMsg.auto === "true") {
                console.log('Setting pressure')
                let msg_to_controller = {
                    auto: recMsg.auto,
                    pressure: parseFloat(recMsg.pressure)
                }
                console.log(msg_to_controller)

                /* Publishing MQTT message below commented out, not sure if working. */
                // client.publish(`${recMsg.topic}`, JSON.stringify(msg_to_controller))

            } else {
                console.log('Setting speed')
                let msg_to_controller = {
                    auto: recMsg.auto,
                    speed: parseFloat(recMsg.speed)
                }
                console.log(msg_to_controller)

                /* Publishing MQTT message below commented out, not sure if working. */
                // client.publish(`${recMsg.topic}`, JSON.stringify(msg_to_controller))
            }
        }
        console.log('--------------END---------------')

    })

    socket.on('close', function() {
        console.log('sockets / close')
        sockets = sockets.filter(s => s !== socket)
    })
})

// New MQTT connection
const mqttClient = connect('mqtt://localhost:1883')

// On successful connection, subscribe to topic 'controller/status'
// Currently subscribed to topic 'test/topic' for testing purposes
mqttClient.on('connect', () => {
    console.log('MQTT: Connected')
    mqttClient.subscribe('test/topic', err => {
        console.log('MQTT: Subscribed to test/topic.')
        if (err) throw err
    })
})

// Received MQTT message
mqttClient.on('message', async (topic, message) => {
    // All received messages should have topic 'controller/status'
    // Currently all messages have topic 'test/topic'
    if (topic === 'test/topic') {
        console.log('index.js | mqttClient.on(), receiving MQTT from broker')
        let mqtt_message_parsed = JSON.parse(message)

        // Sending measurements to DB
		mqtt_message_parsed.datetime = new Date()
		let measurement = new Measurement(mqtt_message_parsed)
		let table = db.getMeasurements();
		await table.submit(measurement)

        // Send received MQTT message to all connected WebSockets.
        // This might not stay this way, possibly send to DB and fetch from there to WebSockets?
        sockets.forEach(s => s.send(JSON.stringify(mqtt_message_parsed)))
    }

    // Discard messages if topic is incorrect
    else {
        console.log('mqttClient.on() index.js, incorrect MQTT topic received')
    }
})

app.get('/', (_req, res) => {
    res.statusCode = 200;
    res.render('index')
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}, localhost link: http://localhost:${PORT}`)
})
