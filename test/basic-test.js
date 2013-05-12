// goplay tests

if (typeof require === "function" && typeof module !== "undefined") {
    var buster = require("buster");
    var helper = require("../static/helper");
}

(function () {
    buster.testCase("insertTabsInText", {
	"inserts a single tab": function () {
            assert.equals(helper.insertTabsInText("if (true) {x=1", 11, 11, 1),
			  "if (true) {\tx=1");
	},
	"inserts no tabs": function () {
            assert.equals(helper.insertTabsInText("if (true) {x=1", 11, 11, 0),
			  "if (true) {x=1");
	}
    });

    buster.testCase("indentToLast", {
	"counts tabs in previous line with tab": function () {
	    var text="\t\tx=1";
            assert.equals(helper.indentToLast(text, text.length),
			  [2, text.length]);
	},
	"counts tabs in previous line with tab and fold tab": function () {
	    var text="\t\tx=1\ty=2";
	    var pos = 5;
            assert.equals(helper.indentToLast(text, pos+1),
			  [1, pos+1]);
	},
	"counts tabs in previous line without tab": function () {
	    var text="x=1";
            assert.equals(helper.indentToLast(text, text.length),
			  [0, text.length]);
	},
	"counts tabs in previous line without tab but \\n": function () {
	    var text="\nx=1";
            assert.equals(helper.indentToLast(text, text.length),
			  [0, text.length]);
	}
    });


    buster.testCase("line2Offset", {
	"count the first line": function () {
	    var text="now is the time\nfor";
            assert.equals(0, helper.line2Offset(text, 1));
	},
	"count to the 3rd line": function () {
	    var text="now\nis\nthe time\nfor";
            assert.equals(7, helper.line2Offset(text, 3));
	},
    });



}());
