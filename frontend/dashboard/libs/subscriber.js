/*
Subscriber desiged for the python publisher.
topics should be strings, data should be json (encoded as string)
*/

var zmq = require('zmq');
var subscriber = zmq.socket('sub');

var port = 5005; // match the publisher
var topic = "Scores"; // use '' for all topics
init(port, topic);

function init(port, topic) {
    console.log('Initializing ZMQ');
    subscriber.connect('tcp://localhost:' + port);
    subscriber.subscribe(topic);
    subscriber.on('message', queue_message);
}

function queue_message() {
    msg_str = Array.prototype.slice.call(arguments).toString(); // as string
    msg = split_message(msg_str);
    console.log(msg[0], msg[1]);
}

function split_message(msg) {
    topic = msg.substr(0, msg.indexOf('{')); // gets topic from msg
    json_str = msg.substr(msg.indexOf('{') - 1, msg.length - 1); // gets data from msg
    json = JSON.parse(json_str);
    return [topic, json];
}
