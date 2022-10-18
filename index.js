'use strict'

const express = require('express');
const bodyparser = require('body-parser')
const jsonparser = bodyparser.json()
const dotenv = require('dotenv').config();
const mqtt = require('mqtt');
const ejs = require('ejs')
const path = require('path')
const fs = require('fs')
const WebSocket = require('ws')
const controllerRouter = require('./routes/controller');

const app = express();
app.set('view engine', 'ejs')

app.use(bodyparser.urlencoded({ extended: false }))
app.use(bodyparser.json())

app.use('/public', express.static('public'))
app.use('/controller', controllerRouter)
app.use(express.static(path.join(__dirname, "js")))
app.use(express.static(__dirname + '/public/scripts'))
app.use(express.static(__dirname + '/public/css'))

const PORT = process.env.PORT | 3000;

const server = new WebSocket.Server({
    port: 3030
})

let sockets = []
server.on('connection', function (socket) {
    sockets.push(socket)
    console.log('sockets / connection')

    // Server-side receives controller settings message from client-side
    socket.on('message', function(msg) {
        let recMsg = JSON.parse(msg)
        console.log('########################')
        console.log('ON SERVER SIDE, receiving WebSocket from client:')

        // Check for mode, publish correct message
        if (recMsg.auto === "true") {
            console.log('Sending from AUTOMATIC TAB')
            let msg_to_controller = {
                auto : recMsg.auto,
                pressure : recMsg.pressure
            }
            console.log(msg_to_controller)
            /* Below commented out, not sure if working. */
            // client.publish(`${recMsg.topic}`, JSON.stringify(msg_to_controller))
        } else {
            console.log('Sending from MANUAL TAB')
            let msg_to_controller = {
                auto : recMsg.auto,
                speed : recMsg.speed
            }
            console.log(msg_to_controller)
            /* Below commented out, not sure if working. */
            // client.publish(`${recMsg.topic}`, JSON.stringify(msg_to_controller))
        }
        console.log('########################')
    })

    socket.on('close', function() {
        console.log('sockets / close')
        sockets = sockets.filter(s => s !== socket)
    })
})


// New MQTT connection #################
const mqttClient = mqtt.connect('mqtt://localhost:1883')

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
mqttClient.on('message', (topic, message) => {
    let mqtt_topic = topic

    // All received messages should have topic 'controller/status'
    // Currently all messages have topic 'test/topic'
    if (topic === 'test/topic') {
        console.log('ON SERVER SIDE, receiving MQTT from broker')
        let mqtt_message_parsed = JSON.parse(message)
        sockets.forEach(s => s.send(JSON.stringify(mqtt_message_parsed)))
    }

    // Discard messages if topic is incorrect
    else {
        console.log('Incorrect topic received')
    }
})


app.get('/', (_req, res) => {
    res.statusCode = 200;
    res.render('index')
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}, localhost link: http://localhost:${PORT}`)
})
