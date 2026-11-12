(function registerInput(window) {
  "use strict";
  window.SoonLabGame ||= {};
  const game = window.SoonLabGame;
  game.createInput = function () {
    const held = new Set(), physical = new Set(), touchKeys = new Map();
    const stick = document.querySelector("#move-stick"), knob = document.querySelector("#stick-knob"), controls = document.querySelector("#touch-controls");
    const joystick = { forward:0, right:0 };
    let touchMode = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    let stickPointer = null, lookPointer = null, lookX = 0, lookY = 0, chargePointer = null;
    const normalize = key => ({ w:"KeyW", a:"KeyA", s:"KeyS", d:"KeyD", q:"KeyQ", e:"KeyE", r:"KeyR", f:"KeyF", g:"KeyG", h:"KeyH", j:"KeyJ", k:"KeyK", " ":"Space", Spacebar:"Space" })[key] || key;
    function key(code, pressed, repeat) {
      code = normalize(code);
      if (pressed) held.add(code); else held.delete(code);
      if (pressed && !repeat) game.action(code);
    }
    function direction() {
      return {
        forward:game.clamp(Number(held.has("KeyW")||held.has("ArrowUp"))-Number(held.has("KeyS")||held.has("ArrowDown"))+joystick.forward,-1,1),
        right:game.clamp(Number(held.has("KeyD")||held.has("ArrowRight"))-Number(held.has("KeyA")||held.has("ArrowLeft"))+joystick.right,-1,1)
      };
    }
    function refreshTouch() {
      const state = game.manager.state;
      const playing = game.canLook() || ["push-active","stilts-active"].includes(state);
      document.querySelector("#game-root").classList.toggle("touch-mode",touchMode);
      controls.hidden = !touchMode || !playing;
      stick.hidden = Boolean(game.manager.seated) || !game.canLook() || ["sap-active","crossbow-active"].includes(state);
      controls.querySelector('[data-touch-code="KeyR"]').hidden = state !== "top-preparation";
      controls.querySelector('[data-touch-charge]').hidden = !["top-preparation","con-aim"].includes(state);
      for (const code of ["ArrowUp","ArrowDown"]) controls.querySelector('[data-touch-code="'+code+'"]').hidden = true;
      const jump = controls.querySelector('[data-touch-code="Space"]');
      jump.hidden = !playing || ["top-active","sap-active","stilts-active","crossbow-active"].includes(state);
      jump.textContent = game.manager.seated ? "Đứng dậy" : state === "push-active" ? "ĐẨY!" : "Nhảy";
      document.querySelector("#touch-look-hint").hidden = !game.canLook() || state === "sap-active";
    }
    function enableTouch() { if (!touchMode) { touchMode = true; refreshTouch(); } }
    function resetTouch() {
      for (const [pointer,button] of touchKeys) { button.classList.remove("pressed"); if (button.hasPointerCapture(pointer)) button.releasePointerCapture(pointer); }
      touchKeys.clear(); stickPointer = null; lookPointer = null; chargePointer = null;
      joystick.forward = 0; joystick.right = 0; knob.style.transform = "translate(-50%,-50%)";
      controls.querySelectorAll(".pressed").forEach(button=>button.classList.remove("pressed"));
    }
    const lifecycle = game.runtime.createInputLifecycle({
      onKeyDown(event) {
        if (/^(INPUT|SELECT|TEXTAREA)$/.test(event.target?.tagName) || event.target?.isContentEditable) return;
        if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD","KeyQ","KeyE","KeyR","KeyF","KeyJ","KeyK"].includes(event.code)) event.preventDefault();
        game.audio.unlock();
        physical.add(event.code);
        key(event.code,true,event.repeat);
      },
      onKeyUp(event) { physical.delete(event.code); key(event.code,false,false); },
      onPointerMove(event) {
        if (game.manager.state === "sap-active") return;
        if (event.pointerId === lookPointer && game.canLook()) {
          game.view.rig.addPointerDelta((event.clientX-lookX)*1.6,(event.clientY-lookY)*1.6);
          lookX = event.clientX; lookY = event.clientY;
        } else if (event.pointerType !== "touch" && document.pointerLockElement === game.view?.renderer.domElement && game.canLook()) game.view.rig.addPointerDelta(event.movementX,event.movementY);
      },
      onPointerDown(event) {
        if (event.pointerType === "touch") enableTouch();
        if (event.target !== game.view?.renderer.domElement) return;
        game.audio.unlock();
        event.target.focus({preventScroll:true});
        if (game.manager.state === "quan-turn") { game.selectBoard(event); return; }
        if (game.manager.state === "push-active") { if(event.button===0) game.action("Space"); return; }
        if (event.pointerType === "touch") {
          if (lookPointer === null && game.canLook()) { lookPointer = event.pointerId; lookX = event.clientX; lookY = event.clientY; event.target.setPointerCapture(event.pointerId); }
          return;
        }
        if (document.pointerLockElement !== event.target) { game.requestLook(); return; }
        if (event.button === 0) game.charge(true);
      },
      onPointerUp(event) {
        if (event.pointerId === lookPointer) lookPointer = null;
        if (event.pointerType !== "touch" && event.button === 0) game.charge(false);
      },
      onReset() { held.clear(); physical.clear(); resetTouch(); if (game.manager?.activity) game.manager.activity.charging = false; }
    });
    lifecycle.attach();
    function moveStick(event) {
      if (event.pointerId !== stickPointer) return;
      const rect = stick.getBoundingClientRect(), radius = rect.width*0.34;
      let offsetX = event.clientX-rect.left-rect.width/2, offsetY = event.clientY-rect.top-rect.height/2;
      const scale = Math.min(1,radius/Math.max(1,Math.hypot(offsetX,offsetY)));
      offsetX *= scale; offsetY *= scale;
      joystick.right = Math.abs(offsetX)<radius*0.12 ? 0 : offsetX/radius;
      joystick.forward = Math.abs(offsetY)<radius*0.12 ? 0 : -offsetY/radius;
      knob.style.transform = `translate(calc(-50% + ${offsetX}px),calc(-50% + ${offsetY}px))`;
    }
    stick.addEventListener("pointerdown",event=>{
      if (stickPointer !== null) return;
      event.preventDefault(); enableTouch(); game.audio.unlock(); stickPointer = event.pointerId; stick.setPointerCapture(event.pointerId); moveStick(event);
    });
    stick.addEventListener("pointermove",moveStick);
    function releaseStick(event) {
      if (event.pointerId !== stickPointer) return;
      stickPointer = null; joystick.forward = 0; joystick.right = 0; knob.style.transform = "translate(-50%,-50%)";
    }
    for (const name of ["pointerup","pointercancel","lostpointercapture"]) stick.addEventListener(name,releaseStick);
    for (const button of controls.querySelectorAll("[data-touch-code],[data-touch-charge]")) {
      button.addEventListener("pointerdown",event=>{
        event.preventDefault(); enableTouch(); game.audio.unlock(); button.setPointerCapture(event.pointerId); button.classList.add("pressed");
        touchKeys.set(event.pointerId,button);
        if (button.hasAttribute("data-touch-charge")) { chargePointer = event.pointerId; game.charge(true); }
        else key(button.dataset.touchCode,true,false);
      });
      function release(event) {
        if (touchKeys.get(event.pointerId) !== button) return;
        touchKeys.delete(event.pointerId); button.classList.remove("pressed");
        if (event.pointerId === chargePointer) { chargePointer = null; if (event.type === "pointerup") game.charge(false); else if (game.manager.activity) game.manager.activity.charging = false; }
        else if (!physical.has(button.dataset.touchCode) && !Array.from(touchKeys.values()).some(other=>other.dataset.touchCode === button.dataset.touchCode)) key(button.dataset.touchCode,false,false);
      }
      for (const name of ["pointerup","pointercancel","lostpointercapture"]) button.addEventListener(name,release);
    }
    document.querySelector("#interact").addEventListener("click",()=>{ game.audio.unlock(); game.action("KeyE"); game.view.renderer.domElement.focus({preventScroll:true}); });
    document.querySelector("#touch-pause").addEventListener("click",()=>game.manager.pause());
    window.addEventListener("blur",()=>game.manager?.pause());
    document.addEventListener("visibilitychange",()=>{ if (document.hidden) game.manager?.pause(); });
    document.addEventListener("pointerlockchange",()=>game.ui?.refresh());
    document.addEventListener("click",event=>{
      if (event.target.closest("button") && !event.target.closest("#nickname-form") && !game.editingName && document.activeElement?.tagName === "BUTTON") document.activeElement.blur();
    });
    return { lifecycle,held,key,direction,refreshTouch,get touchMode() { return touchMode; },reset(preserveMovement) {
      const movement = preserveMovement ? Array.from(physical).filter(code=>["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(code)) : [];
      lifecycle.reset();
      for (const code of movement) { physical.add(code); held.add(code); }
    },isDown(code) { return held.has(code); },ready:true };
  };
  game.canLook = () => ["exploring","top-preparation","top-active","con-aim","con-flight","sap-active","crossbow-active"].includes(game.manager.state);
  game.requestLook = function () {
    if (!game.canLook()) return;
    const canvas = game.view.renderer.domElement;
    canvas.focus({preventScroll:true});
    if (game.input?.touchMode || game.manager.state === "sap-active") return;
    try { const result = canvas.requestPointerLock?.(); result?.catch(()=>game.warn("Mouse capture is unavailable. Click the scene to retry.")); } catch { game.warn("Click the scene to capture the mouse."); }
  };
})(window);
