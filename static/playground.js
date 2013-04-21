// Copyright 2012 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/* FIXME: merge all of this into play.js.
*/

(function() {

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

    $(opts.fmtEl).click(fmt);

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

  window.playground = playground;

})();
