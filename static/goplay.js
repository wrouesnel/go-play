/**
  Javascript for GO play - a local web service to compile and run go code.

  Some of this was code was in the original
  misc/goplay in edit.html.  Some was in playground.js.

  I would like playground.js to disappear and get merged here.

**/
"use strict"

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

// function onShare() {
//     if (rewriteHistory) {
//         var historyData = {"code": sharingData};
//         window.history.pushState(historyData, "", path);
//         pushedEmpty = false;
//     }
// }

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
var about;

function onFormat() {
    serverReachable();
    about.hide();
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
    about.hide();
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

// autoindent helpers.
function insertTabs(n) {
    // find the selection start and end
    var code  = document.getElementById("code");
    var start = code.selectionStart;
    var end   = code.selectionEnd;
    // split the textarea content into two, and insert n tabs
    var v = code.value;
    var u = v.substr(0, start);
    for (var i=0; i<n; i++) {
        u += "\t";
    }
    u += v.substr(end);
    // set revised content
    code.value = u;
    // reset caret position after inserted tabs
    code.selectionStart = start+n;
    code.selectionEnd = start+n;
}

// Called when a newline is entered.
// Add the same number of tabs as the previous line,
// and +1 the last character of this line is "{".
function autoindent(el) {
    var curpos = el.selectionStart;
    var tabs = 0;
    var extra_indent = 0;
    if (curpos > 0 && el.value[curpos-1] == "{") {
	extra_indent++;
    }
    while (curpos > 0) {
        curpos--;
        if (el.value[curpos] == "\t") {
            tabs++;
        } else if (tabs > 0 || el.value[curpos] == "\n") {
	    break;
        }
    }
    setTimeout(function() {
        insertTabs(tabs+extra_indent);
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
    } else if (e.keyCode == 13) { // enter
        if (e.shiftKey) { // +shift
            onRun(e.target);
            preventDefault(e);
            return false;
        } else {
            autoindent(e.target);
        }
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

// TODO(adg): make these functions operate only on a specific code div
function lineHighlight(error) {
    var regex = /(?:compile[0-9]+|prog)\.go:([0-9]+)/g;
    var r = regex.exec(error);
    while (r) {
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
    } else {
        document.getElementById("errors").innerHTML = xh_req.responseText;
        lineHighlight(document.getElementById("errors").innerText)
	onClearOutput();
    }
}

(function() {
  "use strict";
  var runFunc;
  var count = 0;

  function getId() {
    return "code" + (count++);
  }

  function text(node) {
    var s = "";
    for (var i = 0; i < node.childNodes.length; i++) {
      var n = node.childNodes[i];
      if (n.nodeType === 1 && n.tagName === "PRE") {
        var innerText = n.innerText === undefined ? "textContent" : "innerText";
        s += n[innerText] + "\n";
        continue;
      }
      if (n.nodeType === 1 && n.tagName !== "BUTTON") {
        s += text(n);
      }
    }
    return s;
  }

  function init(code) {
    var id = getId();

    var output = document.createElement('div');
    var outpre = document.createElement('pre');
    var stopFunc;

    function onKill() {
      if (stopFunc) {
        stopFunc();
      }
    }

    run2.addEventListener("click", onRun, false);
    var kill = document.createElement('button');
    kill.className = 'kill';
    kill.innerHTML = 'Kill';
    kill.addEventListener("click", onKill, false);
    var close = document.createElement('button');
    close.className = 'close';
    close.innerHTML = 'Clear';
    close.addEventListener("click", onClearOutput, false);

    var button = document.createElement('div');
    button.classList.add('buttons');
    button.appendChild(run);
    // Hack to simulate insertAfter
    code.parentNode.insertBefore(button, code.nextSibling);

    var buttons = document.createElement('div');
    buttons.classList.add('buttons');
    buttons.appendChild(run2);
    buttons.appendChild(kill);
    buttons.appendChild(close);

    output.classList.add('output');
    output.appendChild(buttons);
    output.appendChild(outpre);
    output.style.display = "none";
    code.parentNode.insertBefore(output, button.nextSibling);
  }

  var play = document.querySelectorAll('div.playground');
  for (var i = 0; i < play.length; i++) {
    init(play[i]);
  }
  if (play.length > 0) {
    if (window.connectPlayground) {
      runFunc = window.connectPlayground("ws://" + window.location.host + "/socket");
    } else {
      // If this message is logged,
      // we have neglected to include socket.js or playground.js.
      console.log("No playground transport available.");
    }
  }
})

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
    about = $('#about');

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
    $('#save').click(function() {
        about.hide();
        onSave();
    })
    $('#fmt').click(function() {
        onFormat();
    })
    if (have_file_support()) {
        document.getElementById('load').addEventListener('change', onLoad,
							 false);
        about.hide();
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
