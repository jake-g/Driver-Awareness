import zmq_subscriber as sub


def print_msg(topic, msg):
    print topic, msg


ip = "127.0.0.1"
port = 5005
list_of_topics = ["Scores"]
topic_to_callback_map = dict([("A", print_msg)])

s = sub.Subscriber(ip, port, list_of_topics, topic_to_callback_map)

for i in range(100):
    s.recv_message("Scores")
    # print i

    # if i % 2 is 0:
    #     s.clear_queue("Scores")

all_msg = s.get_messages("Scores")
for j, msg in enumerate(all_msg):
    print j, msg
