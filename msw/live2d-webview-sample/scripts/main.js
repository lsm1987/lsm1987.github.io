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
  let backgroundSpriteOriginalWidth;
  let backgroundSpriteOriginalHeight;
  let model;
  let modelOriginalHeight;
  
  let loadingElapsedMs = 0;
  let loadingTicker = new PIXI.Ticker();
  loadingTicker.autoStart = false;
  loadingTicker.add(OnUpdateLoadingTicker, PIXI.UPDATE_PRIORITY.LOW);

  let loadingContainer = CreateLoadingContainer();
  app.stage.addChild(loadingContainer);
  ArrangeLoadingContainerTransform(loadingContainer, app.screen.width, app.screen.height);
  StartLoadingTicker();

  app.loader
    .add(backgroundPath)
    .load(setup);

  async function setup() {
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;
    //console.log("screen w:" + screenWidth + " h: " + screenHeight);

    // 배경
    backgroundSprite = new PIXI.Sprite(app.loader.resources[backgroundPath].texture);
    //console.log("background w:" + backgroundSprite.width + " h: " + backgroundSprite.height);
    backgroundSpriteOriginalWidth = backgroundSprite.width;
    backgroundSpriteOriginalHeight = backgroundSprite.height;

    app.stage.addChild(backgroundSprite);
    backgroundSprite.anchor.set(0.5, 0.5);
    ArrangeBackgroundTransform(backgroundSprite, backgroundSpriteOriginalWidth, backgroundSpriteOriginalHeight, screenWidth, screenHeight);

    // 로딩이 위에 보이도록
    app.stage.removeChild(loadingContainer);
    app.stage.addChild(loadingContainer);
    ArrangeLoadingContainerTransform(loadingContainer, screenWidth, screenHeight);
    StartLoadingTicker();

    // 모델
    model = await PIXI.live2d.Live2DModel.from(modelPath, { autoInteract: false });
    //console.log("model w:" + model.width + " h: " + model.height); // model w:1280 h: 1380
    modelOriginalHeight = model.height;
    
    app.stage.addChild(model);
    model.anchor.set(0.5, 1);
    ArrangeModelTransform(model, modelOriginalHeight, screenWidth, screenHeight);

    // 로딩 해제
    app.stage.removeChild(loadingContainer);
    loadingContainer = null;
    RemoveLoadingTicker();

    // 인자 반영
    const url = new URL(window.location.href);
    const motionName = url.searchParams.get('motion');
    const expressionName = url.searchParams.get('expression');
    const focusXRatioString = url.searchParams.get('focusXRatio'); // 좌: 0, 우: 1
    const focusYRatioString = url.searchParams.get('focusYRatio'); // 상: 0, 하: 1
    //console.log("motion: " + motionName, " expression: " + expressionName);

    if (motionName)
    {
      model.motion(motionName);
    }

    if (expressionName)
    {
      model.expression(expressionName);
    }

    if (focusXRatioString != null || focusYRatioString != null)
    {
      const focusXRatio = (focusXRatioString != null) ? Number(focusXRatioString) : 0.5;
      const focusYRatio = (focusYRatioString != null) ? Number(focusYRatioString) : 0.5;
      
      // 즉시 실행하면 방향 잘못되는 경우 있어 딜레이 지정
      await sleep(300);
      ArrangeFocusPosition(model, focusXRatio, focusYRatio, screenWidth, screenHeight);
    }
  }

  app.renderer.on('resize', (width, height) => {
    if (loadingContainer)
    {
      ArrangeLoadingContainerTransform(loadingContainer, width, height);
    }

    if (backgroundSprite && backgroundSpriteOriginalWidth && backgroundSpriteOriginalHeight)
    {
      ArrangeBackgroundTransform(backgroundSprite, backgroundSpriteOriginalWidth, backgroundSpriteOriginalHeight, width, height);
    }

    if (model && modelOriginalHeight)
    {
      ArrangeModelTransform(model, modelOriginalHeight, width, height);
    }
  })

  function StartLoadingTicker()
  {
    if (loadingTicker && loadingContainer)
    {
      loadingElapsedMs = 0;
      loadingContainer.visible = false;
      loadingTicker.start();
    }
  }

  function OnUpdateLoadingTicker(time)
  {
    if (loadingTicker)
    {
      loadingElapsedMs += loadingTicker.deltaMS;

      if (loadingElapsedMs >= 1000)
      {
        if (loadingContainer)
        {
          loadingContainer.visible = true;
        }
      }
    }
  }

  function RemoveLoadingTicker()
  {
    if (loadingTicker)
    {
      loadingTicker.stop();
      loadingTicker = null;
    }
  }
})();

function CreateLoadingContainer() {
  const loadingText = new PIXI.Text('Loading...', {
    fontSize: 75,
    fill: "black"
  });

  const loadingSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
  loadingSprite.width = loadingText.width;
  loadingSprite.height = loadingText.height;

  const loadingContainer = new PIXI.Container();
  loadingContainer.addChild(loadingSprite, loadingText);
  loadingContainer.pivot.x = loadingContainer.width;
  loadingContainer.pivot.y = loadingContainer.height;

  return loadingContainer;
}

function ArrangeLoadingContainerTransform(loadingContainer, screenWidth, screenHeight) {
  loadingContainer.x = screenWidth;
  loadingContainer.y = screenHeight;
}

function ArrangeBackgroundTransform(backgroundSprite, originalWidth, originalHeight, screenWidth, screenHeight) {
  const spriteRatio = originalWidth / originalHeight;
  const screenRatio = screenWidth / screenHeight;
  const scale = (spriteRatio > screenRatio) ? (screenHeight / originalHeight) : (screenWidth / originalWidth);
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

function ArrangeFocusPosition(model, focusXRatio, focusYRatio, screenWidth, screenHeight) {
  const focusX = screenWidth * focusXRatio;
  const focusY = screenHeight * focusYRatio;
  model.focus(focusX, focusY);
  //console.log("resize focusXRatio: " + focusXRatio + " focusYRatio: " + focusYRatio + " screenW: " + screenWidth + " screenH: " + screenHeight + " x: " + focusX + " y: " + focusY );
}

function ClearFocus(model)
{
  model.internalModel.focusController.focus(0, 0, false);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}