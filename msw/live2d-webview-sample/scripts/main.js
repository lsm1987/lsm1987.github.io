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

    backgroundSprite.interactive = true;
    backgroundSprite.on('click', HandleClickCommand);

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

  // 클릭을 명령으로 변환, 처리
  function HandleClickCommand(e) {
    const clickPosition = e.data.global; // 좌상단 원점, 우하단 양수
    const xRatio = clickPosition.x / app.screen.width;
    const yRatio = clickPosition.y / app.screen.height;
    //console.log("[test] global: (" + e.data.global.x + ", " + e.data.global.y + ") screenSize: (" + app.screen.width + ", " + app.screen.height + ") ratio: (" + xRatio +  ", " + yRatio + ")");

    // 화면 내 클릭 위치로 커맨드 종류(세로 좌표), 인자(가로 좌표) 지정.
    const commandCategoryIdxMotion = 0;
    const commandCategoryIdxExpression = 1;
    const commandCategoryIdxFocus = 2;
    const commandCategoryCount = 3;
    const commandCategoryIdx = parseInt(yRatio / (1 / commandCategoryCount));

    switch (commandCategoryIdx)
    {
      case commandCategoryIdxMotion:
      {
        HandleMotionCommand(xRatio);
        break;
      }
      case commandCategoryIdxExpression:
      {
        HandleExpressionCommand(xRatio);
        break;
      }
      case commandCategoryIdxFocus:
      {
        HandleFocusCommand(xRatio);
        break;
      }
      default:
      {
        console.log("Not handled command category index: " + commandCategoryIdx);
        break;
      }
    }
  }

  function HandleMotionCommand(commandClickXRatio)
  {
    const motionParamIdxSay = 0;
    const motionParamIdxMakeIt = 1;
    const motionParamIdxSurprise = 2;
    const motionParamIdxLaugh = 3;
    const motionParamCount = 4;
    const motionParamIdx = parseInt(commandClickXRatio / (1 / motionParamCount));

    switch (motionParamIdx)
    {
      case motionParamIdxSay:
      {
        PlayMotion("flickHead_say");
        break;
      }
      case motionParamIdxMakeIt:
      {
        PlayMotion("tap_body_makeIt");
        break;
      }
      case motionParamIdxSurprise:
      {
        PlayMotion("shake_coverMouthSurprise");
        break;
      }
      case motionParamIdxLaugh:
      {
        PlayMotion("shake_coverMouthLaugh");
        break;
      }
      default:
      {
        console.log("Not handled motion parameter index: " + motionParamIdx);
        break;
      }
    }
  }

  function PlayMotion(motionName)
  {
    if (model)
    {
      // 재생 중인 모션 덮어씀
      model.motion(motionName, undefined, PIXI.live2d.MotionPriority.FORCE);
    }
  }

  function HandleExpressionCommand(commandClickXRatio)
  {
    const expressionParamIdxNormal = 0;
    const expressionParamIdxSour = 1;
    const expressionParamIdxAngry = 2;
    const expressionParamIdxTwinkle = 3;
    const expressionParamCount = 4;
    const expressionParamIdx = parseInt(commandClickXRatio / (1 / expressionParamCount));

    switch (expressionParamIdx)
    {
      case expressionParamIdxNormal:
      {
        SetExpression("normal");
        break;
      }
      case expressionParamIdxSour:
      {
        SetExpression("sour");
        break;
      }
      case expressionParamIdxAngry:
      {
        SetExpression("angry");
        break;
      }
      case expressionParamIdxTwinkle:
      {
        SetExpression("twinkle");
        break;
      }
      default:
      {
        console.log("Not handled expression parameter index: " + expressionParamIdx);
        break;
      }
    }
  }

  function SetExpression(expressionName)
  {
    if (model)
    {
      model.expression(expressionName);
    }
  }

  function HandleFocusCommand(commandClickXRatio)
  {
    const focusParamIdxClear = 0;
    const focusParamIdxLeft = 1;
    const focusParamIdxRight = 2;
    const focusParamIdxUp = 3;
    const focusParamCount = 4;
    const focusParamIdx = parseInt(commandClickXRatio / (1 / focusParamCount));

    switch (focusParamIdx)
    {
      case focusParamIdxClear:
      {
        ClearFocus();
        break;
      }
      case focusParamIdxLeft:
      {
        SetFocus(0, 0.5);
        break;
      }
      case focusParamIdxRight:
      {
        SetFocus(1, 0.5);
        break;
      }
      case focusParamIdxUp:
      {
        SetFocus(0.5, 0);
        break;
      }
      default:
      {
        console.log("Not handled focus parameter index: " + focusParamIdx);
        break;
      }
    }
  }

  function SetFocus(focusXRatio, focusYRatio)
  {
    if (model)
    {
      const screenWidth = app.screen.width;
      const screenHeight = app.screen.height;
      const focusX = screenWidth * focusXRatio;
      const focusY = screenHeight * focusYRatio;
      model.focus(focusX, focusY);
    }
  }

  function ClearFocus()
  {
    if (model)
    {
      model.internalModel.focusController.focus(0, 0, false);
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}