// If you use jslint, the following line prevents use strict from throwing an error.
/*jslint node: true */

/*
Using example code seen here: http://bl.ocks.org/charlesdguthrie/11356441
*/
'use strict';

var d3 = require('d3');

var gauge = function(containerId, configuration) {

    var that = {};
    var config = {
        size: 300,
        clipWidth: 300,
        clipHeight: 200,
        ringInset: 20,
        ringWidth: 50,

        pointerWidth: 10,
        pointerTailLength: 5,
        pointerHeadLengthPercent: 0.8,

        minValue: 0,
        maxValue: 100,

        lowThreshhold: 30,
        highThreshhold: 70,

        minAngle: -90,
        maxAngle: 90,

        lowThreshholdColor: '#008000',
        defaultColor: '#DEA82C',
        highThreshholdColor: '#B22222',



        transitionMs: 750,

        majorTicks: 5,
        labelFormat: d3.format(',g'),
        labelInset: 90,
        rotateLabels: false
    };

    var arcColorFn;

    var range;
    var r;
    var pointerHeadLength;
    var value = [];

    var container;
    var numberDiv;
    var numberSpan;

    var svg;
    var arc;
    var scale;
    var ticks;
    var tickData;
    var pointer;

    var donut = d3.layout.pie();

    var numberFormat = d3.format("f.1");

    function deg2rad(deg) {
        return deg * Math.PI / 180;
    }

    function newAngle(d) {
        var ratio = scale(d);
        var newAngle = config.minAngle + (ratio * range);
        return newAngle;
    }

    function configure(configuration) {
        var prop;
        for (prop in configuration) {
            config[prop] = configuration[prop];
        }

        range = config.maxAngle - config.minAngle;
        r = config.size / 2;
        pointerHeadLength = Math.round(r * config.pointerHeadLengthPercent);

        // a linear scale that maps domain values to a percent from 0..1
        scale = d3.scale.linear()
            .range([0, 1])
            .domain([config.minValue, config.maxValue]);

        var colorDomain = [config.lowThreshhold, config.highThreshhold].map(scale),
            colorRange = [config.lowThreshholdColor, config.defaultColor, config.highThreshholdColor];

        arcColorFn = d3.scale.threshold().domain(colorDomain).range(colorRange);

        ticks = scale.ticks(config.majorTicks);

        tickData = [config.lowThreshhold, config.highThreshhold, config.maxValue]
            .map(function(d) {
                return scale(d);
            });

        arc = d3.svg.arc()
            .innerRadius(r - config.ringWidth - config.ringInset)
            .outerRadius(r - config.ringInset)
            .startAngle(function(d, i) {
                var ratio = i > 0 ? tickData[i - 1] : config.minValue; //d * i;
                return deg2rad(config.minAngle + (ratio * range));
            })
            .endAngle(function(d, i) {
                var ratio = tickData[i]; //d * (i+1);
                return deg2rad(config.minAngle + (ratio * range));
            });
    }
    that.configure = configure;

    function centerTranslation() {
        return 'translate(' + r + ',' + r + ')';
    }

    function isRendered() {
        return (svg !== undefined);
    }
    that.isRendered = isRendered;

    function render(newValue) {
        container = d3.select(containerId);

        svg = container.append('svg:svg')
            .attr('class', 'gauge')
            .attr('width', config.clipWidth)
            .attr('height', config.clipHeight);

        var centerTx = centerTranslation();

        var arcs = svg.append('g')
            .attr('class', 'arc')
            .attr('transform', centerTx);

        arcs.selectAll('path')
            .data(tickData)
            .enter().append('path')
            .attr('fill', function(d, i) {
                return arcColorFn(d - 0.001);
            })
            .attr('d', arc);

        var lg = svg.append('g')
            .attr('class', 'label')
            .attr('transform', centerTx);



        lg.selectAll('text')
            .data(ticks)
            .enter().append('text')
            .attr('transform', function(d) {

                var ratio = scale(d);

                if (config.rotateLabels) {
                    var newAngle = config.minAngle + (ratio * range);

                    return 'rotate(' + newAngle + ') translate(0,' + (config.labelInset - r) + ')';
                } else {
                    var newAngle = deg2rad(config.minAngle + (ratio * range)),
                        y = (config.labelInset - r) * Math.cos(newAngle),
                        x = -1 * (config.labelInset - r) * Math.sin(newAngle);

                    return 'translate(' + x + ',' + y + ')';
                }
            })
            .text(config.labelFormat);

        lg.selectAll('line')
            .data(ticks)
            .enter().append('line')
            .attr('class', 'tickline')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', 0)
            .attr('y2', config.ringWidth / 3)
            .attr('transform', function(d) {
                var ratio = scale(d),
                    newAngle = config.minAngle + (ratio * range);

                return 'rotate(' + newAngle + ') translate(0,' + (config.labelInset / 1.5 - r) + ')';
            })
            .style('stroke', '#666')
            .style('stroke-width', '1px');


        var lineData = [
            [config.pointerWidth / 2, 0],
            [0, -pointerHeadLength],
            [-(config.pointerWidth / 2), 0],
            [0, config.pointerTailLength],
            [config.pointerWidth / 2, 0]
        ];

        var pointerLine = d3.svg.line().interpolate('monotone');

        var pg = svg.append('g').data([lineData])
            .attr('class', 'pointer')
            .attr('transform', centerTx);

        pointer = pg.append('path')
            .attr('d', pointerLine)
            .attr('transform', 'rotate(' + config.minAngle + ')');

        numberDiv = container.append('div')
            .attr('class', 'number-div')
            .style('width', config.clipWidth + 'px');

        numberSpan = numberDiv.append('span')
            .data([newValue])
            .attr('class', 'number-span');

        update(newValue === undefined ? 0 : newValue);
    }
    that.render = render;


    function update(newValue, newConfiguration) {
        if (newConfiguration !== undefined) {
            configure(newConfiguration);
        }

        value = [newValue];

        var ratio = scale(newValue);
        var newAngle = config.minAngle + (ratio * range);

        pointer.transition()
            .duration(config.transitionMs)
            //.ease('elastic')
            .ease('cubic-in-out')
            .attr('transform', 'rotate(' + newAngle + ')');

        numberSpan
            .data(value)
            .transition()
            .duration(config.transitionMs)
            .ease('quad')
            .style('color', arcColorFn(scale(newValue)))
            .tween("text", function(d) {
                var i = d3.interpolate(this.textContent, d);

                return function(t) {
                    var val = i(t).toFixed(1);
                    if (val < config.minValue + 1) {
                        val = config.minValue;
                    } else if (val > config.maxValue - 1) {
                        val = config.maxValue;
                    }
                    this.textContent = val;

                };
            });
    }
    that.update = update;

    configure(configuration);

    return that;
};




// Set the object to be provided in exports
module.exports = gauge;
