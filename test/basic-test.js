// goplay tests

if (typeof require === "function" && typeof module !== "undefined") {
    var buster = require("buster");
    var helper = require("../static/helper");
}

(function () {
    buster.testCase("insertTabsInText", {
	"inserts a single tab": function () {
            assert.equals("if (true) {\tx=1;",
			  helper.insertTabsInText("if (true) {x=1;", 11, 11, 1));
	},
	"inserts no tabs": function () {
            assert.equals("if (true) {x=1;",
			  helper.insertTabsInText("if (true) {x=1;", 11, 11, 0));
	}
    });
}());
