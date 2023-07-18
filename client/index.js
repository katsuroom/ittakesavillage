import * as global from "./global.js";
Object.entries(global).forEach(([name, exported]) => window[name] = exported);

import * as sm from "./src/SceneManager.js";

socket.on("connect", () => {
    console.log("connected: " + socket.id);
});

socket.on("server_info", (_games) => {
    console.log(_games);
});

window.addEventListener("keydown", (e) => {
    if(e.key == "v")
        socket.emit("server_info");
});

sm.loadScene(sm.SCENE.menu);