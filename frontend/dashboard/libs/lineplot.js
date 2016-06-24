// If you use jslint, the following line prevents use strict from throwing an error.
/*jslint node: true */

'use strict';

/*
TODO:
1. Pull in data from ZMQ subscriber thing
2. Preallocate zeros or something so that it shows something until queue is full
3. Parameterize colors of lines.
*/

var d3 = require('d3');

// Takes a container element and configuration settings as input. Generates
// a pseudo realtime multi line series plot with freeze frame buttons and
// toggle-able lines.
var lineplot = function(container, configuration) {
    var that = {};
    var config = {
        margin: {
            top: 20,
            right: 80,
            bottom: 30,
            left: 50
        },
        width: 960 - 50 - 80, //960 - margin.left - margin.right,
        height: 500 - 20 - 30, //500 - margin.top - margin.bottom
        ylabel: "Miles Per Hour",
        xlabel: "Frame Number",
        dataWindow: 500, //defines number of frames to show on xaxis (viewable data), if 0 then infinit window
        rerender: 250 //defines number of frames until rerender
    };

    var dest = container;
    var svg;
    var color;
    var x;
    var y;
    var xAxis;
    var yAxis;
    var line;
    var margin;

    var root; // Contains data of JSON to be bound to plot

    var rerender = 0;
    var windowFull = false;
    var freezePlot = false;

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

    // Creates checkboxes to associate with each line. Takes an array of
    // lineNames as input.
    function newLineToggleBoxes(lineNames) {
        if (d3.selectAll("#checkboxToggles label").length !== 0) {
            d3.selectAll("#checkboxToggles label").remove();
        }
        var label;
        for (var i = 0; i < lineNames.length; i++) {
            var lineAttrName = "toggle" + lineNames[i].replace(/\s/g, '');
            label = d3.select("#checkboxToggles").append("label");
            label.append("input")
                .attr("type", "checkbox")
                .attr("name", lineAttrName)
                .attr("checked", "true")
                .attr("disabled", "disabled");
            label.append("text").text(lineNames[i]);

            label.select("input").on("change", function() {
                if (this.checked) {
                    d3.select("#" + this.name).style("visibility", "visible");
                } else {
                    d3.select("#" + this.name).style("visibility", "hidden");
                }
            });
        }
    }
    that.newLineToggleBoxes = newLineToggleBoxes;

    // Creates freeze and unfreeze buttons for viewing data
    function createButton() {
        if (d3.select("#freezeButtons").empty()) {
            var buttons = d3.select(dest).append("div")
                .attr("id", "freezeButtons");

            buttons.append("input")
                .attr("name", "freezeButton")
                .attr("id", "freezeButton")
                .attr("type", "button")
                .attr("value", "Freeze Data")
                // .attr("disabled", null)
                .attr("disabled", "disabled")

            .on("click", function() {
                toggleInputs(true);
            });

            buttons.append("input")
                .attr("name", "unfreezeButton")
                .attr("id", "unfreezeButton")
                .attr("type", "button")
                .attr("value", "Unfreeze Data")
                .attr("disabled", null)

            // .attr("disabled", "disabled")
            .on("click", function() {
                toggleInputs(false);
                if (d3.select(dest + " svg").length !== 0) {
                    d3.select(dest + " svg").remove();
                }
                render(root);
            });
        }
    }
    that.createButton = createButton;

    // Disables and enables the buttons and checkboxes.
    function toggleInputs(flag) {
        if (flag) {
            freezePlot = true;
            d3.select("#unfreezeButton").attr("disabled", null);
            d3.select("#freezeButton").attr("disabled", "disabled");
            d3.selectAll("#checkboxToggles label input").attr("disabled", null);
        } else {
            freezePlot = false;
            d3.select("#freezeButton").attr("disabled", null);
            d3.select("#unfreezeButton").attr("disabled", "disabled");
            d3.selectAll("#checkboxToggles label").attr("disabled", "disabled");
        }
    }
    that.toggleInputs = toggleInputs;

    // Generates buttons, renders the multi series line plot and shows lines.
    function render(newValue) {
        createButton();

        x = d3.scale.linear().range([0, config.width]);

        y = d3.scale.linear().range([config.height, 0]);

        color = d3.scale.category10();

        xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

        line = d3.svg.line()
            .interpolate("basis")
            .x(function(d) {
                return x(d.frame);
            })
            .y(function(d) {
                return y(d.y_axis);
            });

        margin = config.margin;

        d3.select(dest).append("div")
            .attr("id", "checkboxToggles");

        svg = d3.select(dest).append("svg")
            .attr("width", config.width + margin.left + margin.right)
            .attr("height", config.height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        if (root === undefined) {
            root = JSON.parse(newValue);
        }

        plotLines(root);
    }
    that.render = render;


    // Plots each line based on current state of root. Root contains JSON of
    // data to be bound to line plot.
    function plotLines(root) {
        color.domain(d3.keys(root.lines[0]).filter(function(key) {
            return key !== "frame";
        }));

        // Gets line names and creates checkboxes to toggle lines on and off
        var lineNames = color.domain();
        newLineToggleBoxes(lineNames);

        // Remaps JSON to alternate form for easy generating of lines
        var lines = color.domain().map(function(name) {
            return {
                name: name,
                values: root.lines.map(function(d) {
                    return {
                        frame: d.frame,
                        y_axis: +d[name]
                    };
                })
            };
        });

        // Sets the min and max x axis value
        x.domain([
            d3.min(lines, function(c) {
                return d3.min(c.values, function(v) {
                    return v.frame;
                });
            }),
            d3.max(lines, function(c) {
                return d3.max(c.values, function(v) {
                    return v.frame;
                });
            })
        ]);

        // Sets the min and max y value
        y.domain([
            d3.min(lines, function(c) {
                return d3.min(c.values, function(v) {
                    return v.y_axis;
                });
            }),
            d3.max(lines, function(c) {
                return d3.max(c.values, function(v) {
                    return v.y_axis;
                });
            })
        ]);

        // Appends y axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + config.height + ")")
            .call(xAxis)
            // Appends y axis label
            .append("text")
            .attr("x", config.width - 6)
            .attr("dx", ".71em")
            .style("text-anchor", "end")
            .text(config.xlabel);

        // Appends y axis
        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            // Appends y axis label
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text(config.ylabel);

        // Generates lines
        var pline = svg.selectAll(".pline")
            .data(lines)
            .enter().append("g")
            .attr("class", "pline")
            .attr("id", function(d, i) {
                return "toggle" + lineNames[i].replace(/\s/g, '');
            });

        pline.append("path")
            .attr("class", "line")
            .attr("d", function(d) {
                return line(d.values);
            })
            .style("stroke", function(d) {
                return color(d.name);
            });


        pline.append("text")
            .datum(function(d) {
                return {
                    name: d.name,
                    value: d.values[d.values.length - 1]
                };
            })
            .attr("transform", function(d) {
                return "translate(" + x(d.value.frame) + "," + y(d.value.y_axis) + ")";
            })
            .attr("x", 3)
            .attr("dy", ".35em")
            .text(function(d) {
                return d.name;
            });
    }

    // Takes a newValue and newConfiguration settings and updates the line
    // plot. Checks for rerender and data window size settings.
    function update(newValue, newConfiguration) {
        if (windowFull) {
            root.lines.shift();
        }
        root.lines.push(JSON.parse(newValue));

        rerender++;

        if (rerender >= config.rerender && !freezePlot) {
            if (d3.select(dest + " svg").length !== 0) {
                d3.select(dest + " svg").remove();
            }
            render(root);
            rerender = 0;
        }

        if (root.lines.length === config.dataWindow) {
            windowFull = true;
        }
    }
    that.update = update;

    configure(configuration);

    return that;
};

module.exports = lineplot;
