const GRAPH_LENGTH_SAMPLES = 15;

let sampleNumber, dataPoint_fan, dataPoint_temp, dataPoint_co2, dataPoint_rh, dataPoint_pressure, dataPoint_all; // Fan not yet implemented

let dataPoints_all = [];
let dataPoints_temp = [];
let dataPoints_pressure = [];
let dataPoints_co2 = [];
let dataPoints_rh = [];
let dataPoints_fan = [] // Fan not yet implemented


let tempChecked = true;
let co2Checked = true;
let pressureChecked = true;
let rhChecked = true;

google.charts.load('current',{packages:['corechart']});
google.charts.setOnLoadCallback(drawReactive);

// Read radio buttons for reactive chart
function readChecked() {
    if ((document.getElementById('checkTemp')).checked === true) tempChecked = true; else tempChecked = false;
    if ((document.getElementById('checkCo2')).checked === true) co2Checked = true; else co2Checked = false;
    if ((document.getElementById('checkPressure')).checked === true) pressureChecked = true; else pressureChecked = false;
    if ((document.getElementById('checkRh')).checked === true) rhChecked = true; else rhChecked = false;
}

function pushInto (arr, val) {
    if (arr.length < GRAPH_LENGTH_SAMPLES) {
        arr.push(val);
    } else {
        arr.shift();
        arr.push(val);
    }
    return arr;
}

// WebSocket client
let graphClient = new WebSocket('ws://localhost:3030');

// Receiving WebSocket messages from Server
graphClient.onmessage = (event) => {
    console.log('###############################')
    console.log('grapher.js | graphClient.onmessage: received message from server');
    console.log('###############################')

    let MSG = JSON.parse(event.data)
    let MSG_CODE = MSG.code

    if (MSG_CODE == "DB_RESPONSE") {
        console.log('DB Response received! Drawing range graph.')
        console.log(MSG)
        DrawRangeGraph(MSG)
    } else {
        console.log('Status update received! Updating real-time graphs.')

        sampleNumber = parseFloat(receivedJSON.nr);

        dataPoint_temp = [sampleNumber, parseFloat(receivedJSON.temperature)];
        dataPoints_temp = pushInto(dataPoints_temp, dataPoint_temp);

        dataPoint_co2 = [sampleNumber, parseFloat(receivedJSON.co2)];
        dataPoints_co2 = pushInto(dataPoints_co2, dataPoint_co2);

        dataPoint_rh = [sampleNumber, parseFloat(receivedJSON.rh)];
        dataPoints_rh = pushInto(dataPoints_rh, dataPoint_rh);

        dataPoint_pressure = [sampleNumber, parseFloat(receivedJSON.pressure)];
        dataPoints_pressure = pushInto(dataPoints_pressure, dataPoint_pressure);

        dataPoint_all = [
            sampleNumber,
            parseFloat(receivedJSON.temperature),
            parseFloat(receivedJSON.co2),
            parseFloat(receivedJSON.rh),
            parseFloat(receivedJSON.pressure)
        ];
        dataPoints_all = pushInto(dataPoints_all, dataPoint_all);

        // Real-time charts, update on every new status update
        drawCharts();
        drawReactive();
    }
}

function drawCharts() {
    // Temperature, top left
    let data_temp = new google.visualization.DataTable();
    data_temp.addColumn('number', 'SampleNumber');
    data_temp.addColumn('number', 'Temperature');
    dataPoints_temp.forEach(point => data_temp.addRow(point));

    // Co2, top right
    let data_co2 = new google.visualization.DataTable();
    data_co2.addColumn('number', 'SampleNumber');
    data_co2.addColumn('number', 'Co2');
    dataPoints_co2.forEach(point => data_co2.addRow(point));

    // Relative Humidity, bottom left
    let data_rh = new google.visualization.DataTable();
    data_rh.addColumn('number', 'SampleNumber');
    data_rh.addColumn('number', 'Rh');
    dataPoints_rh.forEach(point => data_rh.addRow(point));

    // Pressure, bottom right
    let data_pressure = new google.visualization.DataTable();
    data_pressure.addColumn('number', 'SampleNumber');
    data_pressure.addColumn('number', 'Pressure');
    dataPoints_pressure.forEach(point => data_pressure.addRow(point));

    // Set Options
    let options_temp = {title: 'Temperature', hAxis: {title: 'Sample Number'}, vAxis: {title: 'Temperature'}, legend: 'none'};
    let options_co2 = {title: 'Co2', hAxis: {title: 'Sample Number'}, vAxis: {title: 'Co2'}, legend: 'none'};
    let options_rh = {title: 'Relative Humidity', hAxis: {title: 'Sample Number'}, vAxis: {title: 'RH'}, legend: 'none'};
    let options_pressure = {title: 'Pressure', hAxis: {title: 'Sample Number'}, vAxis: {title: 'Pressure'}, legend: 'none'};

    // Draw the charts
    let t_chart = new google.visualization.LineChart(document.getElementById('temp_Chart'));
    t_chart.draw(data_temp, options_temp);

    let co2_chart = new google.visualization.LineChart(document.getElementById('co2_Chart'));
    co2_chart.draw(data_co2, options_co2);

    let rh_chart = new google.visualization.LineChart(document.getElementById('rh_Chart'));
    rh_chart.draw(data_rh, options_rh);

    let pressure_chart = new google.visualization.LineChart(document.getElementById('pressure_Chart'));
    pressure_chart.draw(data_pressure, options_pressure);
}

