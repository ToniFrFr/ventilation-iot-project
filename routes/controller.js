const express = require('express');

const controllerRouter = express.Router();


controllerRouter.post('/settings', (req, res) => {
    res.statusCode = 200
    res.send("controller post settings route")

    //Route to send settings, add mqtt.publish method here
})



module.exports = controllerRouter