// If you use jslint, the following line prevents use strict from throwing an error.
/*jslint node: true */

/*
Using example code seen here: http://bl.ocks.org/charlesdguthrie/11356441
*/
'use strict';

var d3 = require('d3');

var line = function(container, configuration) {
    var that = {};
    var config = {
        width: 500,
        height: 400,
        top: 20,
        bottom: 20,
        right: 20,
        left: 40,
        minY: -1,
        maxY: 1,
        maxX: 800,
        minX: 0,
        transitionFreq: 40,
    };
    configure(configuration);

    // Initialize data with 0s sto scroll through
    var data = Array(config.maxX).fill(0);

    function render() {
        // var margin = {top: 20, right: 20, bottom: 20, left: 40},
        var width = config.width - config.left - config.right;
        var height = config.height - config.top - config.bottom;
        var x = d3.scale.linear()
            .domain([1, config.maxX - 2]) // interp
            // .domain([0, config.maxX - 1])   // no interp
            .range([0, width]);
        var y = d3.scale.linear()
            .domain([config.minY, config.maxY])
            .range([height, 0]);
        var line = d3.svg.line()
            .interpolate("basis") // interp
            .x(function(d, i) {
                return x(i);
            })
            .y(function(d, i) {
                return y(d);
            });

        d3.select(container).selectAll("svg").remove();
        var svg = d3.select(container)
            .append('svg:svg')
            .attr('class', 'line')
            .attr("width", width + config.left + config.right)
            .attr("height", height + config.top + config.bottom)
            .append("g")
            .attr("transform", "translate(" + config.left + "," + config.top + ")");
        svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + y(0) + ")");
            // .call(d3.svg.axis().scale(x).orient("bottom"));
        svg.append("g")
            .attr("class", "y axis")
            .call(d3.svg.axis().scale(y).orient("right"));
        var path = svg.append("g")
            .attr("clip-path", "url(#clip)")
            .append("path")
            .datum(data)
            .attr("class", "line")
            .attr("d", line);
        tick();

        function tick() {
            path
                .attr("d", line)
                .attr("transform", null)
                .transition()
                .duration(config.transitionFreq)
                .ease("linear")
                .attr("transform", "translate(" + x(0) + ",0)") // interp
                // .attr("transform", "translate(" + x(-1) + ",0)") // no interp
                .each("end", tick);
            // pop the old data point off the front
            data.shift();
        }
    }
    that.render = render;

    // Update data queue with new data
    function update(newData) {
        data.push(newData);
    }

    that.update = update;

    // Use custom config
    function configure(configuration) {
        var prop;
        for (prop in configuration) {
            config[prop] = configuration[prop];
        }
    }

    that.configure = configure;

    // that.tick = tick;

    return that;
};

// Set the object to be provided in exports
module.exports = line;
