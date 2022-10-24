let pressure, speed, receivedJSON, activeTab;
let toggled = true;

// Temperature, relative humidity and Co2 displays
let tempDisplays = document.querySelectorAll('#temp-p');
let rhDisplays = document.querySelectorAll('#rh-p');
let co2Displays = document.querySelectorAll('#co2-p');
let pressureDisplays = document.querySelectorAll('#pressure-p')
let speedDisplays = document.querySelectorAll('#speed-p')

function getPressure () {
    return pressure;
}
function getSpeed() {
    return speed;
}
function setPressure (targetPressure) {
    pressure = targetPressure;
}
function setSpeed (targetSpeed) {
    speed = targetSpeed;
}

function updateAll() {
    // Unlocked sliders should be set to their correct positions, then not update unless user updates them.
    if (toggled) {
        pressureSlider_unlocked.value = receivedJSON.pressure;
        pressurePara_unlocked.innerHTML = `<b>Pressure (pa):</b> ${receivedJSON.pressure}`;
        speedSlider_unlocked.value = receivedJSON.speed;
        speedPara_unlocked.innerHTML = `<b>Fan speed:</b> ${receivedJSON.speed}`;
        pressureSlider_locked.value = receivedJSON.pressure;
        pressurePara_locked.innerHTML = `<b>Pressure (pa):</b> ${receivedJSON.pressure}`;
        speedSlider_locked.value = receivedJSON.speed;
        speedPara_locked.innerHTML = `<b>Fan speed:</b> ${receivedJSON.speed}`;

        toggled = !toggled;
    }

    pressureSlider_locked.value = receivedJSON.pressure;
    pressurePara_locked.innerHTML = `<b>Pressure (pa):</b> ${receivedJSON.pressure}`;
    speedSlider_locked.value = receivedJSON.speed;
    speedPara_locked.innerHTML = `<b>Fan speed:</b> ${receivedJSON.speed}`;

    /*
    pressureSlider_unlocked.value = receivedJSON.pressure;
    pressurePara_unlocked.innerHTML = `<b>Pressure (pa):</b> ${receivedJSON.pressure}`;
    */

    /*
    speedSlider_unlocked.value = receivedJSON.speed;
    speedPara_unlocked.innerHTML = `<b>Fan speed:</b> ${receivedJSON.speed}`;
    */

    tempDisplays.forEach(display => display.innerHTML = `<b>Temp: </b>${receivedJSON.temp}&deg;C`);
    rhDisplays.forEach(display => display.innerHTML = `<b>Rh: </b>${receivedJSON.rh}%`);
    co2Displays.forEach(display => display.innerHTML = `<b>Co2: </b>${receivedJSON.co2}`);
    pressureDisplays.forEach(display => display.innerHTML = `<b>Pressure: </b>${receivedJSON.pressure}`)
    speedDisplays.forEach(display => display.innerHTML = `<b>Speed: </b>${receivedJSON.speed}`)
}

// WebSocket client
let client = new WebSocket('ws://localhost:3030');

// Receive message sent from server
// Receiving WebSocket messages containing status updates (MQTT -> SERVER -> CLIENT)
client.onmessage = (event) => {
    receivedJSON = JSON.parse(event.data);

    console.log('###############################');
    console.log('brain.js | client.onmessage(), received message from server:');
    console.log(receivedJSON);
    console.log('###############################');
    updateAll();
}

// Send speed button & event listener
let btn_sendSpeed = document.getElementById("btn_send_speed");
btn_sendSpeed.addEventListener('click', (e) => {
    let targetSpeed = getSpeed();

    // Payload to be sent to 'topic'
    let payload = {
        code: "MQTT_SEND",
        topic:"controller/settings",
        auto:"false",
        speed: targetSpeed
    };
    client.send(JSON.stringify(payload));
    console.log('ON CLIENT SIDE: speed send clicked, sent to server:');
    console.log(JSON.stringify(payload));
})

// Send pressure button & event listener
let btn_sendPressure = document.getElementById("btn_send_pressure");
btn_sendPressure.addEventListener('click', (e) => {
    let targetPressure = getPressure();
    // Payload to be published to 'topic'
    let payload = {
        code: "MQTT_SEND",
        topic:"controller/settings",
        auto:"true",
        pressure: targetPressure
    };
    client.send(JSON.stringify(payload));
    console.log('ON CLIENT SIDE: pressure send clicked, sent to server:');
    console.log(JSON.stringify(payload));
})

// Listen to tab switching
let radioButtons = document.querySelectorAll('input[name="group-one"]');
radioButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
        toggled = true;
        if (button.id === 'auto-mode') {
            activeTab = 'AUTO';
        } else {
            activeTab = 'MANUAL';
        }
    })
})


// Pressure slider & display
// AUTOMATIC TAB - UNLOCKED
let pressureSlider_unlocked = document.getElementById("pressure-slider-automatic");
let pressurePara_unlocked = document.getElementById("pressure-para-automatic");

pressureSlider_unlocked.oninput = function() {
    setPressure(this.value);
    pressurePara_unlocked.innerHTML = `<b>Pressure (pa):</b> ${this.value}`;
}

// Speed slider & display
// AUTOMATIC TAB - LOCKED
let speedSlider_locked = document.getElementById("locked-slider-automatic");
let speedPara_locked = document.getElementById("locked-para-automatic");
speedSlider_locked.disabled = true;

// Pressure slider & display
// MANUAL TAB - LOCKED
let pressureSlider_locked = document.getElementById("locked-slider-manual");
let pressurePara_locked = document.getElementById("locked-para-manual");
pressureSlider_locked.disabled = true;

// Speed slider & display
// MANUAL TAB - UNLOCKED
let speedSlider_unlocked = document.getElementById("speed-slider-manual");
let speedPara_unlocked = document.getElementById("speed-para-manual");

speedSlider_unlocked.oninput = function() {
    setSpeed(this.value);
    speedPara_unlocked.innerHTML = `<b>Fan speed:</b> ${this.value}`;
}