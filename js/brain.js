let pressure = 40
let speed = 15
let intervalID

function getPressure () {
    return pressure
}
function getSpeed() {
    return speed
}
function setPressure (targetPressure) {
    pressure = targetPressure
}
function setSpeed (targetSpeed) {
    speed = targetSpeed
}


// Listen to which tab (mode) is active
let radioButtons = document.querySelectorAll('input[name="group-one"]')
radioButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
        console.log('Opened tab ' + button.id)
    })
})

// Pressure slider & display
// AUTOMATIC TAB - UNLOCKED
let pressureSlider_unlocked = document.getElementById("pressure-slider-automatic")
let pressurePara_unlocked = document.getElementById("pressure-para-automatic")
pressureSlider_unlocked.oninput = function() {
    setPressure(this.value)
    pressurePara_unlocked.innerHTML = `<b>Pressure (pa):</b> ${this.value}`
}

// Speed slider & display
// AUTOMATIC TAB - LOCKED
let speedSlider_locked = document.getElementById("locked-slider-automatic")
let speedPara_locked = document.getElementById("locked-para-automatic")
speedSlider_locked.disabled = true

// Pressure slider & display
// MANUAL TAB - LOCKED
let pressureSlider_locked = document.getElementById("locked-slider-manual")
let pressurePara_locked = document.getElementById("locked-para-manual")
pressureSlider_locked.disabled = true

// Speed slider & display
// MANUAL TAB - UNLOCKED
let speedSlider_unlocked = document.getElementById("speed-slider-manual")
let speedPara_unlocked = document.getElementById("speed-para-manual")
speedSlider_unlocked.oninput = function() {
    setSpeed(this.value)
    speedPara_unlocked.innerHTML = `<b>Fan speed:</b> ${this.value}`
}

intervalID = setInterval(updateAll, 1000)
function updateAll() {
    let current_speed = getSpeed()
    let current_pressure = getPressure()

    pressureSlider_locked.value = current_pressure
    pressurePara_locked.innerHTML = `<b>Pressure (pa):</b> ${current_pressure}`
    pressureSlider_unlocked.value = current_pressure
    pressurePara_unlocked.innerHTML = `<b>Pressure (pa):</b> ${current_pressure}`

    speedSlider_locked.value = current_speed
    speedPara_locked.innerHTML = `<b>Fan speed:</b> ${current_speed}`
    speedSlider_unlocked.value = current_speed
    speedPara_unlocked.innerHTML = `<b>Fan speed:</b> ${current_speed}`
}