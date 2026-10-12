let selectFilesElement = document.getElementById("files");
let confirmFileElement = document.getElementById("confirm_button");

async function getFileFolder() {
    const request = await fetch("http://127.0.0.1:17882/custom");
    const result = await request.json();
    return result;
}

async function sendSelectedFile(file_name) {
    const response = await fetch("http://127.0.0.1:17882/custom/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name: file_name }),
    });

    if (!response.ok) {
        console.error("Error", response.status);
    }

    sessionStorage.setItem("file_name", selectFilesElement.value);
}

function applyFileFolder(files) {
    files.forEach((file, idx) => {
        let option = document.createElement("option");
        option.setAttribute("id", `${option.tagName + idx}`);
        option.innerText = file;
        selectFilesElement.appendChild(option);
    });
}

confirmFileElement.onclick = async () => {
    await sendSelectedFile(selectFilesElement.value);
    window.location.href = "/custom/index.html";
};

window.onload = () => {
    getFileFolder().then((files) => {
        applyFileFolder(files);
    });
};
