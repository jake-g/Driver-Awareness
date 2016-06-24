# Sends messages through assigned topics, using port and address provided by constructor.
# Refer to https://learning-0mq-with-pyzmq.readthedocs.org/en/latest/pyzmq/patterns/pubsub.html
import zmq


class Publisher:
    def __init__(self, ipaddr, port, list_of_topics):
        """Generates a publisher object which can send messages through the topics specified in constructor
        Fills self fields, opens socket, etc."""
        self.ipaddr = ipaddr
        self.port = int(port)
        self.list_of_topics = list_of_topics

        protocol = "tcp"
        addr = protocol + "://" + ipaddr + ":" + str(port)

        ctx = zmq.Context()
        self.socket = ctx.socket(zmq.PUB)
        self.socket.bind(addr)

    def send_message(self, topic, msg):
        """Immediately sends message through port and ipaddr with topic and msg if
        the topic is within the list_of_topics."""
        if (topic in self.list_of_topics):
            # print "Sending message..."
            self.socket.send("%s %s" % (topic, msg))
        else:
            print "Error: topic is not in the list"

    def restart_socket(self):
        """Restarts socket to current values of ipaddr and port."""
        protocol = "tcp"
        addr = protocol + "://" + self.ipaddr + ":" + str(self.port)

        self.socket.close()
        ctx = zmq.Context()
        self.socket = ctx.socket(zmq.PUB)
        self.socket.bind(addr)

    def add_topic(self, topic):
        """Adds additional topic to this publisher"""
        if (topic in self.list_of_topics):
            print "Topic is already in the list"
        else:
            self.list_of_topics.append(topic)

    def remove_topic(self, topic):
        """Removes topic from topics which can be broadcast"""
        if (topic in self.list_of_topics):
            self.list_of_topics.remove(topic)
        else:
            print "Topic is not in the list. Cannot be removed"

    def set_topics(self, list_of_topics):
        """Sets list of topics which can be broadcast"""
        self.list_of_topics = list_of_topics

    def set_ipaddr(self, ipaddr):
        """Sets ipaddr to new value and resets the socket to implement the change"""
        self.ipaddr = ipaddr

    def set_port(self, port):
        """Sets port to new value and resets the socket to implement the change"""
        self.port = int(port)
