// Javascript functions that can be tested on their own.

var helper = (function(global) {
    'use strict';

    // split the text area content into region before start and region after
    // end two, and insert n tabs
    function insertTabsInText(text, start, end, n) {
	var result = text.substr(0, start);
	for (var i = 0; i < n; i++) {
            result += '\t';
	}
	return result + text.substr(end);
    }


    function indentToLast(text, start) {
	var tabs = 0;
	var pos = start;
	var extra_indent = 0;
	if (pos > 0 && text[pos - 1] == '{') {
	    extra_indent++;
	}
	while (pos > 0) {
            pos--;
            if (text[pos] == '\t') {
		tabs++;
            } else if (tabs > 0 || text[pos] == '\n') {
		break;
            }
	}
	tabs += extra_indent;

	/* tabs at pos should be folded into the tabs to be added before pos. */
	pos = start;
	while (text[pos] == '\t' && tabs > 0 && pos < text.length) {
	    tabs--;
	    pos++;
	}
	return [tabs, pos];
    }

    /* Return the char offset location for the first character of
     * lineNum */
    function line2Offset(text, lineNum) {
	var lines = text.split('\n', lineNum);
	var offset = 0;
	for (var i = 0; i < lineNum - 1; i++) {
	    offset += lines[i].length + 1; // +1 for \n
	}
	return offset;
    }

    /** docs:function-list */
    return {
	insertTabsInText: insertTabsInText,
	indentToLast: indentToLast,
	line2Offset: line2Offset
    };

}(this));

if (typeof require === 'function' && typeof module !== 'undefined') {
    module.exports = helper;
}
