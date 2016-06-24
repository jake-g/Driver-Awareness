# Driver Awareness
Utilizes the kinect hardware, with a python, C++ backend and Electron web based frontend. Once best innovation and commuting app at DubHacks and placed 3rd in Consumer Appeal at EcoCar competition.

### Demo
* Demo the frontend dashboard and interactive log explorer [here](http://uwecocar.github.io/UW-Infotainment/#)
* You can find videos of this in action [here](https://www.youtube.com/watch?v=vnFNyZdMrwk&list=PLWptjpDqazOxkBwUpPwFPwSg5zMpoglit&index=3)

### Requirements
* Python 2.7
* Visual Studio
* Election
* Node
* ZMQ
* See readme in `frontend/dashboard` for electron requirements


### Settings
There are settings to configure how the code will run.
* If you don't have Windows 10 or a kinect, you will want to set `SIMULATE = True`
* You can choose a `kinect_log` from the `logs/` folder, or use the default.
* Make sure `ZMQ=True` and `ELECTRON=True` if you want to use the frontend
* Set LOG=True if you want to create a csv of the scores

### Execute
* Run `python driver_metrics.py`, the json data will be printed in the console
* Electron should open up, and also start showing data
* You can debug electron with `ctrl + shift + i`
