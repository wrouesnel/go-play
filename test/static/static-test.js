if (typeof require == "function" && typeof module == "object") {
    buster = require("buster");
    require("../../goplay.js");
}


buster.testCase("Static goplay tests", {
    "goCodeBody() and setGoCodeBody() should work": function () {
	document.getElementById("wrap").style.display="none";
	document.getElementById("controls").style.display="none";
	document.getElementById("banner").style.display="none";
        assert.equals(goCodeBody().search("package main"), 0);
	setGoCodeBody("testing");
        assert.equals(goCodeBody(), "testing");
    },
    "serverReachable() is callable": function () {
	var stub = this.stub(window, "alert", function(msg) { return false; } );
        assert.equals(serverReachable(), false);
    },
});
