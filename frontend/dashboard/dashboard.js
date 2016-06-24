/*
Main js for populating plots and updating them with data
*/
// "use strict";

var fs = require("fs");
var gauge = require("./libs/gauge2.js");
var line = require("./libs/line.js");
var radialProgress = require("./libs/radial.js");
var lineplot = require("./libs/lineplot.js");
var lineViewFinder = require('./libs/lineWithFocusChart.js');


/*
---------------------------------------ZMQ------------------------------------------
*/
var zmq = require('zmq');
var subscriber = zmq.socket('sub');

var port = 5005; // match the publisher
var topic = "Scores"; // use '' for all topics
var data;
init_zmq(port, topic);


function init_zmq(port, topic) {
    console.log('Initializing ZMQ...');
    subscriber.connect('tcp://localhost:' + port);
    subscriber.subscribe(topic);
    subscriber.on('message', queue_message);
}

function queue_message() {
    var msg_str = Array.prototype.slice.call(arguments).toString(); // as string
    var msg = split_message(msg_str);
    data = msg[1];
    // console.log(msg[0], msg[1]);
}

function split_message(msg) {
    topic = msg.substr(0, msg.indexOf('{')); // gets topic from msg
    var json_str = msg.substr(msg.indexOf('{') - 1, msg.length - 1); // gets data from msg
    var json = JSON.parse(json_str);
    return [topic, json];
}

/*
---------------------------------------Plots------------------------------------------
Initializes elements, starts draw cycle
*/

function init() {
    // Settings to provide to element
    var gaugeSettings = {
        maxValue: 100,
        transitionMs: 100,
    };


    var lineSettings = {
        width: 600,
        height: 150,
        maxY: 100,
        maxX: 500,
        transitionFreq: 47,
    };

    var plotSettings = {
        width: 800,
        height: 400,
        dataWindow: 500,
        rerender: 1000
    };

    var radialSettings = {
        _diameter: 250,
        __width: 250,
        __height: 250,
        _duration: 200,
    };


    var distGauge = radialProgress('#distraction', {
        _color: "#3498db"
    });
    var phoneGauge = radialProgress('#phone', {
        _color: "#1abc9c"
    });
    var happyGauge = radialProgress('#happy', {
        _color: "#9b59b6"
    });
    var sleepGauge = radialProgress('#sleep', {
        _color: "#2ecc71"
    });
    var overallLine = line('#overall', lineSettings);


    distGauge.render();
    phoneGauge.render();
    happyGauge.render();
    sleepGauge.render();
    overallLine.render();
    // Note, historical data rendered in openTab function

    // Update
    // TODO make update and zmq only happen when in realtime tab
    var overall;
    setInterval(function() {
        if (typeof data === 'undefined' || !data) {
            console.log('Waiting to detect face....');
        } else { // Update values
            distGauge.update(data.Distraction);
            phoneGauge.update(data.Phone);
            happyGauge.update(data.Happy);
            sleepGauge.update(data.Sleep);
            overallLine.update(warningLevel());
        }
    }, 50);
}


/*
-------------------------------------Helpers------------------------------------------
*/
var lastWarn;
function warningLevel() {
    // weighted sum for overall warning
    var warning = (0.1 + 10 * data.Distraction + 12 * data.Phone - data.Happy + 18 * data.Sleep) / 10;
    warning = Math.min(warning, 100); // bound warning from 0 to 100
    warning = Math.max(warning, 0);
    // Color bars
    var hue = 120 - (warning * 120 / 100);
    var color = 'hsl(' + hue + ', 100%, 70%)';
    document.getElementById("Realtime").style.borderLeftColor = color;
    document.getElementById("Realtime").style.borderRightColor = color;

    lastWarn = warning;
    return warning;
}

// Picks random setpoint and increments data util setpoint is reached
var val = 0;
var setPoint = 0;
var increment = 1;
function simulatePedal() {
    if (Math.abs(setPoint - val) < increment) { // reset setpoint
        setPoint = Math.round(Math.random() * 100); // int from 0 to 100
        increment = 3 * (Math.random() + 0.5); // float between 0.5 and 3
    } else if (val < setPoint) {
        val += increment;
    } else {
        val += -1 * increment;
    }
    return val;
}
// Simulate Battery
var batteryVal = 0;
function simulateBattery() {
    batteryVal += 0.5;
    return batteryVal % 100;
}
// Random Data
var currentState = 0;
function random() {
    var randNum = Math.round(Math.random() * 100); // int from 0 to 70
    return randNum;
}

// -------------------------------------------------------------------
// For HTML tabs
var histRender = 0; // flag for rendering history (kinda hacky)
var lineViewChart;
var logPath = "../../logs/";

function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tabcontent.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    // on load, select default
    if (tabName == 'load') {
        tabName = 'Realtime';
        tablinks[0].className += " active";
    }
    if (tabName == 'Historical') {
        parseLogs();
        if (!histRender) {
            var defaultLog = "awareness-scores_[2016-05-17_12-23-22].csv";
            // var div = document.getElementById('line-plot');
            // div.innerHTML = div.innerHTML + '<br><h2><b>Log</b> : ' + defaultLog + '</h2>';
            console.log('Rendering Historical Data...');
            lineViewChart = lineViewFinder('#line-plot'); // render defualt
            lineViewChart.render(logPath + defaultLog);
            histRender = 1;
        }
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// File Selector for Historical Data
function parseLogs() {
    var select = document.getElementById("selectNumber");
    var length = select.options.length;
    for (i = 0; i < length; i++) {
      select.options[i] = null;
    }
    console.log('Scanning log directory...');
    fs.readdir(logPath, function(err, files) {
        if (err) {
            return console.error(err);
        }
        files.forEach(function(file) {
            if (file.indexOf(".csv") > -1) { // only parse csv
                var el = document.createElement("option");
                el.textContent = file;
                el.value = file;
                select.appendChild(el);
            }
        });
    });
}

// Load new log
function loadLog(file) {
    console.log('Selected ' + file);
    var elem = document.getElementById("line-view-finder");
    elem.parentNode.removeChild(elem);
    // var div = document.getElementById('line-plot');
    // div.innerHTML = '<br><h2><b>Log</b> : ' + file + '</h2>';
    lineViewChart.render(logPath + file);
}



/*
When window loads run init
*/
window.onload = function() {
    openTab(event, 'load');
    init();

};
