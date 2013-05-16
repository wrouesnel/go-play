var config = module.exports;

// Config which can be used with node.js
// Pure javascript that doesn't require a browser
config["nodejs tests"] = {
    rootPath: "../",
    environment: "node", // or "browser"
    sources: [
        "static/helper.js",
    ],
    tests: [
        "test/nodejs/*-test.js"
    ]
};


config["browser tests"] = {
    rootPath: "../",
    environment: "browser",
    tests: [
        "test/browser/*-test.js"
    ]
}
