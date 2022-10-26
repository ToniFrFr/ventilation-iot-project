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
let reach_err = false;

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
function parseData() {
    try {
        console.log('parseData()')
        console.log(receivedJSON)
        console.log('parseData() end')
        reach_err = receivedJSON.error
        if (reach_err) {
            document.getElementById('reach_ERROR').innerHTML = `<p>Can not reach desired value.</p>`
        }

        sampleNumber = parseFloat(receivedJSON.nr);

        dataPoint_fan = [sampleNumber, parseFloat(receivedJSON.speed)];
        dataPoints_fan = pushInto(dataPoints_fan, dataPoint_fan);

        dataPoint_temp = [sampleNumber, parseFloat(receivedJSON.temp)];
        dataPoints_temp = pushInto(dataPoints_temp, dataPoint_temp);

        dataPoint_co2 = [sampleNumber, parseFloat(receivedJSON.co2)];
        dataPoints_co2 = pushInto(dataPoints_co2, dataPoint_co2);

        dataPoint_rh = [sampleNumber, parseFloat(receivedJSON.rh)];
        dataPoints_rh = pushInto(dataPoints_rh, dataPoint_rh);

        dataPoint_pressure = [sampleNumber, parseFloat(receivedJSON.pressure)];
        dataPoints_pressure = pushInto(dataPoints_pressure, dataPoint_pressure);

        dataPoint_all = [
            sampleNumber,
            parseFloat(receivedJSON.temp),
            parseFloat(receivedJSON.co2),
            parseFloat(receivedJSON.rh),
            parseFloat(receivedJSON.pressure),
            parseFloat(receivedJSON.speed)
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

// WebSocket client
let graphClient = new WebSocket('wss://@DOMAIN@');


// Receiving WebSocket messages from Server
graphClient.onmessage = (event) => {
    let MSG = JSON.parse(event.data);
    let MSG_CODE = MSG.code;

    if (MSG_CODE == "DB_RESPONSE") {
        drawConfigurable(MSG);
    } else {
        parseData()
        drawIndividuals();
        drawReactive();
    }
}
