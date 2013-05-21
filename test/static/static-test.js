if (typeof require == "function" && typeof module == "object") {
    buster = require("buster");
    require("../../goplay.js");
}


// Put this in a setup function to make not global?
var aboutEl = $('#about');
var codeEl = document.getElementById("code");
var settingsEl = $('#settings');
var aboutButton = document.getElementById("aboutButton");
var settingsButton = document.getElementById("settingsButton");

buster.testCase("Static goplay tests", {
    "goCodeBody() and setGoCodeBody() should work": function () {
	document.getElementById("wrap").style.display="none";
	document.getElementById("controls").style.display="none";
	document.getElementById("banner").style.display="none";
        assert.equals(goCodeBody().search("package main"), 0,
		     "Initial code body starts with 'package main'");
	setGoCodeBody("testing");
        assert.equals(goCodeBody(), "testing", "setting code body");
    },
    "serverReachable() is callable": function () {
	var stub = this.stub(window, "alert", function(msg) { return false; } );
        assert.equals(serverReachable(), false);
    },
    "About button hides and shows": function () {
	if (aboutEl.is(':visible')) { onAbout(false); }
        assert.equals(aboutEl.is(':visible'), false,
		      "'about' tab should not be visible after hiding");
	assert.equals(aboutButton.value, "About",
		     "'about' button should be labeled 'About' when hidden");
	onAbout(true);
        assert.equals(aboutEl.is(':visible'), true,
		     "'about' tab should be visible after showing");
	assert.equals(aboutButton.value, "Code",
		     "'about' button should be labeled 'Code' when visible");
        assert.equals(settingsEl.is(':visible'), false);
        aboutEl.hide();
    },
    "Settings button hides and shows": function () {
    	if (settingsEl.is(':visible')) { onSettings(false); }
        assert.equals(settingsEl.is(':visible'), false,
		      "'settings' tab should not be visible after hiding");
    	assert.equals(settingsButton.value, "Settings",
		     "'settings' button should be labeled 'Settings' when hidden");
    	// onSettings(true);
	// assert.equals(settingsEl.is(':visible'), true);
	// assert.equals(settingsButton.value, "Code");
    	// var aboutEl = $('#about');
        // assert.equals(aboutEl.is(':visible'), false);
        settingsEl.hide();
    },
    "Error positioning selects correctly": function () {
	setGoCodeBody("fmt\n\nfunc main( {\n	fm.Println(\"hello, world\")\n}\n");
	var r = positionOnError("compile2.go:3:8: string not terminated");
        assert.equals(r[1], "3", "Error position regexp matches line:col line");
        assert.equals(r[2], "8", "Error position regexp matches column");
	var r = positionOnError("./compile0.go:6: undefined: fm");
        assert.equals(r[1], "6", "Error position regexp matches line-only line");
        refute.defined(r[2], null, "Error position regexp matches line-only column");
        // assert.equals(codeEl.selectionStart, 1);
        // assert.equals(codeEl.selectionEnd, 2);
    },
});
