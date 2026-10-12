const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const logger = require("electron-log");
const app = express();
const router = express.Router();
const port = 17882;

const docPath = path.join(os.homedir(), "Documents", "osu-tracker");

let selectedFile;
let lastContent;
let watcher;
let debounceTimer;
const sseClients = new Set();

function getFiles(callback) {
    fs.readdir(docPath, (err, files) => {
        if (err) {
            return callback(err);
        }
        callback(null, files);
    });
}

function readFile(fileName, callback) {
    if (!fileName) return callback(new Error("No file selected"));

    const filePath = path.join(docPath, `${fileName}`);
    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return callback(err);
        }
        callback(null, data);
    });
}

function sendEvent(res, content) {
    res.write(`data: ${JSON.stringify(content)}\n\n`);
}

function broadcast(content) {
    sseClients.forEach((res) => sendEvent(res, content));
}

function checkFile() {
    if (!selectedFile) return;

    readFile(selectedFile, (err, data) => {
        if (err || data === lastContent) return;
        lastContent = data;
        broadcast(data);
    });
}

function watchSelectedFile() {
    if (watcher) watcher.close();

    // Watch the folder instead of the file so saves done via temp file + rename are still caught
    watcher = fs.watch(docPath, (event, filename) => {
        if (filename !== selectedFile) return;

        // fs.watch fires multiple events per save on Windows
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(checkFile, 100);
    });

    watcher.on("error", (err) => logger.error("Error watching file:", err));
}

app.use(express.json());

router.get("/", (req, res) => {
    getFiles((err, files) => {
        if (err) {
            return res.sendStatus(500);
        }
        res.json(files);
    });
});

app.get("/custom/file", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ file_name: selectedFile });
});

app.post("/custom/file", (req, res) => {
    const { file_name } = req.body ?? {};

    if (!file_name) return res.sendStatus(400);
    selectedFile = file_name;
    lastContent = undefined;
    watchSelectedFile();
    checkFile();

    res.set("Cache-Control", "no-store");
    res.json({ file_name: selectedFile });
});

app.get("/custom/events", (req, res) => {
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
    });
    res.flushHeaders();

    sseClients.add(res);
    if (lastContent !== undefined) sendEvent(res, lastContent);

    req.on("close", () => sseClients.delete(res));
});

app.get("/custom", (req, res) => {
    res.appendHeader("Access-Control-Allow-Origin", ["127.0.0.1:17882"]);
    res.appendHeader("Access-Control-Allow-Headers", ["Content-Type"]);
    getFiles((err, files) => {
        if (err) {
            return res.sendStatus(500);
        }
        res.json(files);
    });
});

app.post("/custom", (req, res) => {
    const { file_name } = req.body ?? {};

    if (!file_name) return res.sendStatus(400);
    readFile(file_name, (err, data) => {
        if (err) {
            return res.sendStatus(500);
        }
        res.set("Cache-Control", "no-store");
        res.json(data);
    });
});

app.use(express.static(path.join(__dirname, "/static/")));
app.use("/custom", router);

app.listen(port, () => {
    logger.info(`Started WebServer on port ${port}`);
});
