// goplay tests

if (typeof require === "function" && typeof module !== "undefined") {
    var buster = require("buster");
    var helper = require("../static/helper");
}

(function () {
    buster.testCase("insertTabsInText", {
	"inserts a single tab": function () {
            assert.equals("if (true) {\tx=1",
			  helper.insertTabsInText("if (true) {x=1", 11, 11, 1));
	},
	"inserts no tabs": function () {
            assert.equals("if (true) {x=1",
			  helper.insertTabsInText("if (true) {x=1", 11, 11, 0));
	}
    });

    buster.testCase("indentToLast", {
	"counts tabs in previous line with tab": function () {
	    var text="\t\tx=1";
            assert.equals([2, text.length],
			  helper.indentToLast(text, text.length));
	},
	"counts tabs in previous line with tab and fold tab": function () {
	    var text="\t\tx=1\ty=2";
	    var pos = 5;
            assert.equals([1, pos+1],
			  helper.indentToLast(text, pos+1));
	},
	"counts tabs in previous line without tab": function () {
	    var text="x=1";
            assert.equals([0, text.length],
			  helper.indentToLast(text, text.length));
	},
	"counts tabs in previous line without tab but \\n": function () {
	    var text="\nx=1";
            assert.equals([0, text.length],
			  helper.indentToLast(text, text.length));
	}
    });

}());
