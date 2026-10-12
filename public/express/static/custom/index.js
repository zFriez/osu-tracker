let socket = new ReconnectingWebSocket("ws://127.0.0.1:17881/ws");
let overlayDataElement = document.getElementById("overlayData");
const events = new EventSource("http://127.0.0.1:17882/custom/events");
const css_class_name = "value";

function createLine(line) {
    const p = document.createElement("p");
    const idx = line.indexOf(":");

    if (idx === -1) {
        p.textContent = line;
        return p;
    }

    const span = document.createElement("span");
    span.className = css_class_name;
    span.textContent = line.slice(idx + 1).trim();

    p.append(line.slice(0, idx + 1) + " ", span);
    return p;
}

function applyOverlayData(data) {
    const lines = data.split(/\r?\n/).filter((line) => line.trim() !== "");
    overlayDataElement.replaceChildren(...lines.map(createLine));
}

events.onmessage = (event) => applyOverlayData(JSON.parse(event.data));

events.onerror = (err) => console.error("Overlay events error", err);

socket.onopen = () => console.log("Successfully Connected");

socket.onclose = (event) => {
    console.log("Socket Closed Connection: ", event);
    socket.send("Client Closed!");
};

socket.onerror = (error) => console.log("Socket Error: ", error);

socket.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        console.log(data);
    } catch (err) {
        console.log(err);
    }
};
