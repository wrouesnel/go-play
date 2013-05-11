var config = module.exports;

config["browser tests"] = {
    rootPath: "../",
    environment: "browser", // or "node"
    sources: [
        "static/helper.js",
        "static/jquery.min.js",
    ],
    tests: [
        "test/*-test.js"
    ]
}

// config["node tests"] = {
//     environment: "node",
//     tests: [
//         "**/*-test.js"
//     ]
// };
