// Copyright 2012 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

(function() {

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

  function connectPlayground() {
    var playbackTimeout;

    function playback(pre, events) {
      function show(msg) {
        // ^L clears the screen.
        var msgs = msg.split("\x0c");
        if (msgs.length == 1) {
          pre.text(pre.text() + msg);
          return;
        }
        pre.text(msgs.pop());
      }
      function next() {
        if (events.length === 0) {
          var exit = $('<span class="exit"/>');
          exit.text("\nProgram exited.");
          exit.appendTo(pre);
          return;
        }
        var e = events.shift();
        if (e.Delay === 0) {
          show(e.Message);
          next();
        } else {
          playbackTimeout = setTimeout(function() {
            show(e.Message);
            next();
          }, e.Delay / 1000000);
        }
      }
      next();
    }

    function stopPlayback() {
      clearTimeout(playbackTimeout);
    }

    function setOutput(output, events, error) {
      stopPlayback();
      output.empty();
      lineClear();

      // Display errors.
      if (error) {
        lineHighlight(error);
        output.addClass("error").text(error);
        return;
      }

      // Display image output.
      if (events.length > 0 && events[0].Message.indexOf("IMAGE:") === 0) {
        var out = "";
        for (var i = 0; i < events.length; i++) {
          out += events[i].Message;
        }
        var url = "data:image/png;base64," + out.substr(6);
        $("<img/>").attr("src", url).appendTo(output);
        return;
      }

      // Play back events.
      if (events !== null) {
        playback(output, events);
      }
    }

    var seq = 0;
    function runFunc(body, output) {
	return stopPlayback;
    }

    return runFunc;
  }

  // opts is an object with these keys
  //  codeEl - code editor element
  //  outputEl - program output element
  //  runEl   - run button element
  //  fmtEl   - fmt button element (optional)
  //  saveEl   - save button element (optional)
  //  saveLocEl - save text input element (optional)
  //  shareEl - share button element (optional)
  //  shareURLEl - share URL text input element (optional)
  //  saveRedirect - base URL to redirect to on share (optional)
  //  toysEl - toys select element (optional)
  //  enableHistory - enable using HTML5 history API (optional)
  function playground(opts) {
    var code = $(opts.codeEl);
    var runFunc = connectPlayground();

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

    function keyHandler(e) {
      if (e.keyCode == 9) { // tab
        insertTabs(1);
        e.preventDefault();
        return false;
      }
      if (e.keyCode == 13) { // enter
        if (e.shiftKey) { // +shift
          run();
          e.preventDefault();
          return false;
        } else {
          autoindent(e.target);
        }
      }
      return true;
    }
    code.unbind('keydown').bind('keydown', keyHandler);
    var outdiv = $(opts.outputEl).empty();
    var output = $('<pre/>').appendTo(outdiv);

    function body() {
      return $(opts.codeEl).val();
    }
    function setBody(text) {
      $(opts.codeEl).val(text);
    }
    function origin(href) {
      return (""+href).split("/").slice(0, 3).join("/");
    }

    var pushedEmpty = (window.location.pathname == "/");
    function inputChanged() {
      if (pushedEmpty) {
        return;
      }
      pushedEmpty = true;
      $(opts.saveLocEl).hide();
      window.history.pushState(null, "", "/");
    }
    function popState(e) {
      if (e === null) {
        return;
      }
      if (e && e.state && e.state.code) {
        setBody(e.state.code);
      }
    }
    var rewriteHistory = false;
    if (window.history && window.history.pushState && window.addEventListener && opts.enableHistory) {
      rewriteHistory = true;
      code[0].addEventListener('input', inputChanged);
      window.addEventListener('popstate', popState);
    }

    function setError(error) {
      lineClear();
      lineHighlight(error);
      output.empty().addClass("error").text(error);
    }
    function run() {
	compile();
    }
    function fmt() {
	$.ajax("/fmt", {
            data: {"body": body()},
            type: "POST",
            dataType: "json",
            success: function(data) {
		if (data.Error) {
		    setError(data.Error);
		} else {
		    setBody(data.Body);
		    setError("");
		}
            }
	});
    }

    $(opts.runEl).click(run);
    $(opts.fmtEl).click(fmt);

    if (opts.saveEl !== null && (opts.saveLocEl !== null || opts.saveRedirect !== null)) {
	var saveLoc;
	var savePath = "saved.go";
	if (opts.saveLocEl) {
	    if ($(opts.saveLocEl).val() !== "") {
		savePath = $(opts.saveLocEl).val()
	    }
            saveLoc = $(opts.saveLocEl).hide();
	}
	$(opts.saveEl).click(function() {
            var saveData = body();
            $.ajax("/save/" + savePath, {
		processData: false,
		data: saveData,
		type: "POST",
		complete: function(xhr) {
		    if (xhr.status != 200) {
			alert("Server error; try again.");
			return;
		    }
		    alert(savePath + " saved");

		    if (opts.saveRedirect) {
			window.location = opts.saveRedirect + xhr.responseText;
		    }
		    if (saveLoc) {
			var path = xhr.responseText;
			saveLoc.show().val(savePath).focus().select();

			// if (rewriteHistory) {
			//     var historyData = {"code": sharingData};
			//     window.history.pushState(historyData, "", path);
			//     pushedEmpty = false;
			// }
		    }
		}

            });
	});
    }

    if (opts.toysEl !== null) {
      $(opts.toysEl).bind('change', function() {
        var toy = $(this).val();
        $.ajax("/doc/play/"+toy, {
          processData: false,
          type: "GET",
          complete: function(xhr) {
            if (xhr.status != 200) {
              alert("Server error; try again.");
              return;
            }
            setBody(xhr.responseText);
          }
        });
      });
    }
  }

  window.connectPlayground = connectPlayground;
  window.playground = playground;

})();
