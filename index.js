'use strict'

const express = require('express');
const bodyparser = require('body-parser')
const dotenv = require('dotenv').config();
const mqtt = require('mqtt');
const ejs = require('ejs')
const path = require('path')
const controllerRouter = require('./routes/controller');

const app = express();
app.set('view engine', 'ejs')

app.use(bodyparser.urlencoded({ extended: false }))
app.use(bodyparser.json())

app.use('/public', express.static('public'))
app.use('/controller', controllerRouter)
app.use(express.static(path.join(__dirname, "js")))

const PORT = process.env.PORT | 3000;

app.get('/', (_req, res) => {
    res.statusCode = 200;
    res.render('index')
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}, localhost link: http://localhost:${PORT}`)
})
