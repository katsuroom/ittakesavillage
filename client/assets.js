function loadImage(src)
{
    let newImage = new Image();
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
    background:         loadImage("assets/art/map.png"),
    villagerHair:       loadImage("assets/art/villager_hair.png"),
    villagerHeadarms:   loadImage("assets/art/villager_headarms.png"),
    villagerShirt:      loadImage("assets/art/villager_shirt.png"),
    facilityWater:      loadImage("assets/art/facility_water.png"),
    facilityEducation:  loadImage("assets/art/facility_education.png"),
    facilityHousing:    loadImage("assets/art/facility_housing.png"),
    farmland:           loadImage("assets/art/farmland.png"),
    farmlandLocked:     loadImage("assets/art/farmland_locked.png"),
    plant:              loadImage("assets/art/plant.png"),
    treeBare:           loadImage("assets/art/tree_bare.png"),
    treeRipe:           loadImage("assets/art/tree_ripe.png"),
    treeStump:          loadImage("assets/art/tree_stump.png"),
    buttonLarge:        loadImage("assets/art/button_large.png"),
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
    "steel":            loadImage("assets/art/steel.png")
};


const font = {
    miniSquare:         loadFont("Kenney Mini Square", "url(assets/fonts/Kenney%20Mini%20Square.ttf)")
}