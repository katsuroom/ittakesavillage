import * as global from "./global.js";
Object.entries(global).forEach(([name, exported]) => window[name] = exported);

import * as SceneMenu from "./scenes/SceneMenu.js";
import * as SceneGame from "./scenes/SceneGame.js";

socket.on("connect", () => {
    console.log("connected: " + socket.id);
});


export function loadScene(scene)
{
    if(currentScene != scene)
    {
        switch(scene)
        {
            case SCENE.menu:
                SceneMenu.init();
                requestAnimationFrame(SceneMenu.draw);
                break;
            
            case SCENE.game:
                // setTimeout(() => {
                    SceneGame.init();
                    requestAnimationFrame(SceneGame.draw);
                // }, 100);
                break;
        }

        currentScene = scene;
    }
}


loadScene(SCENE.menu);