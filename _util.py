import datetime
import time

def _print(txt="HERE", last_time=time.time()):
    this_time = time.time()
    print("{}\t{}\t{}".format(datetime.datetime.now(),
                              this_time-last_time,
                              txt)
         )
    return time.time()

