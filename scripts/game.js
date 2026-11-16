(function registerGame(window) {
  "use strict";
  window.SoonLabGame ||= {};
  const game = window.SoonLabGame;
  function fail(error) {
    const message=error?.message||String(error);game.errors.push(message);
    window.SoonLabGameBridge?.reportError?.(error,{phase:"startup-or-runtime"});
    const panel=document.querySelector("#critical-error");panel.hidden=false;
    panel.textContent="The festival could not continue: "+message+". Reload to retry. A WebGL-capable desktop browser is required.";
  }
  window.addEventListener("error",event=>{if(event.error) fail(event.error);});
  try {
    if(!window.THREE||!window.LOBSTER_THREE_RUNTIME) throw new Error("The bundled 3D renderer is unavailable");
    window.SoonLabGameBridge?.progress?.(0.2,{phase:"initializing"});
    game.manager=new game.GameManager();
    game.audio=game.createAudio();
    game.view=game.createScene();
    game.initializeGameplay();
    const client=SoonLabLeaderboard.createClient({gameId:game.config.leaderboard.gameId});
    game.leaderboard=client;
    game.boardResult=null; game.boardLoading=false; game.showRecords=false; game.editingName=false;
    let listVersion=0;
    game.acceptBoard=function(result) {
      if(!result.ok||result.skipped) return;
      if(game.boardResult?.current&&result.current&&result.current.score<game.boardResult.current.score) return;
      game.boardResult=result;
    };
    game.submitScore=async function() {
      const manager=game.manager,version=manager.roundVersion;
      manager.submissionState="submitting";game.ui?.refresh(true);
      const result=await client.submit(manager.finalScore);
      if(version!==manager.roundVersion) return;
      manager.submissionState=result.skipped?"test-suppressed":result.ok?"submitted":"failed";
      if(result.ok&&!result.skipped) game.acceptBoard(result);
      else if(!result.ok) game.warn(game.config.ui.networkWarning);
      game.ui.refresh(true);
    };
    game.loadRecords=async function() {
      const version=++listVersion,round=game.manager.roundVersion;
      game.boardLoading=true;game.ui.refresh(true);
      const response=await client.list();
      if(version!==listVersion||round!==game.manager.roundVersion) {game.boardLoading=false;return;}
      game.boardLoading=false;if(response.ok) game.acceptBoard(response);else game.boardResult=response;
      game.ui.refresh(true);
    };
    game.input=game.createInput();
    game.ui=game.createUi();
    const disposeSize=game.runtime.observeRendererSize({container:document.querySelector("#scene"),renderer:game.view.renderer,camera:game.view.camera,maxPixelRatio:2});
    const disposeContext=game.runtime.installContextLifecycle({canvas:game.view.renderer.domElement,
      onLost() {game.manager.pause();game.warn("The graphics context was interrupted. Waiting for recovery.");},
      onRestored() {try {game.view.renderer.resetState();game.ui.refresh(true);}catch(error){fail(error);}}
    });
    game.render=function(alpha,delta) {
      game.view.rig.render(alpha,delta);game.view.animate(delta);game.view.renderer.render(game.view.scene,game.view.camera);
    };
    game.loop=game.runtime.createFixedStepLoop({step:game.fixedUpdate,render:game.render,stepHz:game.config.simulation.stepHz,maxSubSteps:game.config.simulation.maxSubSteps,maxFrameDeltaMs:game.config.simulation.maxFrameDeltaMs,onError:fail});
    game.installTestHook();game.ui.refresh(true);game.render(1,0);game.loop.start();
    window.SoonLabGameBridge?.ready?.({title:game.config.title,renderMode:"threejs-3d",state:game.manager.state});
    window.addEventListener("pagehide",()=>{game.loop.stop();game.input.lifecycle.detach();disposeSize();disposeContext();game.audio.dispose();game.view.tracker.dispose();game.view.renderer.dispose();},{once:true});
  } catch(error) {fail(error);}
})(window);
