(function registerTestHook(window) {
  "use strict";
  window.SoonLabGame ||= {};
  const game = window.SoonLabGame;
  game.installTestHook=function() {
    function snapshot() {
      const manager=game.manager,view=game.view,active=manager?.activity;
      let visibleObjects=0;view?.scene.traverse(object=>{if(object.isMesh&&object.visible) visibleObjects++;});
      return {
        ok:game.errors.length===0&&Boolean(manager&&view?.ready),title:game.config.title,renderMode:"threejs-3d",gameType:game.config.gameType,
        state:manager?.state||"loading",frame:manager?.frame||0,time:manager?.time||0,canRestart:typeof game.restart==="function",
        inputReady:Boolean(game.input?.ready),canvasReady:Boolean(view?.renderer?.domElement?.isConnected&&view.renderer.getContext()),assetsReady:Boolean(game.assets&&view?.ready),
        errors:game.errors.slice(),warnings:game.warnings.slice(),
        rendererProof:{sceneReady:Boolean(view?.scene?.isScene),cameraReady:Boolean(view?.camera?.isCamera),rendererReady:Boolean(view?.renderer?.getContext()),lightsActive:view?.lights?.length||0,visibleObjects,animationActive:Boolean(game.loop?.isRunning()),cameraMode:view?.cameraMode||null,transientWorldOffsetActive:false},
        gameplay:{
          difficulty:manager?.difficulty,activeActivity:manager?.activeActivity,playerPosition:game.playerRoot?.position.toArray(),cameraMode:view?.cameraMode,
          pointerLocked:document.pointerLockElement===view?.renderer.domElement,heldItem:manager?.player.heldItem,interactionTarget:manager?.interactionTarget?.label||null,
          stamps:manager?Array.from(manager.stamps):[],topWrapped:active?.id==="top"?active.wrapped:0,topSpin:active?.id==="top"?active.tops.map(top=>top.spin):[],topPositions:active?.id==="top"?active.tops.map(top=>top.root.position.toArray()):[],topContactRolls:active?.id==="top"?active.contactRolls:0,topBroken:active?.id==="top"?active.broken:false,topRetrieved:active?.id==="top"?active.retrieved:false,
          quanCells:active?.id==="quan"?active.cells.slice():[],quanScores:active?.id==="quan"?active.scores.slice():[],quanTurn:active?.id==="quan"?active.turn:null,quanLegalMoves:active?.id==="quan"?active.legal(active.turn):[],quanOpponentId:active?.id==="quan"?active.opponent:null,quanStreak:manager?.records.quanStreak||0,quanStreakCounted:active?.id==="quan"?active.counted:false,
          swingSeated:Boolean(manager?.seated),conTarget:active?.id==="con"?active.ring.position.slice():null,
          conRemaining:active?.id==="con"?active.remaining:0,conFlying:active?.id==="con"?active.balls.length:0,conAttempt:active?.id==="con"?active.attempt:0,conHits:active?.id==="con"?active.hits:0,conTrajectory:active?.id==="con"?active.trajectory:[],conRingCrossing:active?.id==="con"?active.ringCrossing:false,
          pushPerfectChain:active?.id==="push"?active.perfectChain:0,pushRequiredPerfectChain:active?.id==="push"?active.requiredPerfectChain:0,pushMeter:active?.id==="push"?active.meter:null,pushRank:active?.id==="push"?active.rank:null,pushCombo:active?.id==="push"?active.combo:0,pushAngle:active?.id==="push"?active.angle:0,pushTargetAngle:active?.id==="push"?active.targetAngle:0,pushZoneWidth:active?.id==="push"?active.zoneWidth:0,pushRushing:active?.id==="push"?active.clock<active.rushUntil:false,sapTargetSteps:active?.id==="sap"?active.targetSteps:0,sapPeriod:active?.id==="sap"?active.period:0,
          pushGrade:active?.id==="push"?active.grade:null,pushDisplacement:active?.id==="push"?active.displacement:0,sapBeat:active?.id==="sap"?active.beat:null,sapProgress:active?.id==="sap"?active.progress:0,sapTrip:active?.id==="sap"?active.trip:false,sapNote:active?.id==="sap"&&active.note?{...active.note}:null,sapClock:active?.id==="sap"?active.clock:0,sapNotes:active?.id==="sap"?active.notes.filter(note=>!note.hit).map(note=>({...note})):[],sapScore:active?.id==="sap"?active.score:0,sapCombo:active?.id==="sap"?active.combo:0,
          stiltsProgress:active?.id==="stilts"?active.progress:0,stiltsTargetSteps:active?.id==="stilts"?active.targetSteps:0,stiltsExpectedFoot:active?.id==="stilts"?active.expectedFoot:null,stiltsClock:active?.id==="stilts"?active.clock:0,stiltsFallen:active?.id==="stilts"?active.fallen:false,
          crossbowHits:active?.id==="crossbow"?active.hits:0,crossbowShots:active?.id==="crossbow"?active.shots:0,crossbowRequired:active?.id==="crossbow"?active.required:0,crossbowTotal:active?.id==="crossbow"?active.total:0,crossbowLastShot:active?.id==="crossbow"?active.lastShot:null,
          finalScore:manager?.finalScore??null,leaderboard:{enabled:game.config.leaderboard.enabled,submitAttempts:manager?.submitAttempts||0,lastAttemptScore:manager?.lastAttemptScore??null,submissionState:manager?.submissionState||"idle"},audioMuted:game.audio?.muted??false,audioScene:game.audio?.scene??null
        }
      };
    }
    function simulate(input) {
      game.testMode=true; input=input&&typeof input==="object"?input:{};
      if(input.type==="outcome") game.forceOutcome(input.state);
      else if(input.type==="start") { if(game.manager.state==="ready") game.manager.setState("exploring"); }
      else if(input.type==="activity"&&game.config.activities.some(activity=>activity.id===input.id)) game.enterActivity(input.id,true);
      else if(input.type==="key") game.input.key(input.key,input.pressed!==false,false);
      else if(input.type==="interact") game.action("KeyE");
      else if(input.type==="charge") game.charge(input.pressed!==false);
      else if(input.type==="look") game.view.rig.addPointerDelta(Number(input.x)||0,Number(input.y)||0);
      const frames=Math.min(3600,Math.max(0,Math.floor(Number(input.frames)||0)));
      for(let index=0;index<frames;index++) game.fixedUpdate(1/60);
      game.render(1,1/60);
      return snapshot();
    }
    window.__CODEX_GAME_TEST__={snapshot() { return snapshot(); },simulate(input) { return simulate(input); },restart() {game.testMode=true;game.restart();return snapshot();}};
  };
})(window);
