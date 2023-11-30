function loadImage(src)
{
    let newImage = new Image();
    newImage.onload = function() {return;}
    newImage.src = src;
    return newImage;
}

function loadFont(name, src)
{
    let newFont = new FontFace(name, src);
    newFont.load().then(function(font){
        document.fonts.add(font);
    });

    return newFont;
}

export const img = {
    menu:               loadImage("assets/art/menu.png"),
    lobby:              loadImage("assets/art/lobby.png"),
    background:         loadImage("assets/art/map.png"),
    villagerHair:       loadImage("assets/art/villager_hair.png"),
    villagerHeadarms:   loadImage("assets/art/villager_headarms.png"),
    villagerShirt:      loadImage("assets/art/villager_shirt.png"),
    facilityWater:      loadImage("assets/art/facility_water.png"),
    facilityEducation:  loadImage("assets/art/facility_education.png"),
    facilityHousing:    loadImage("assets/art/facility_housing.png"),
    powerOff:           loadImage("assets/art/power_off.png"),
    powerOn:            loadImage("assets/art/power_on.png"),
    farmland:           loadImage("assets/art/farmland.png"),
    farmlandLocked:     loadImage("assets/art/farmland_locked.png"),
    farmlandFertilized: loadImage("assets/art/farmland_fertilized.png"),
    plant:              loadImage("assets/art/plant.png"),
    treeBare:           loadImage("assets/art/tree_bare.png"),
    treeRipe:           loadImage("assets/art/tree_ripe.png"),
    treeFertilized:     loadImage("assets/art/tree_fertilized.png"),
    treeStump:          loadImage("assets/art/tree_stump.png"),
    cloudShadows:       loadImage("assets/art/cloud_shadows.png"),
    puddles:            loadImage("assets/art/puddles.png"),
    rain0:              loadImage("assets/art/rain0.png"),
    rain1:              loadImage("assets/art/rain1.png"),
    heart:              loadImage("assets/art/heart.png"),

    // items
    "cucumber":         loadImage("assets/art/cucumber.png"),
    "cucumber_seed":    loadImage("assets/art/cucumber_seed.png"),
    "tomato":           loadImage("assets/art/tomato.png"),
    "tomato_seed":      loadImage("assets/art/tomato_seed.png"),
    "potato":           loadImage("assets/art/potato.png"),
    "potato_seed":      loadImage("assets/art/potato_seed.png"),
    "carrot":           loadImage("assets/art/carrot.png"),
    "carrot_seed":      loadImage("assets/art/carrot_seed.png"),
    "apple":            loadImage("assets/art/apple.png"),
    "wood":             loadImage("assets/art/wood.png"),
    "brick":            loadImage("assets/art/brick.png"),
    "steel":            loadImage("assets/art/steel.png"),

    // events
    "event_black_friday":   loadImage("assets/art/event_black_friday.png"),
    "event_cloudy_day":     loadImage("assets/art/event_cloudy_day.png"),
    "event_death":          loadImage("assets/art/event_death.png"),
    "event_disease":        loadImage("assets/art/event_disease.png"),
    "event_drought":        loadImage("assets/art/event_drought.png"),
    "event_flood":          loadImage("assets/art/event_flood.png"),
    "event_free_cake":      loadImage("assets/art/event_free_cake.png"),
    "event_harvest":        loadImage("assets/art/event_harvest.png"),
    "event_heat_stroke":    loadImage("assets/art/event_heat_stroke.png"),
    "event_rainy_day":      loadImage("assets/art/event_rainy_day.png"),
    "event_summer_day":     loadImage("assets/art/event_summer_day.png")
};

// load power frames
for(let i = 1; i <= 26; i++)
    img["power_on_" + i] = loadImage("assets/art/power_on/power_on_" + i + ".png");


export const audio = {
    bgm: new Audio("assets/audio/bgm.mp3"),
    notification: new Audio("assets/audio/notification.ogg")
};

audio.bgm.loop = true;
audio.bgm.volume = 0.25;
audio.notification.volume = 0.25;

const font = {
    miniSquare:         loadFont("Kenney Mini Square", "url(assets/fonts/Kenney%20Mini%20Square.ttf)")
}