function drawReactive() {
    // Reactive chart
    let data_configurable = new google.visualization.DataTable();
    data_configurable.addColumn('number', 'SampleNumber');
    data_configurable.addColumn('number', 'Temperature');
    data_configurable.addColumn('number', 'Co2');
    data_configurable.addColumn('number', 'Rh');
    data_configurable.addColumn('number', 'Pressure');
    dataPoints_all.forEach(point => data_configurable.addRow(point));

    let view = new google.visualization.DataView(data_configurable);

    // Hide column if checkbox not checked
    view.setColumns([0, 1, 2, 3, 4]);
    if (!tempChecked) view.hideColumns([1]);
    if (!co2Checked) view.hideColumns([2]);
    if (!rhChecked) view.hideColumns([3]);
    if (!pressureChecked) view.hideColumns([4]);

    let options_configurable = {
        width: 900,
        height: 500,
        title: 'All',
        hAxis: {title: 'Sample'},
        vAxis: {title: 'Real-time graph, selectable lines'},
        legend: {position: 'top'}};

    let configurable_chart = new google.visualization.LineChart(document.getElementById('configurable_Chart'));
    configurable_chart.draw(view, options_configurable);
}


// Selectable range graph request button
let drawButton = document.getElementById('btn_draw')
drawButton.addEventListener("click", async (event) => {
    event.preventDefault()

    let startTime = new Date(document.getElementById('time_start').value)
    let endTime = new Date(document.getElementById('time_end').value)

    let start = document.getElementById('sample_start').value
    let end = document.getElementById('sample_end').value
    let selection = document.getElementById('selection').value

    console.log('Selected start TIME: ' + startTime)
    console.log('Selected end TIME: ' + endTime)

    let graph_Payload = {
        code: "DB_REQUEST",
        start: start,
        end: end,
        selection: selection
    }
    graphClient.send(JSON.stringify(graph_Payload))
})

function DrawRangeGraph(data) {
    let selection = data.selection
    let range_data_point
    let options

    let GraphData = new google.visualization.DataTable();
    GraphData.addColumn('number', 'Sample Number');
    GraphData.addColumn('number', 'Value')

    // Add rows to DataTable based on which graph is to be drawn
    switch (selection) {
        case "temperature":
            data.data.forEach(sample => {
                range_data_point = [sample.nr, sample.temperature]
                GraphData.addRow((range_data_point))
            })
            options = {title: 'Temperature', hAxis: {title: 'Sample Number'}, vAxis: {title: 'Temperature'}, legend: 'none'};
            break;

        case "co2":
            data.data.forEach(sample => {
                range_data_point = [sample.nr, sample.co2]
                GraphData.addRow((range_data_point))
            })
            options = {title: 'Co2', hAxis: {title: 'Sample Number'}, vAxis: {title: 'Co2'}, legend: 'none'};
            break;

        case "pressure":
            data.data.forEach(sample => {
                range_data_point = [sample.nr, sample.pressure]
                GraphData.addRow((range_data_point))
            })
            options = {title: 'Pressure', hAxis: {title: 'Sample Number'}, vAxis: {title: 'Pressure'}, legend: 'none'};
            break;
        case "rh":
            data.data.forEach(sample => {
                range_data_point = [sample.nr, sample.rh]
                GraphData.addRow((range_data_point))
            })
            options = {title: 'Relative humidity', hAxis: {title: 'Sample Number'}, vAxis: {title: 'Relative Humidity'}, legend: 'none'};
            break;
    }

    let chart = new google.visualization.LineChart(document.getElementById('configurable_range_Chart'));
    chart.draw(GraphData, options);
}