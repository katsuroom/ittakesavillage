import * as SceneMenu from "../scenes/SceneMenu.js";
import * as SceneLobby from "../scenes/SceneLobby.js";
import * as SceneGame from "../scenes/SceneGame.js";
import * as SceneWin from "../scenes/SceneWin.js";

export const SCENE = {
    menu: 0,
    lobby: 1,
    game: 2,
    win: 3
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
            case SCENE.win:     SceneWin.exit(); break;
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
            
            case SCENE.win:
                SceneWin.init();
                requestAnimationFrame(SceneWin.draw);
                break;
        }

        currentScene = scene;
    }
}