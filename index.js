'use strict'

const express = require('express');

const app = express();
const PORT = 3000;

app.get('/', (_req, res) => {
    res.statusCode = 200;
    res.send('Hello world');
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}, localhost link: http://localhost:${PORT}`)
})