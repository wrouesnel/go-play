// Javascript functions to tag errors
if (typeof require == "function" && typeof module == "object") {
    var fmt = require("./fmt");
}

var linkerror = (function (global) {
    "use strict";

    var errorRegex = /(?:compile[0-9]+|prog)\.go:(?:[0-9]+)/;

    // split the text area content into region before start and region after
    // end two, and insert n tabs
    function linkErrorOutput(text) {
	var lines = text.split("\n");
	for (var i=0; i<lines.length; i++) {
	    var line = lines[i];
	    var r = errorRegex.exec(line);
	    if (r) {
		lines[i] = fmt.sprintf('<a href="/error">%s</a>', line);
	    } else {
	    }
	}
	return lines.join("\n");
    }

    /** docs:function-list */
    return {
	linkErrorOutput: linkErrorOutput,
    };

}(this));

if (typeof require === "function" && typeof module !== "undefined") {
    module.exports = linkerror;
}
