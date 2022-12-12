const backgroundPath = "images/background.jpeg";
const modelPath = "models/shizuku/shizuku.model.json";

(async function main() {
  const app = new PIXI.Application({
    view: document.getElementById("canvas"),
    autoStart: true,
    resizeTo: window,
    backgroundColor: 0xffffff
  });

  let backgroundSprite;
  let backgroundSpriteOriginalHeight;
  let model;
  let modelOriginalHeight;

  app.loader
    .add(backgroundPath)
    .load(setup);

  async function setup() {
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;
    console.log("screen w:" + screenWidth + " h: " + screenHeight);

    // 배경
    backgroundSprite = new PIXI.Sprite(app.loader.resources[backgroundPath].texture);
    //console.log("background w:" + backgroundSprite.width + " h: " + backgroundSprite.height);
    backgroundSpriteOriginalHeight = backgroundSprite.height;

    app.stage.addChild(backgroundSprite);
    backgroundSprite.anchor.set(0.5, 0.5);
    ArrangeBackgroundTransform(backgroundSprite, backgroundSpriteOriginalHeight, screenWidth, screenHeight);

    // 로딩 표시
    const loadingText = new PIXI.Text('Loading...', {
      fontSize: 75,
      fill: "black"
    });

    const loadingSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    loadingSprite.width = loadingText.width;
    loadingSprite.height = loadingText.height;

    const loadingContainer = new PIXI.Container();
    loadingContainer.addChild(loadingSprite, loadingText);
    app.stage.addChild(loadingContainer);

    loadingContainer.pivot.x = loadingContainer.width;
    loadingContainer.pivot.y = loadingContainer.height;
    loadingContainer.x = screenWidth;
    loadingContainer.y = screenHeight;

    // 모델
    model = await PIXI.live2d.Live2DModel.from(modelPath, { autoInteract: false });
    //console.log("model w:" + model.width + " h: " + model.height); // model w:1280 h: 1380
    modelOriginalHeight = model.height;
    
    app.stage.addChild(model);
    model.anchor.set(0.5, 1);
    ArrangeModelTransform(model, modelOriginalHeight, screenWidth, screenHeight);

    // 로딩 해제
    app.stage.removeChild(loadingContainer);
  }

  app.renderer.on('resize', (width, height) => {
    if (backgroundSprite && backgroundSpriteOriginalHeight)
    {
      ArrangeBackgroundTransform(backgroundSprite, backgroundSpriteOriginalHeight, width, height);
    }

    if (model && modelOriginalHeight)
    {
      ArrangeModelTransform(model, modelOriginalHeight, width, height);
    }
  })
})();

function ArrangeBackgroundTransform(backgroundSprite, originalHeight, screenWidth, screenHeight) {
  var scale = screenHeight / originalHeight;
  backgroundSprite.scale.set(scale);
  backgroundSprite.x = screenWidth / 2.0;
  backgroundSprite.y = screenHeight / 2.0;
}

function ArrangeModelTransform(model, originalHeight, screenWidth, screenHeight) {
  var scale = screenHeight / originalHeight;
  model.scale.set(scale);
  model.x = screenWidth / 2.0;
  model.y = screenHeight;
}