/**
  Javascript for GO play - a local web service to compile and run go code.

  Some of this was code was in the original
  misc/goplay in edit.html.  Some was in playground.js.

  I would like playground.js to disappear and get merged here.

**/
"use strict"

/* Various HTML elements we will need information about */
var aboutEl;

function serverReachable() {
    // IE vs. standard XHR creation
    var xh_req = new XMLHttpRequest();
    xh_req.open("GET", "/", true);
    xh_req.send();

    xh_req.onreadystatechange = function () {
	// Check if request done and it didn't fail
	if (xh_req.readyState == 4) {
	    var s = xh_req.status;
	    if (!(s >= 200 && (s < 300 || s == 304 ))) {
		onClearOutput();
		alert("Web server back end is not running");
	    }
	}
    }
}

// Check to see if we have HTML-5 File API support.
function have_file_support() {
    return window.File && window.FileReader && window.FileList;
}

// Return a string containing the Go code.
function goCodeBody() {
    return document.getElementById("code").value;
}

// Return a string containing the Go code.
function setGoCodeBody(text) {
    return document.getElementById("code").value = text;
}

function onSave() {
    serverReachable();
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

function onLoad(evt) {
    // Loop through the FileList looking for go files.
    var file = evt.target.files[0]; // FileList object
    var data = ""
    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile) {
        return function(e) {
            data = e.srcElement.result;
            document.getElementById("code").value = data;
        };
    })(file);
    reader.readAsText(file);
    document.getElementById("saveLoc").value = file.name;
    onClearOutput();
    document.getElementById("errors").innerHTML = "";
  }

var xml_req;

function onFormat() {
    serverReachable();
    aboutEl.hide();
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
        }
    });
}

// Compile and run go program.
function onRun() {
    serverReachable();
    aboutEl.hide();
    var clear = document.getElementById('clearbutton');
    clear.hidden = false;
    var output = document.getElementById('output');
    output.style.display = "block";

    var go_code =  goCodeBody();
    var xh_req = new XMLHttpRequest();

    xml_req = xh_req;
    xh_req.onreadystatechange = compileUpdate;
    xh_req.open("POST", "/compile", true);
    xh_req.setRequestHeader("Content-Type", "text/plain; charset=utf-8");
    xh_req.send(go_code);
}

function onClearOutput() {
    document.getElementById("clearbutton").hidden = true;
    var output = document.getElementById("output");
    output.innerHTML = "";
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

function keyHandler(event) {
    var e = window.event || event;
    if (e.keyCode == 9) { // tab
        insertTabs(1);
        preventDefault(e);
        return false;
    } else if (e.keyCode == 13) { // enter
        if (e.shiftKey) { // +shift
            onRun(e.target);
            preventDefault(e);
            return false;
        } else {
            autoindent(e.target);
        }
    } else if (e.keyCode == 221) { // }
	autounindent(e.target);
    }
    return true;
}

function autocompile() {
    if(!document.getElementById("autocompile").checked) {
        return;
    }
    onRun();
}

function setError(error) {
    lineClear();
    lineHighlight(error);
    document.getElementById("errors").innerHTML = error;
}

var errorLines = [];

/* Parse *error*, pulling out any error line numbers and a column
   number for the first error if that exists. Those lines extracted
   have a linerror class added to them. This causes the line number to
   have a different background, or highlighting. As for column
   information, we highlight that by making that position be the
   selected area.
*/
function lineHighlight(error) {
    var regex = /(?:compile[0-9]+|prog)\.go:([0-9]+)(?::([0-9]+))?/g;
    var r = regex.exec(error);
    if (r && r[2]) {
	// Position cursor on first error
	var errPos = helper.line2Offset(goCodeBody(), +r[1]) + +r[2]
	var codeEl = document.getElementById("code");
	setTimeout(function() {
	    codeEl.focus();
	    codeEl.setSelectionRange(errPos-1, errPos);
	}, 1);
    }
    var i;
    for(i=0; i<errorLines.length; i++) {
        $(".lines div").eq(errorLines[i]-1).removeClass("lineerror");
    }
    while (r) {
	errorLines[i] = +r[1];
        $(".lines div").eq(r[1]-1).addClass("lineerror");
        r = regex.exec(error);
    }
}

function lineClear() {
    $(".lineerror").removeClass("lineerror");
}

function compileUpdate() {
    var xh_req = xml_req;
    if(!xh_req || xh_req.readyState != 4) {
        return;
    }
    if(xh_req.status == 200) {
        document.getElementById("output").innerHTML = xh_req.responseText;
        document.getElementById("errors").innerHTML = "";
	lineClear();
    } else {
        document.getElementById("errors").innerHTML = xh_req.responseText;
        lineHighlight(document.getElementById("errors").innerText)
	onClearOutput();
    }
}

$(document).ready(function() {
    playground({
        'codeEl':     '#code',
        'outputEl':   '#output',
        'fmtEl':      '#fmt',
        'saveEl':     '#save',
        'saveLocEl':  '#saveLoc',
        'loadLocEl':  '#loadLoc',
        'enableHistory': true
    });

    $('#code').linedtextarea();
    aboutEl = $('#about');

    aboutEl.click(function(e) {
        if ($(e.target).is('a')) {
            return;
        }
        aboutEl.hide();
    });
    $('#aboutButton').click(function() {
        if (aboutEl.is(':visible')) {
            aboutEl.hide();
            return;
        }
        aboutEl.show();
    })
    $('#save').click(function() {
        aboutEl.hide();
        onSave();
    })
    $('#fmt').click(function() {
        onFormat();
    })
    if (have_file_support()) {
        document.getElementById('load').addEventListener('change', onLoad,
							 false);
        aboutEl.hide();
    } else {
        load.hide();
    }
    var close = document.getElementById('clearbutton');
    close.innerHTML="Clear";
    close.hidden = true;
    close.addEventListener('click', onClearOutput, false);
    var run = document.getElementById('runbutton');
    run.addEventListener('click', onRun, false);
    run.innerHTML="Run";
    run.hidden = false;
});
