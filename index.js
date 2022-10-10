'use strict'

const express = require('express');
const bodyparser = require('body-parser')
const dotenv = require('dotenv').config();
const mqtt = require('mqtt');
const controllerRouter = require('./routes/controller');

const app = express();
app.use(bodyparser.urlencoded({ extended: false }))
app.use(bodyparser.json())

app.use('/public', express.static('public'))
app.use('/controller', controllerRouter)

const PORT = process.env.PORT | 3000;

app.get('/', (_req, res) => {
    res.statusCode = 200;
    res.send('Hello world');
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}, localhost link: http://localhost:${PORT}`)
})