function time2string(timeDiff) {
    var milliseconds = timeDiff % 1000;

    // strip the milliseconds
    timeDiff /= 1000;

    timeDiff = Math.round(timeDiff);
    // alert(timeDiff);

    if (timeDiff == 0) {
	return sprintf("0.%03d secs", milliseconds);
    }


    // get seconds
    var seconds = Math.round(timeDiff % 60);

    // remove seconds from the date
    timeDiff /= Math.round(60);

    if (timeDiff < 1) {
	return sprintf("%d.%d secs", seconds, milliseconds);
    }

    // get minutes
    var minutes = Math.round(timeDiff % 60);

    // remove minutes from the date
    timeDiff /= Math.round(60);

    if (timeDiff < 1) {
	return sprintf("%d minutes, %d.%d secs",
		       minutes, seconds, milliseconds);
    }

    // get hours
    var hours = Math.round(timeDiff % 24);

    // remove hours from the date
    timeDiff /= Math.round(24);

    if (timeDiff < 1) {
	return sprintf("%d hours, %d.%d.%d", hours, minutes, seconds,
		   milliseconds);
    }

    // the rest of timeDiff is number of days
    var days = timeDiff ;

    return sprintf("%d days, %d hours, %d minutes %d.%d secs",
		   days, hours, minutes, seconds,
		   milliseconds);

}
