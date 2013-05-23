// test of timediff javascript

if (typeof require === "function" && typeof module !== "undefined") {
    var buster   = require("buster");
    var timediff = require("../../static/timediff");
}

(function () {
    buster.testCase("time2string", {
	"shows just milliseconds": function () {
            assert.equals(timediff.time2string(20), "0.020 secs")
	},
	"shows seconds and milliseconds only": function () {
            assert.equals(timediff.time2string(10081), "10.081 secs")
	},
	"shows minutes, seconds and milliseconds only": function () {
            assert.equals(timediff.time2string(120081), "2 minutes, 0.081 secs")
	},
    });
}());
