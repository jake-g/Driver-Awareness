import csv
import json
import subprocess
import time
import datetime
from pprint import pprint
from pylibs import zmq_publisher as pub

# Settings
BUFF_SIZE = 10  # score buffer
UPDATE_FREQ = 1  # update score every N frames

# Logging
LOG = False # log kinect input and scores to file
LOG_PATH = 'logs/'

# Simulate
SIM = False  # simulate
SIM_FILE = 'kinect_video4-[2016-05-19_17-01-07].csv'
SIM_FPS = 30

# ZMQ
ZMQ = True  # send json to zmq if SIM o
ZMQ_PORT = 5005  # ZMQ port
ZMQ_TOPICS = ["Scores"]

# Electron (windows only...)
ELECTRON = True  # Show electron frontend
ELECTRON_PATH = "frontend/dashboard/"
EXIT_WHEN_DONE = False


class Metric:
    # def __init__(self, slope, bias, score_cap, reset_score, kind, name, threshold=[]):
    def __init__(self, penalty, score_cap, reset_score, kind, name, threshold=[]):

        self.frame = 0
        self.score = 0
        self.greenzone = 0
        self.penalty = penalty
        self.cap = score_cap
        self.reset = 2*reset_score
        self.thresh = threshold  # list of thresholds
        self.type = kind
        self.name = name
        self.zero = True
        self.increase = False

    # Score is reset if greenzone is large enough
    def zero_score(self):
        self.greenzone += 1
        if self.greenzone > self.reset and self.score > 0:
            self.score = 0
            print '%s Reset\n' % self.name

    # Score increase logic
    def increase_score(self):
        self.greenzone = 0
        self.score += (self.penalty + (1 - self.score/self.cap))/10
        self.score = min(self.score, self.cap)

    # Returns True if a value is outside respective thresh
    def over_threshold(self, values):
        for i in range(0, len(self.thresh)):
            if self.thresh[i] is None:  # skip
                continue
            if self.thresh[i][0] > values[i] or values[i] > self.thresh[i][1]:
                return True
        return False


class Frame:
    def __init__(self, row):
        self.index = row[0]
        self.happy = row[1]
        self.engaged = row[2]
        self.glasses = row[3]
        self.l_eye = row[4]
        self.r_eye = row[5]
        self.looking_away = row[6]
        self.mouth_moving = row[7]
        self.mouth_open = row[8]
        self.yaw = row[9]
        self.pitch = row[10]
        self.roll = row[11]


class Electron:
    def __init__(self):
        self.proc = None

    def run(self, path):
        print "Starting electron..."
        cmd = "cd %s & npm start" % path
        print cmd
        self.proc = subprocess.Popen(cmd, shell=True)

    def kill(self, wait=0):
        time.sleep(wait)
        print "Killing electron in %d seconds..." % wait
        subprocess.Popen("TASKKILL /F /PID {pid} /T".format(pid=self.proc.pid))


# Run with kinect attached
def run_kinect():
    cmd = "x64/Debug/Driver_Awareness.exe"
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    row_buff = [None] * BUFF_SIZE
    if LOG:
        f = open(LOG_PATH + 'kinect_log-' + start_time + '.csv', 'wb')
    for row in iter(p.stdout.readline, b''):
        row = row.rstrip()
        # print row

        if LOG:  # print to csv file
            f.write(row + '\n')
        if row[0] is not 'F':  # skip header
            row = map(int, row.split(','))
            cur_frame = Frame(row)
            row_buff[cur_frame.index % BUFF_SIZE] = cur_frame  # array of frame objects
            if None in row_buff:  # buffer not filled
                continue
            elif cur_frame.index % UPDATE_FREQ == 0:
                update_scores(cur_frame.index, row_buff)


# Generate scores for kinect logfile
def simulate_kinect(f):
    with open(f, 'rb') as csvfile:
        row_buff = [None] * BUFF_SIZE
        csvfile.readline()  # skips header
        for i, row in enumerate(csvfile):
            row = map(int, row.split(','))
            cur_frame = Frame(row)
            row_buff[cur_frame.index % BUFF_SIZE] = cur_frame  # array of frame objects
            if None in row_buff:  # buffer not filled
                continue
            elif cur_frame.index % UPDATE_FREQ == 0:
                update_scores(cur_frame.index, row_buff)
                time.sleep(1.0/SIM_FPS)  # simulate latency


# Computes new scores for each metric
def update_scores(frame, row_buff):
    score_list = [];
    score_dict = {}
    for metric in metrics:
        # Choose scoreing function
        get_score(row_buff, metric)
        metric.frame = frame
        score_dict[metric.name] = round(metric.score, 1)
        score_list.append(metric.score)
    # Results
    score_dict["Frame"] = frame
    score_json = json.dumps(score_dict)
    # pprint(score_json)  # print JSON
    scores.append(score_list)

    # Send to frontend
    if ZMQ:
        zmq.send_message("Scores", score_json)


# Compute score for any metric
def get_score(buff, metric):
    this = metric
    for row in buff:
        # Rules for specific metric
        if this.type == int:
            this.increase = True if this.over_threshold([row.yaw, row.pitch, row.roll]) else False
            this.zero = not this.increase
        if this.name == 'Happy':
            this.zero = True if row.happy == 0 else False
            this.increase = True if row.happy == 1 else False
        elif this.name == 'Sleep':
            this.zero = True if row.l_eye == 0 or row.r_eye == 0 else False
            this.increase = True if row.l_eye == 1 and row.r_eye == 1 else False

        # Compute score
        if this.zero:
            this.zero_score()
        elif this.increase:
            this.increase_score()
        else:  # skip if not 0 or 1
            continue


# Saves scores to csv file
def save_scores(csv_file):
    header = [metric.name for metric in metrics]
    with open(csv_file, 'wb') as csvfile:
        writer = csv.writer(csvfile, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(header)
        for data in scores:
            writer.writerow(data)

def date_str(time):
    return datetime.datetime.fromtimestamp(int(time)).strftime('[%Y-%m-%d_%H-%M-%S]')

def main():
    global metrics, scores, zmq, start_time

    # Init metric classes
    #  Metric(penalty cap, reset, , type, name, [yaw, pitch, roll thresholds])
    dist =  Metric(0.25, 100, 300, int, 'Distraction', [[-30, 30], [-10, 10], None])  # distraction metric
    phone = Metric(0.6, 100, 800, int, 'Phone', [None, [-15, 100], None])  # phone metric
    happy = Metric(0.005, 100, 700, bool, 'Happy')
    sleep = Metric(0.4, 100, 300, bool, 'Sleep')
    start_time = date_str(time.time())  # unique for file names
    scores = []

    metrics = [dist, phone, happy, sleep]  # add all metrics

    # Run Electron Frontend
    if ELECTRON:
        electron = Electron()
        electron.run(ELECTRON_PATH)

    # publish to zmq
    if ZMQ:
        ip = "127.0.0.1"  # localhost
        zmq = pub.Publisher(ip, ZMQ_PORT, ZMQ_TOPICS)

    # Run or Simulate
    if SIM:
        simulate_kinect(LOG_PATH + SIM_FILE)
    else:
        run_kinect()  # needs kinect attached

    # Save Scores to file
    if LOG:
        score_csv = LOG_PATH + 'awareness-scores_' + start_time + '.csv'
        # print score_csv
        save_scores(score_csv)

    # Kill Running Processes
    if ELECTRON and EXIT_WHEN_DONE:
        electron.kill(5)  # specify wait time


if __name__ == "__main__":
    main()
