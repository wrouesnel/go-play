// goplay tests

if (typeof require != "undefined") {
    var buster = require("buster");
}

buster.testCase("A module", {
    "states the obvious": function () {
        assert(true);
    }
});
