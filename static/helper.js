// Javascript functions that can be tested on their own.

var helper = (function (global) {
    "use strict";

    // split the text area content into region before start and region after
    // end two, and insert n tabs
    function insertTabsInText(text, start, end, n) {
	var result = text.substr(0, start);
	for (var i=0; i<n; i++) {
            result += "\t";
	}
	return result + text.substr(end);
    }

    /** docs:function-list */
    return {
	insertTabsInText: insertTabsInText
    };

}(this));

if (typeof require === "function" && typeof module !== "undefined") {
    module.exports = helper;
}
