// Requirements:
// 1. You need nv.d3.min.js
// 2. You need nv.d3.min.css
// 3. You need d3.min.js

// Bugs:
// 1. Colors in main chart and view finder chart do not correspond.

// If you use jslint, the following line prevents use strict from throwing an error.
/*jslint node: true */

'use strict';

// Example code used from http://nvd3.org/examples/lineWithFocus.html
var nv = require('./nv.d3.min.js');
var d3 = require('d3');

var lineViewFinder = function(container, configuration) {

    var dataset; // Contains mapped data for chart from config.csvFile

    var that = {};

    var config = {
        xlabel: "Frame",
        ylabel: "Value",
        csvFile: "../../logs/awareness-scores-1463098615.0.csv",
        height: 700, // in pixels
        width: 900 // in pixels
    };

    function configure(configuration) {
        var prop;
        for (prop in configuration) {
            config[prop] = configuration[prop];
        }
    }
    that.configure = configure;

    function isRendered() {
        return (svg !== undefined);
    }
    that.isRendered = isRendered;

    function render(file) {
        if (file !== undefined) {
            config.csvFile = file;
        }
        d3.csv(config.csvFile, function(error, data) {
            if (error) {
                console.log(error);
            } else {
                var metrics = d3.keys(data[0]);
                // ignore 'Frame'
                var index = metrics.indexOf("Frame");
                if (index !== -1) {
                    metrics.splice(index, 1);
                }
                dataset = metrics.map(function(metric) {
                    return {
                        key: metric,
                        area: true, // toggle to true for shading of underneath each line
                        values: data.map(function(d, i) {
                            return {
                                x: i,
                                y: +d[metric]
                            };
                        })
                    };
                });
                drawChart();

            }
        });
    }
    that.render = render;

    function drawChart() {
        nv.addGraph(function() {
            var chart = nv.models.lineWithFocusChart();

            chart.brushExtent([0, 1000]);

            chart.xAxis.tickFormat(d3.format(',f')).axisLabel(config.xlabel);
            chart.x2Axis.tickFormat(d3.format(',f'));

            chart.yAxis.tickFormat(d3.format(',.2f')).axisLabel(config.ylabel);

            chart.useInteractiveGuideline(true);

            d3.select(container).append('div')
                .attr('id', 'line-view-finder')
                .style('height', config.height + 'px')
                .style('width', config.width + 'px')
                .append('svg')
                .datum(dataset)
                .call(chart);

            nv.utils.windowResize(chart.update);

            return chart;
        });
    }
    that.drawChart = drawChart;

    //    configure(configuration);

    return that;
};

// Set the object to be provided in exports
module.exports = lineViewFinder;
