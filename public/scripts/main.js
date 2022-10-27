let pressure, speed, activeTab;
let toggled = true;

// Temperature, relative humidity and Co2 displays
let tempDisplays = document.querySelectorAll('#temp-p');
let rhDisplays = document.querySelectorAll('#rh-p');
let co2Displays = document.querySelectorAll('#co2-p');

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

function displayError(msg) {
	let errors = document.getElementById('errors');
	let max = 0;
	for (let error of errors.children) {
		let n = error.id.split(" ")[1];
		if (n > max) {
			max = n;
		}
	}
	let box = document.createElement('div');
	let text = document.createElement('p');
	let bold = document.createElement('b');
	let button = document.createElement('button');
	box.id = `error ${max + 1}`;
	bold.textContent = `Error: ${msg}`;
	button.onclick = () => { document.getElementById(box.id).remove(); };
	button.textContent = 'Dismiss';
	text.appendChild(bold);
	box.appendChild(text);
	box.appendChild(button);
	errors.appendChild(box);
}

function updateDisplays(receivedJSON) {
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

    tempDisplays.forEach(display => display.innerHTML = `<b>Temp: </b>${receivedJSON.temp}&deg;C`);
    rhDisplays.forEach(display => display.innerHTML = `<b>Rh: </b>${receivedJSON.rh}%`);
    co2Displays.forEach(display => display.innerHTML = `<b>Co2: </b>${receivedJSON.co2}`);
}

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


const GRAPH_LENGTH_SAMPLES = 15;

let sampleNumber, dataPoint_fan, dataPoint_temp, dataPoint_co2, dataPoint_rh, dataPoint_pressure, dataPoint_all;

let dataPoints_all = [];
let dataPoints_temp = [];
let dataPoints_pressure = [];
let dataPoints_co2 = [];
let dataPoints_rh = [];
let dataPoints_fan = []

let tempChecked = true;
let co2Checked = true;
let pressureChecked = true;
let rhChecked = true;
let speedChecked = true;

let ERR_MSG;

google.charts.load('current',{packages:['corechart']});
google.charts.setOnLoadCallback(drawReactive);

// Read radio buttons for reactive chart
function readChecked() {
    if ((document.getElementById('checkTemp')).checked === true) tempChecked = true; else tempChecked = false;
    if ((document.getElementById('checkCo2')).checked === true) co2Checked = true; else co2Checked = false;
    if ((document.getElementById('checkPressure')).checked === true) pressureChecked = true; else pressureChecked = false;
    if ((document.getElementById('checkRh')).checked === true) rhChecked = true; else rhChecked = false;
    if ((document.getElementById('checkSpeed')).checked === true) speedChecked = true; else speedChecked = false;
}

// Adding elements to array, removing last element if length exceeded
function pushInto (arr, val) {
    if (arr.length < GRAPH_LENGTH_SAMPLES) {
        arr.push(val);
    } else {
        arr.shift();
        arr.push(val);
    }
    return arr;
}

// Get data from received message
function parseData(message) {
    try {
		if(message.error) {
			displayError('Can not reach desired value');
		}

        sampleNumber = parseFloat(message.nr);

        dataPoint_fan = [sampleNumber, parseFloat(message.speed)];
        dataPoints_fan = pushInto(dataPoints_fan, dataPoint_fan);

        dataPoint_temp = [sampleNumber, parseFloat(message.temp)];
        dataPoints_temp = pushInto(dataPoints_temp, dataPoint_temp);

        dataPoint_co2 = [sampleNumber, parseFloat(message.co2)];
        dataPoints_co2 = pushInto(dataPoints_co2, dataPoint_co2);

        dataPoint_rh = [sampleNumber, parseFloat(message.rh)];
        dataPoints_rh = pushInto(dataPoints_rh, dataPoint_rh);

        dataPoint_pressure = [sampleNumber, parseFloat(message.pressure)];
        dataPoints_pressure = pushInto(dataPoints_pressure, dataPoint_pressure);

        dataPoint_all = [
            sampleNumber,
            parseFloat(message.temp),
            parseFloat(message.co2),
            parseFloat(message.rh),
            parseFloat(message.pressure),
            parseFloat(message.speed)
        ];
        dataPoints_all = pushInto(dataPoints_all, dataPoint_all);
    } catch (error) {
        console.log(error);
    }
}

