import * as SceneMenu from "../scenes/SceneMenu.js";
import * as SceneLobby from "../scenes/SceneLobby.js";
import * as SceneGame from "../scenes/SceneGame.js";

export const SCENE = {
    menu: 0,
    lobby: 1,
    game: 2,
};

export let currentScene = undefined;

export function loadScene(scene)
{
    if(currentScene != scene)
    {
        switch(currentScene)
        {
            case SCENE.menu:    SceneMenu.exit(); break;
            case SCENE.lobby:   SceneLobby.exit(); break;
            case SCENE.game:    SceneGame.exit(); break;
            default: break;
        }

        switch(scene)
        {
            case SCENE.menu:
                SceneMenu.init();
                requestAnimationFrame(SceneMenu.draw);
                break;

            case SCENE.lobby:
                SceneLobby.init();
                requestAnimationFrame(SceneLobby.draw);
                break;
            
            case SCENE.game:
                SceneGame.init();
                requestAnimationFrame(SceneGame.draw);
                break;
        }

        currentScene = scene;
    }
}