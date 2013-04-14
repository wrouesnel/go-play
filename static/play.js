/**
 * Javascript From edit.html which should be merged into playground.js when I can figure out how.
 */

function compile() {
    var prog = document.getElementById("code").value;
    var req = new XMLHttpRequest();

    xmlreq = req;
    req.onreadystatechange = compileUpdate;
    req.open("POST", "/compile", true);
    req.setRequestHeader("Content-Type", "text/plain; charset=utf-8");
    req.send(prog);
}

// autoindent helpers.
function insertTabs(n) {
    // find the selection start and end
    var start = code[0].selectionStart;
    var end   = code[0].selectionEnd;
    // split the textarea content into two, and insert n tabs
    var v = code[0].value;
    var u = v.substr(0, start);
    for (var i=0; i<n; i++) {
        u += "\t";
    }
    u += v.substr(end);
    // set revised content
    code[0].value = u;
    // reset caret position after inserted tabs
    code[0].selectionStart = start+n;
    code[0].selectionEnd = start+n;
}

function autoindent(el) {
    var curpos = el.selectionStart;
    var tabs = 0;
    while (curpos > 0) {
	curpos--;
	if (el.value[curpos] == "\t") {
	    tabs++;
	} else if (tabs > 0 || el.value[curpos] == "\n") {
	    break;
	}
    }
    setTimeout(function() {
	insertTabs(tabs);
    }, 1);
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
    }
    if (e.keyCode == 13) { // enter
	if (e.shiftKey) { // +shift
	    compile(e.target);
	    preventDefault(e);
	    return false;
	} else {
	    autoindent(e.target);
	}
    }
    return true;
}

var xmlreq;

function autocompile() {
    if(!document.getElementById("autocompile").checked) {
	return;
    }
    compile();
}

// TODO(adg): make these functions operate only on a specific code div
function lineHighlight(error) {
    var regex = /compile[0-9]+.go:([0-9]+)/g;
    var r = regex.exec(error);
    while (r ) {
	$(".lines div").eq(r[1]-1).addClass("lineerror");
	  r = regex.exec(error);
    }
}

function lineClear() {
    $(".lineerror").removeClass("lineerror");
}

function compileUpdate() {
    var req = xmlreq;
    if(!req || req.readyState != 4) {
	return;
    }
    if(req.status == 200) {
	document.getElementById("output").innerHTML = req.responseText;
	document.getElementById("errors").innerHTML = "";
    } else {
	document.getElementById("errors").innerHTML = req.responseText;
	lineHighlight(document.getElementById("errors").innerText)
	document.getElementById("output").innerHTML = "";
    }
}

$(document).ready(function() {
    playground({
	'codeEl':     '#code',
	'outputEl':   '#output',
	'runEl':      '#run',
	'fmtEl':      '#fmt',
	'saveEl':     '#save',
	'saveLocEl':  '#saveLoc',
	'enableHistory': true
    });
    $('#code').linedtextarea();
    var about = $('#about');
    about.click(function(e) {
	if ($(e.target).is('a')) {
	    return;
	}
	about.hide();
    });
    $('#aboutButton').click(function() {
	if (about.is(':visible')) {
	    about.hide();
	    return;
	}
	about.show();
    })
    $('#run').click(function() {
	about.hide();
	compile();
    })
    $('#run').click(function() {
	// ? about.hide();
    })
});