// Drawing individual graphs
function drawIndividuals() {
    try {console.log('grapher.js | Drawing individual graphs.')

        // Fan Speed, left
        let data_fanspeed = new google.visualization.DataTable();
        data_fanspeed.addColumn('number', 'SampleNumber');
        data_fanspeed.addColumn('number', 'Fan Speed');
        dataPoints_fan.forEach(point => data_fanspeed.addRow(point));

        // Pressure, right
        let data_pressure = new google.visualization.DataTable();
        data_pressure.addColumn('number', 'SampleNumber');
        data_pressure.addColumn('number', 'Pressure');
        dataPoints_pressure.forEach(point => data_pressure.addRow(point));

        // Set Options
        let options_pressure = {title: 'Pressure', hAxis: {title: 'Sample Number'}, vAxis: {title: 'Pressure'}, legend: 'none'};
        let options_fanspeed = {title: 'Fan Speed', hAxis: {title: 'Sample Number'}, vAxis: {title: 'Fan speed'}, legend: 'none'};

        // Draw the charts
        let pressure_chart = new google.visualization.LineChart(document.getElementById('pressure_Chart'));
        pressure_chart.draw(data_pressure, options_pressure);

        let fan_chart = new google.visualization.LineChart(document.getElementById('fanspeed_Chart'));
        fan_chart.draw(data_fanspeed, options_fanspeed);
    } catch (error) {
        console.log(error);
        ERR_MSG = "ERROR in: GRAPHER.JS, drawIndividuals()";
        document.getElementById('')
    }
}

// Drawing selective chart
function drawReactive() {
    try {
        console.log('grapher.js | Drawing Reactive graph.')
        // Reactive chart
        let data_configurable = new google.visualization.DataTable();
        data_configurable.addColumn('number', 'SampleNumber');
        data_configurable.addColumn('number', 'Temperature');
        data_configurable.addColumn('number', 'Co2');
        data_configurable.addColumn('number', 'Rh');
        data_configurable.addColumn('number', 'Pressure');
        data_configurable.addColumn('number', 'Fan speed');
        dataPoints_all.forEach(point => data_configurable.addRow(point));

        let view = new google.visualization.DataView(data_configurable);

        // Hide column if checkbox not checked
        view.setColumns([0, 1, 2, 3, 4, 5]);
        if (!tempChecked) view.hideColumns([1]);
        if (!co2Checked) view.hideColumns([2]);
        if (!rhChecked) view.hideColumns([3]);
        if (!pressureChecked) view.hideColumns([4]);
        if (!speedChecked) view.hideColumns([5]);

        // Options
        let options_configurable = {
            width: 900,
            height: 500,
            title: 'All',
            hAxis: {title: 'Sample'},
            vAxis: {title: 'Real-time graph, selectable lines'},
            legend: {position: 'top'}
        };

        let configurable_chart = new google.visualization.LineChart(document.getElementById('configurable_Chart'));
        configurable_chart.draw(view, options_configurable);
    } catch (error) {
        console.log(error)
        ERR_MSG = "ERROR in: GRAPHER.JS, drawReactive()"
    }
}

