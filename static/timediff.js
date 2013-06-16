// Javascript function show compute elapsed time
'use strict';
if (typeof require === 'function' && typeof module !== 'undefined') {
    var fmt = require('./fmt');
}

var timediff = (function(global) {
    function time2string(timeDiff) {

	if (timeDiff == null) return 'time unknown';
	var milliseconds = timeDiff % 1000;

	// strip the milliseconds
	timeDiff /= 1000;

	timeDiff = Math.round(timeDiff);
	// alert(timeDiff);

	if (timeDiff == 0) {
	    return fmt.sprintf('0.%03d secs', milliseconds);
	}


	// get seconds
	var seconds = Math.round(timeDiff % 60);

	// remove seconds from the date
	timeDiff /= Math.round(60);

	if (timeDiff < 1) {
	    return fmt.sprintf('%d.%03d secs', seconds, milliseconds);
	}

	// get minutes
	var minutes = Math.round(timeDiff % 60);

	// remove minutes from the date
	timeDiff /= Math.round(60);

	if (timeDiff < 1) {
	    return fmt.sprintf('%d minutes, %d.%03d secs',
			       minutes, seconds, milliseconds);
	}

	// get hours
	var hours = Math.round(timeDiff % 24);

	// remove hours from the date
	timeDiff /= Math.round(24);

	if (timeDiff < 1) {
	    return fmt.sprintf('%d hours, %d.%d.%03d', hours, minutes, seconds,
			       milliseconds);
	}

	// the rest of timeDiff is number of days
	var days = timeDiff;

	return fmt.sprintf('%d days, %d hours, %d minutes %d.%03d secs',
			   days, hours, minutes, seconds,
			   milliseconds);

    }

    /** docs:function-list */
    return {
	time2string: time2string
    };

}(this));

if (typeof require === 'function' && typeof module !== 'undefined') {
    module.exports = timediff;
}
