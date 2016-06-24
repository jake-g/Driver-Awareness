# Receives messages through assigned topics, using port and address provided by constructor.
# Refer to https://learning-0mq-with-pyzmq.readthedocs.org/en/latest/pyzmq/patterns/pubsub.html
import zmq


class Subscriber:
    def __init__(self, ipaddr, port, list_of_topics, topic_to_callback_map):
        """ Generates a Subscriber object which constantly receives messages which are sent
		through ipaddr and port, with a topic that is within list_of_topics. This is done
		by attaching callbacks to relevent message sockets so that when a message is received,
		the callback is fired. If no callback is specified, attach a callback to add message to
		a queue, stored in a map of topics to queues. These stored messages can be read by
		get_messages function."""
        self.ipaddr = ipaddr
        self.port = int(port)
        self.list_of_topics = list_of_topics
        self.topic_to_callback_map = topic_to_callback_map
        self.msg_queue = dict()  ## dictionary mapping topics to queues

        ## initialize message queues and setup callback for those who don't have one
        for t in self.list_of_topics:
            if (not (t in self.topic_to_callback_map)):
                self.topic_to_callback_map[t] = self.add_queue
            self.msg_queue[t] = []

        protocol = "tcp"
        addr = protocol + "://" + ipaddr + ":" + str(port)

        ctx = zmq.Context()
        self.socket = ctx.socket(zmq.SUB)
        print "Connect..."
        self.socket.connect(addr)

    def recv_message(self, topic_filter):
        self.socket.setsockopt(zmq.SUBSCRIBE, topic_filter)
        recv_string = self.socket.recv()
        topic, msg = recv_string.split(' ', 1)
        # if topic is in list, fire the callback with topic and msg as arguments
        if (topic in self.list_of_topics):
            (self.topic_to_callback_map[topic])(topic, msg)
        else:
            print topic + " is not in the list_of_topics"

    def restart_socket(self):
        """Restarts socket to current values of ipaddr, port and topics."""
        protocol = "tcp"
        addr = protocol + "://" + self.ipaddr + ":" + str(self.port)

        self.socket.close()
        ctx = zmq.Context()
        self.socket = ctx.socket(zmq.SUB)
        print "Connect to addr..."
        self.socket.connect(addr)

    def get_messages(self, topic):
        """Returns all messages currently stored in default message queues"""
        return self.msg_queue[topic]

    def add_topic(self, topic):
        """Adds additional topic, adding callback for receiving"""
        if (topic in self.list_of_topics):
            print "Topic is already in the list"
        else:
            self.list_of_topics.append(topic)
            self.topic_to_callback_map[topic] = self.add_queue

    def remove_topic(self, topic):
        """Removes topic from topics, removing callback"""
        if (topic in self.list_of_topics):
            self.list_of_topics.remove(topic)
            self.topic_to_callback_map.pop(topic)
        else:
            print "Topic is not in the list. Cannot be removed"

    def set_topics(self, list_of_topics):
        """Sets list of topics which can be broadcast, resetting all callbacks"""
        self.list_of_topics = list_of_topics
        topic_to_callback_map = dict()
        for t in self.list_of_topics:
            self.topic_to_callback_map[t] = self.add_queue
            self.msg_queue[t] = []

    def set_ipaddr(self, ipaddr):
        """Sets ipaddr to new value and resets the socket, to implement the change"""
        self.ipaddr = ipaddr

    def set_port(self, port):
        """Sets port to new value and resets the socket to implement the change"""
        self.port = int(port)

    def add_queue(self, topic, msg):
        self.msg_queue[topic].append(msg)

    def clear_queue(self, topic):
        self.msg_queue[topic] = []