// Graph with user selected range
function drawConfigurable(data) {
    try {
        console.log('grapher.js | Drawing Range Graph.');
        console.log(data)

        let selection = data.selection;
        let range_data_point;
        let options;

        data.data.sort(function(a, b) {
            return new Date(b.datetime) - new Date(a.datetime)
        })

        let GraphData = new google.visualization.DataTable();
        GraphData.addColumn('date', 'Sample date');
        GraphData.addColumn('number', 'Value');

        // Add rows to DataTable based on which graph is to be drawn
        switch (selection) {
            case "temperature":
                data.data.forEach(sample => {
                    range_data_point = [new Date(sample.datetime), Number(sample.temp)];
                    GraphData.addRow((range_data_point));
                })
                options = {
                    title: 'Temperature',
                    hAxis: {title: 'Sample Date'},
                    vAxis: {title: 'Temperature'},
                    legend: 'none'
                };
                break;

            case "co2":
                data.data.forEach(sample => {
                    range_data_point = [new Date(sample.datetime), Number(sample.co2)];
                    GraphData.addRow((range_data_point));
                })
                options = {title: 'Co2', hAxis: {title: 'Sample Number'}, vAxis: {title: 'Co2'}, legend: 'none'};
                break;

            case "pressure":
                data.data.forEach(sample => {
                    range_data_point = [new Date(sample.datetime), Number(sample.pressure)];
                    GraphData.addRow((range_data_point));
                })
                options = {
                    title: 'Pressure',
                    hAxis: {title: 'Sample Number'},
                    vAxis: {title: 'Pressure'},
                    legend: 'none'
                };
                break;
            case "rh":
                data.data.forEach(sample => {
                    range_data_point = [new Date(sample.datetime), Number(sample.rh)];
                    GraphData.addRow((range_data_point));
                })
                options = {
                    title: 'Relative humidity',
                    hAxis: {title: 'Sample Number'},
                    vAxis: {title: 'Relative Humidity'},
                    legend: 'none'
                };
                break;
            case "speed":
                data.data.forEach(sample => {
                    range_data_point = [new Date(sample.datetime), Number(sample.speed)];
                    GraphData.addRow((range_data_point));
                })
                options = {
                    title: 'Speed',
                    hAxis: {title: 'Sample Number'},
                    vAxis: {title: 'Speed'},
                    legend: 'none'
                };
        }
        let chart = new google.visualization.LineChart(document.getElementById('configurable_range_Chart'));
        chart.draw(GraphData, options);
    } catch (error) {
        console.log(error)
        ERR_MSG = "ERROR in: GRAPHER.JS, drawConfigurable()"
    }
}


// WebSocket client
let graphClient = new WebSocket('wss://@DOMAIN@');

// Selectable range graph request button
let drawButton = document.getElementById('btn_draw');
drawButton.addEventListener("click", async (event) => {
    event.preventDefault();

    let startTime = new Date(document.getElementById('time_start').value);
    let endTime = new Date(document.getElementById('time_end').value);
    let selection = document.getElementById('selection').value;

    let graph_Payload = {
        code: "DB_REQUEST",
        start: startTime,
        end: endTime,
        selection: selection
    };
    graphClient.send(JSON.stringify(graph_Payload));
})

// Receiving WebSocket messages from Server
graphClient.onmessage = (event) => {
    const MSG = JSON.parse(event.data);
    let MSG_CODE = MSG.code;

    if (MSG_CODE === "DB_RESPONSE") {
        drawConfigurable(MSG);
    } else if(MSG_CODE === "MQTT_UPDATE") {
        parseData(MSG)
		// realtime graphs
        drawIndividuals();
        drawReactive();
		// numeric displays
    	updateDisplays(MSG);
	} else if(MSG_CODE === "CLIENT_ERROR") {
		displayError(MSG);
	} else if(MSG_CODE === "CLIENT_ACK") {
	} else {
		console.error(`Unknown message from server, code: ${MSG_CODE}`);
	}
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
    graphClient.send(JSON.stringify(payload));
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
    graphClient.send(JSON.stringify(payload));
    console.log('ON CLIENT SIDE: pressure send clicked, sent to server:');
    console.log(JSON.stringify(payload));
})

