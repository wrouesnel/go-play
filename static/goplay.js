/**
  Javascript for GO play - a local web service to compile and run go code.

  Some of this was code was in the original
  misc/goplay in edit.html.  Some was in playground.js.

  I would like playground.js to disappear and get merged here.

**/

if (typeof require == "function" && typeof module == "object") {
    var fmt = require("./fmt");
    var linkerror = require("./linkerror");
    var timediff = require("./timediff");
}


"use strict"
var goplay = (function (global) {

    var aboutEl;
    var aboutButtonEl;
    var settingsEl;
    var settingsButtonEl;
    var codeEl;

    var errorRegex = /(?:compile[0-9]+|prog|main)\.go:([0-9]+)(?::([0-9]+))?/g;

    /* Web socket stuff */
    var startTime;    // Date: Time when last run started;
    var killed;       // boolean: true iff run was killed.
    var ws = null;    // Websocket object
    var useWs = true; // boolean: we should use websocket?
    var wsURL = "ws://localhost:3998/wscompile";
    var wsOpened = false;

    function init() {

	// Initialize Elements

	// Websocket stuff
	if (ws != null) {
	    if (ws.url != wsURL) {
		ws.close();
		wsOpened = false;
	    }
	}

	try {
	    if (!wsOpened)
		ws = new WebSocket("ws://localhost:3998/wscompile");
	    ws.onopen = function () {
		wsOpened = true;
	    };
	    ws.onmessage = function(m) {
		var result = eval('(' + m.data + ')');
		if (result.Kind == 'stdout') {
		    var line = $('<pre/>');
		    line.text(result.Body);
		    line.appendTo(document.getElementById("output"));
		} else if (result.Kind == 'stderr') {
		    var error = $('<pre/>');
		    error.text(result.Body);
		    error.appendTo(document.getElementById("errors"));
		} else if (result.Kind == 'end') {
		    runExited(result.Body);
		}
	    }
	    ws.onclose = function (e) {
		wsOpened = false;
	    };
	} catch(err) {
	    alert("Websocket failure");
	}
    }

    function serverReachable() {
	// IE vs. standard XHR creation
	var xh_req = new XMLHttpRequest();
	xh_req.open("GET", "/", true);
	try
	{
	    xh_req.send();
	} catch(err) {
	    alert("Web server back end is not running:\n\t" + err.message);
	    return false;
	}

	xh_req.onreadystatechange = function () {
	    // Check if request done and it didn't fail
	    if (xh_req.readyState == 4) {
		var s = xh_req.status;
		if (!(s >= 200 && (s < 300 || s == 304 ))) {
		    onClearOutput();
		    alert("Web server back end is not running");
		    return false;
		}
	    }
	}
	return true;
    }

    // Check to see if we have HTML-5 File API support.
    function haveFileSupport() {
	return window.File && window.FileReader && window.FileList;
    }

    // Handle input from the settings tab.
    function handleSettings() {
	var tab_width = document.playsettings.tabSetting.value;
	useWs = document.playsettings.websocket.checked
	if (!useWs) {
	    if (ws) ws.close()
	    wsOpened = false;
	}
	if (isFinite(tab_width) && tab_width >= 2 && tab_width <= 10) {
	    var code = document.getElementById("code");
	    code.style.tabSize = tab_width;
	} else {
	    alert("Tab width should be a number between 2 and 10 inclusive: got " + tab_width);
	}

	return false; // prevent further bubbling of event
    }

    // Return a string containing the Go code.
    function goCodeBody() {
	if (null == codeEl) {
	    codeEl = document.getElementById("code");
	}
	return codeEl.value;
    }

    // Return a string containing the Go code.
    function setGoCodeBody(text) {
	lineClear(); // Nuke any previous error marks
	if (null == codeEl) {
	    codeEl = document.getElementById("code");
	}
	return codeEl.value = text;
    }

    function runExited(exitMsg) {
	var exit = $('<span class="exit"/>');
	// time difference in ms
	var timeDiff = new Date() - startTime;
	var reason = '';
	if (killed) reason = 'via kill ';
	var exitInfo = fmt.sprintf("\nProgram exited %s%s",
				   reason, timediff.time2string(timeDiff));
	if (exitMsg) {
	    exitInfo += ' - ' + exitMsg;
	} else {
	    exitInfo += '.';
	}
	exit.text(exitInfo);
	exit.appendTo(document.getElementById("output"));
	var errorText = document.getElementById("errors").textContent;
	lineHighlight(errorText)
	var linkedErrorText = fmt.sprintf("<pre>%s</pre>",
					  linkerror.linkErrorOutput(errorText));
	document.getElementById("errors").innerHTML=linkedErrorText;
	var run = document.getElementById('runbutton');
	run.hidden = false;
	var kill = document.getElementById('killbutton');
	kill.hidden = true;
    }

    // We come here when the "save" button is clicked
    function onSave() {
	if (!serverReachable()) { return };
	var save_loc = document.getElementById("saveLoc");
	var save_path = save_loc.value;
	var go_code = goCodeBody();

	var xh_req = new XMLHttpRequest();

	if (save_path == "") { save_path = "/tmp/save.go" }
	xh_req.open("POST", "/save/X" + save_path, true);
	xh_req.setRequestHeader("Content-Type", "text/plain; charset=utf-8");
	xh_req.send(go_code);

	xh_req.onreadystatechange = function () {
	    // Check if request done and it didn't fail
	    if (xh_req.readyState == 4)
		if (xh_req.status == 500) {
		    alert("Save Error: " + xh_req.responseText);
		} else if (xh_req.status == 200) {
		    var path = xh_req.responseText;
		    alert(path + " saved");
		    save_loc.value = path;
		}
	}
    }

    // This is called with the "About" button is clicked and we want to
    // show that info or when show is false, we want to hide the tab.
    function onAbout(show) {
	if (aboutEl == null)
	    aboutEl = $('#about');
	if (aboutButtonEl == null)
	    aboutButtonEl = document.getElementById("aboutButton");
	if (aboutEl.is(':visible')) {
	    aboutButtonEl.value="About";
	    aboutEl.hide();
	    return;
	}
	if (show) {
	    onSettings(false);
	    aboutButtonEl.value="Code";
	    aboutEl.show();
	}
    }

    // This is called with the "Settings" button is clicked and we want to
    // show that info or when show is false, we want to hide the tab.
    function onSettings(show) {
        if (settingsEl == null)
	    settingsEl = $('#playsettings');
	if (settingsButtonEl == null)
	    settingsButtonEl = document.getElementById("settingsButton");
	if (settingsEl.is(':visible')) {
	    settingsButtonEl.value="Settings";
	    settingsEl.hide();
	    return;
	}
	if (show) {
	    onAbout(false);
	    settingsButtonEl.value="Code";
	    settingsEl.show();
	}
    }

    // Make sure code window is shown by hiding "about" and settings tabs
    function showCodeTab() {
	onAbout(false);
	onSettings(false);
    }


    function onFileLoad(event) {
	// Loop through the FileList looking for go files.
	var file = event.target.files[0]; // FileList object
	var data = ""
	var reader = new FileReader();

	// Closure to capture the file information.
	// google-chrome works this way.
	reader.onload = (function(theFile) {
	    return function(e) {
		data = e.target.result;
		if (data != "") { setGoCodeBody(data); };
	    };
	})(file);
	reader.readAsText(file);
	// Firefox seems to work this way.
	if (reader.result != "") {
	    document.getElementById("code").value = reader.result;
	}
	onSettings(false);
	onAbout(false);
	document.getElementById("saveLoc").value = file.name;
	onClearOutput();
	$(document.getElementById("errors")).empty();
    }

    var xml_req;

    function onFormat() {
	if (!serverReachable()) { return };
	showCodeTab();
	// Save the input selection currently. This includes
	// the caret position.
	if (null == codeEl) {
	    codeEl = document.getElementById("code");
	}
	var selectionStart = codeEl.selectionStart;
	var selectionEnd   = codeEl.selectionEnd;
	$.ajax("/fmt", {
	    data: {"body": goCodeBody()},
	    type: "POST",
	    dataType: "json",
	    success: function(data) {
    		if (data.Error) {
    		    setError(data.Error);
    		} else {
    		    setGoCodeBody(data.Body);
    		    setError("");
    		}
		onClearOutput();
		// Restore input selection range.
		codeEl.selectionStart = selectionStart;
		codeEl.selectionEnd   = selectionEnd;
	    }
	});
    }

    // Handle next error positioning
    function onJumpToErrorPos(event) {
	var error_line = event.target.innerHTML;
	positionOnError(error_line);
	event.preventDefault();
	return false; //for good measure
    }

    function onRun() {

	if (!serverReachable()) return;
	showCodeTab();
	var clear = document.getElementById('clearbutton');
	clear.hidden = false;
	var run = document.getElementById('runbutton');
	run.hidden = true;

	var errors = document.getElementById("errors").innerHTML = "";
	errors.innerHTML = "";
	var output = document.getElementById('output');
	output.innerHTML = "";
	output.style.display = "block";

	var goCode =  goCodeBody();

	startTime = new Date();
	killed = false;

	if (useWs) {
	    if (wsOpened) {
		runViaWS(goCode);
		return;
	    }
	}
	runViaPOST(goCode);
    }

    // Compile and run go program via HTTP POST
    function runViaPOST(goCode) {

	$.ajax("/compile", {
	    data: {Body: goCode},
	    type: "POST",
	    dataType: "json",
	    success: function(data) {
		var timeDiff = new Date() - startTime;
		var output = $('<pre/>');
		lineClear();
		output.text(data.Stdout);
		output.appendTo(document.getElementById("output"));
		var exitInfo = fmt.sprintf("\nProgram exited %s",
					   timediff.time2string(timeDiff));
		if (data.Error) {
		    exitInfo += ' - ' + data.Error;
		} else {
		    exitInfo += '.';
		}

		var exit = $('<span class="exit"/>');
		exit.text(exitInfo);
		exit.appendTo(document.getElementById("output"));

		var errorText = data.Stderr;
		lineHighlight(errorText);
		var linkedErrorText = fmt.sprintf("<pre>%s</pre>",
						  linkerror.linkErrorOutput(errorText));
		document.getElementById("errors").innerHTML=linkedErrorText;

		document.getElementById("clearbutton").hidden = false;
		var run = document.getElementById('runbutton');
		run.hidden = false;
		var kill = document.getElementById('killbutton');
		kill.hidden = true;
	    }
	});
    }

    // Compile and run go program via websocket.
    function runViaWS(goCode) {
	var msg = {Id: "0", Kind: "run", Body: goCode};
	var kill = document.getElementById('killbutton');
	kill.hidden = false;
	try {
	    ws.send(JSON.stringify(msg));
	    killed = false;
	} catch(err) {
	    alert("Websocket failure");
	}
    }

    // Compile and run go program.
    function onWSKill() {
	if (!serverReachable()) { return };
	showCodeTab();
	var output = document.getElementById('output');
	var msg = {Id: "0", Kind: "kill", Body: ""};
	if (wsOpened) ws.send(JSON.stringify(msg));
	killed = true;
    }

    function onClearOutput() {
	document.getElementById("clearbutton").hidden = true;
	var output = document.getElementById("output");
	$(output).empty();
	output.style.display = "inline-block";
	document.getElementById("runbutton").style.display = "inline-block";
    }

    // Insert n tabs after code.selectionStart are reposition caret after
    // the inserted tabs.
    function insertTabs(n) {
	var start = code.selectionStart;
	// set revised content
	code.value = helper.insertTabsInText(code.value, start, code.selectionEnd,
					     n);
	// reset caret position after inserted tabs
	code.selectionStart = start+n;
	code.selectionEnd   = start+n;
    }

    // Called when a newline is entered.
    // Add the same number of tabs as the previous line,
    // and +1 the last character of this line is "{".
    function autoindent(el) {
	var results  = helper.indentToLast(el.value, el.selectionStart);
	var tabCount = results[0];
	var pos      = results[1];

	setTimeout(function() {
	    insertTabs(tabCount);
	    el.focus();
	    el.setSelectionRange(pos+tabCount+1, pos+tabCount+1);
	}, 1);
    }

    // Called when a end brace '}' is entered.
    // If this the only non-blank character on the line undent
    function autounindent(el) {
	var curpos = el.selectionStart;
	var tabs = 0;
	while (curpos > 0) {
	    curpos--;
	    var ch = el.value[curpos];
	    if (ch != "\t" && ch != "\n") {
		return;
	    } else if (el.value[curpos] == "\n") {
		var code  = document.getElementById("code");
		var start = code.selectionStart - 1;
		var end   = code.selectionEnd;
		var v = code.value;
		var u = v.substr(0, start);
		u += v.substr(end);
		code.value = u;
		code.selectionStart = start;
		code.selectionEnd   = start;
		break;
	    }
	}
    }

    function preventDefault(e) {
	if (e.preventDefault) {
	    e.preventDefault();
	} else {
	    e.cancelBubble = true;
	}
    }

    var lastKeyCode = 0;

    // Our custom key event handler
    function keyHandler(event) {
	var e = window.event || event;
	if (e.keyCode == 9) { // tab
	    insertTabs(1);
	    preventDefault(e);
	    lastKeyCode = 0;
	    return false;
	} else if (e.keyCode == 13) {
	    // Enter Key
	    if (e.shiftKey) {
		// Enter shift
		onRun();
		preventDefault(e);
		lastKeyCode = 0;
		return false;
	    } else {
		autoindent(e.target);
	    }
	} else if (e.keyCode == 221) {
	    autounindent(e.target);
	} else if (lastKeyCode == 17) {
	    // Ctrl key entered
	    if (e.keyCode == 76) {
		// Ctrl-L
		onFormat();
		lastKeyCode = 0;
		return false;
	    } else if (e.keyCode == 83) {
		// Ctrl-S
		onSave();
		lastKeyCode = 0;
		return false;
	    }
	}
	lastKeyCode = e.keyCode;
	return true;
    }

    // function autocompile() {
    //     if(!document.getElementById("autocompile").checked) {
    //         return;
    //     }
    //     onRun();
    // }

    function setError(error) {
	lineClear();
	lineHighlight(error);
	document.getElementById("errors").innerHTML = "<pre>" + error + "</pre>";
    }

    var errorLines = [];

    function positionOnError(error) {
	errorRegex.lastIndex = 0; // lose history of any prior matches...
	var r = errorRegex.exec(error); // exec will update lastIndex
	if (r) {
	    var columnOffset;
	    if (r[2]) {
		columnOffset = +r[2];
	    } else {
		columnOffset = 1;
	    }
	    // Position cursor on first error
	    var errPos = helper.line2Offset(goCodeBody(), +r[1]) + columnOffset;
	    if (null == codeEl) {
		codeEl = document.getElementById("code");
	    }
	    setTimeout(function() {
		codeEl.focus();
		codeEl.setSelectionRange(errPos-1, errPos);
	    }, 1);
	}
	return r
    }

    /* Parse *error*, pulling out any error line numbers and a column
       number for the first error if that exists. Those lines extracted
       have a linerror class added to them. This causes the line number to
       have a different background, or highlighting. As for column
       information, we highlight that by making that position be the
       selected area.
    */
    function lineHighlight(errors) {
	var i;
	// FIXME: dry code.
	var r = positionOnError(errors);
	for(i=0; i<errorLines.length; i++) {
	    $(".lines div").eq(errorLines[i]-1).removeClass("lineerror");
	}
	while (r) {
	    errorLines[i] = +r[1];
	    $(".lines div").eq(r[1]-1).addClass("lineerror");
	    r = errorRegex.exec(errors);
	}
    }

    function lineClear() {
	$(".lineerror").removeClass("lineerror");
    }

    /** docs:function-list */
    return {
	haveFileSupport  : haveFileSupport,
	init             : init,
	goCodeBody       : goCodeBody,
	keyHandler       : keyHandler,
	onAbout          : onAbout,
	onClearOutput    : onClearOutput,
	onFileLoad       : onFileLoad,
	onFormat         : onFormat,
	onJumpToErrorPos : onJumpToErrorPos,
	onRun            : onRun,
	onSave           : onSave,
	onSettings       : onSettings,
	onWSKill         : onWSKill,
	positionOnError  : positionOnError,
	setGoCodeBody    : setGoCodeBody,
	serverReachable  : serverReachable,
	showCodeTab: showCodeTab,
    };

}(this));

if (typeof require === "function" && typeof module !== "undefined") {
    module.exports = goplay;
}
