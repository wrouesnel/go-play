var config = module.exports;

config["My tests"] = {
    rootPath: "../",
    environment: "browser", // or "node"
    sources: [
        "static/jquery.min.js",
    ],
    tests: [
        "test/*-test.js"
    ]
}
