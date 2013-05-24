// test of timediff javascript

if (typeof require === "function" && typeof module !== "undefined") {
    var buster   = require("buster");
    var linkerror = require("../../static/linkerror");
}

(function () {
    buster.testCase("linkErrorOutput", {
	"basic test": function () {
	    var inputString = [
		'./compile0.go:3: imported and not used: "fmt"',
		'./compile0.go:6: undefined: fm',
		"can't load package: package :",
		'compile2.go:3:8: string not terminated',
		"compile2.go:5:1: expected ';', found 'func'"
	    ].join("\n");
	    var taggedString = [
		'<a href="/error">./compile0.go:3: imported and not used: "fmt"</a>',
		'<a href="/error">./compile0.go:6: undefined: fm</a>',
		"can't load package: package :",
		'<a href="/error">compile2.go:3:8: string not terminated</a>',
		"<a href=\"/error\">compile2.go:5:1: expected ';', found 'func'</a>"
	    ].join("\n");
            assert.equals(linkerror.linkErrorOutput(inputString),
			  taggedString);
	},
    });
}());
