var d3 = require('d3');

function radialProgress(container, configuration) {
    var that = {};
    // default configuration
    var config = {
        _duration: 200,
        _margin: {
            top: 0,
            right: 0,
            bottom: 30,
            left: 0
        },
        __width: 250,
        __height: 250,
        _diameter: 250,
        _label: "",
        _fontSize: 10,
        _minValue: 0,
        _maxValue: 100,
        _value: 0,
        _trim: "",
        _color: "#9b59b6", // wrap hex value in string
        _labelColor: "black" // color name works as well
    };


    var _value; // current value in this meter
    var _width;
    var _height;
    var _currentArc = 0,
        // _currentArc2 = 0,
        _currentValue = 0;
    var _arc = d3.svg.arc()
        .startAngle(0 * (Math.PI / 180)); //just radians


    // var _arc2 = d3.svg.arc()
    //     .startAngle(0 * (Math.PI / 180))
    //     .endAngle(0); //just radians
    var _selection = d3.select(container);
    var path; // arc
    var label; // current percentage
    function component() {
        _selection.each(function(data) {
            // Select the svg element, if it exists.
            var svg = d3.select(this).selectAll("svg").data([data]);

            var enter = svg.enter().append("svg").attr("class", "radial-svg").append("g");

            measure();

            svg.attr("width", config.__width)
                .attr("height", config.__height);


            var background = enter.append("g").attr("class", "component");


            _arc.endAngle(360 * (Math.PI / 180));

            background.append("rect")
                .attr("class", "background")
                .attr("width", _width)
                .attr("height", _height);

            background.append("path")
                .attr("stroke", config._trim)
                .attr("transform", "translate(" + _width / 2 + "," + _width / 2 + ")")
                .attr("d", _arc);


            background.append("text")
                .attr("class", "label")
                .attr("transform", "translate(" + _width / 2 + "," + (_width + config._fontSize) + ")")
                .text(config._label);
            var g = svg.select("g")
                .attr("transform", "translate(" + config._margin.left + "," + config._margin.top + ")");


            _arc.endAngle(_currentArc);
            enter.append("g").attr("class", "arcs");
            path = svg.select(".arcs").selectAll(".arc").data(data);
            path.enter().append("path")
                .attr("class", "arc")
                .attr("transform", "translate(" + _width / 2 + "," + _width / 2 + ")")
                .attr("d", _arc)
                .style("fill", config._color);

            enter.append("g").attr("class", "labels");
            label = svg.select(".labels").selectAll(".label").data(data);
            label.enter().append("text")
                .attr("class", "label")
                .attr("y", _width / 2 + config._fontSize / 3)
                .attr("x", _width / 2)
                .attr("cursor", "pointer")
                .attr("width", _width)
                // .attr("x",(3*config._fontSize/2))
                .text(function(d) {
                    return Math.round((_value - config._minValue) / (config._maxValue - config._minValue) * 100) + "%";
                })
                .style("font-size", config._fontSize + "px")
                .style("fill", config._labelColor);

            path.exit().transition().duration(500).attr("x", 1000).remove();
            layout();
        });
    }

    function layout() {
        var ratio = (_value - config._minValue) / (config._maxValue - config._minValue);
        var endAngle = Math.min(360 * ratio, 360);
        endAngle = endAngle * Math.PI / 180;

        path.datum(endAngle);
        path.transition().duration(config._duration)
            .attrTween("d", arcTween);


        label.datum(Math.round(ratio * 100));
        label.transition().duration(config._duration)
            .tween("text", labelTween);
    }

    function labelTween(a) {
        var i = d3.interpolate(_currentValue, a);
        _currentValue = i(0);

        return function(t) {
            _currentValue = i(t);
            this.textContent = Math.round(i(t)) + "%";
        };
    }

    function arcTween(a) {
        var i = d3.interpolate(_currentArc, a);

        return function(t) {
            _currentArc = i(t);
            return _arc.endAngle(i(t))();
        };
    }

    // function arcTween2(a) {
    //     var i = d3.interpolate(_currentArc2, a);
    //
    //     return function(t) {
    //         return _arc2.endAngle(i(t))();
    //     };
    // }

    function measure() {
        _width = config._diameter - config._margin.right - config._margin.left - config._margin.top - config._margin.bottom;
        _height = _width;
        config._fontSize = _width * 0.2;
        _arc.outerRadius(_width / 2);
        _arc.innerRadius(_width / 2 * 0.85);
        // _arc2.outerRadius(_width / 2 * 0.85);
        // _arc2.innerRadius(_width / 2 * 0.85 - (_width / 2 * 0.15));
    }

    // ----------- functions in 'that' variable -----------
    that.value = function(_) {
        if (!arguments.length) return _value;
        _value = [_];
        _selection.datum([_value]);
        return that;
    };

    that.value(config._value);

    that.margin = function(_) {
        if (!arguments.length) return config._margin;
        config._margin = _;
        return that;
    };

    that.diameter = function(_) {
        if (!arguments.length) return config._diameter;
        config._diameter = _;
        return that;
    };

    that.minValue = function(_) {
        if (!arguments.length) return config._minValue;
        config._minValue = _;
        return that;
    };

    that.maxValue = function(_) {
        if (!arguments.length) return config._maxValue;
        config._maxValue = _;
        return that;
    };

    that.label = function(_) {
        if (!arguments.length) return config._label;
        config._label = _;
        return that;
    };

    that.duration = function(_) {
        if (!arguments.length) return config._duration;
        config._duration = _;
        return that;
    };

    // -------- default function template -------------
    function configure(configuration) {
        var prop;
        for (prop in configuration) {
            config[prop] = configuration[prop];
        }
        return that;
    }

    function isRendered() {
        return (_selection !== undefined);
    }

    function render() {
        measure();
        component();
        return that;
    }

    function update(newValue, newConfiguration) {
        if (newConfiguration !== undefined) {
            configure(newConfiguration);
        }
        if (newValue !== undefined) {
            _value = newValue;
        }
        layout();
    }

    that.configure = configure;
    that.isRendered = isRendered;
    that.render = render;
    that.update = update;

    configure(configuration);
    return that;
}

module.exports = radialProgress;
