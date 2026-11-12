(function registerGameplay(window) {
  "use strict";
  window.SoonLabGame ||= {};
  const game=window.SoonLabGame, THREE=window.THREE, config=game.config, runtime=game.runtime;
  let collisionWorld, spatialFrame, playerRoot, playerBody, pickupTriggers=[], entries=[], dynamicBodies=[], savedTops=[], pushBodies=[];
  const vector=values=>new THREE.Vector3(...values);
  function box(root,dimensions) { return collisionWorld.addSolid({owner:root,shape:"box",size:[dimensions.width,dimensions.height,dimensions.depth],localOffset:dimensions.bodyCenter}); }
  function capsule(root,dimensions) { return collisionWorld.addSolid({owner:root,shape:"capsule",radius:dimensions.radius,height:dimensions.height,axis:spatialFrame.up,localOffset:dimensions.bodyCenter}); }
  function sphere(root,dimensions) { return collisionWorld.addSolid({owner:root,shape:"sphere",radius:dimensions.radius,localOffset:dimensions.bodyCenter}); }
  function triggerSphere(root,dimensions) { return collisionWorld.addTrigger({owner:root,shape:"sphere",radius:dimensions.radius,localOffset:dimensions.bodyCenter}); }
  function triggerBox(root,dimensions) { return collisionWorld.addTrigger({owner:root,shape:"box",size:[dimensions.width,dimensions.height,dimensions.depth],localOffset:dimensions.bodyCenter}); }
  const COLLISION_BODY_BUILDERS=Object.freeze({
    "world-floor":box,"world-boundary":box,"village-building":box,"gate-post":box,"banyan-trunk":capsule,"booth-fixture":box,
    "player":capsule,"ai-participant":capsule,"top-projectile":sphere,"con-projectile":sphere,
    "equipment-pickup":triggerSphere,"activity-entry":triggerBox,"con-aperture":triggerBox,"push-boundary":triggerSphere,"sap-clamp":triggerBox,"sap-finish":triggerBox
  });
  function addCollisionBody(role,root,dimensions) { let body;
    switch(role) {
      case "world-floor": body=COLLISION_BODY_BUILDERS["world-floor"](root,dimensions); break;
      case "world-boundary": body=COLLISION_BODY_BUILDERS["world-boundary"](root,dimensions); break;
      case "village-building": body=COLLISION_BODY_BUILDERS["village-building"](root,dimensions); break;
      case "gate-post": body=COLLISION_BODY_BUILDERS["gate-post"](root,dimensions); break;
      case "banyan-trunk": body=COLLISION_BODY_BUILDERS["banyan-trunk"](root,dimensions); break;
      case "booth-fixture": body=COLLISION_BODY_BUILDERS["booth-fixture"](root,dimensions); break;
      case "player": body=COLLISION_BODY_BUILDERS["player"](root,dimensions); break;
      case "ai-participant": body=COLLISION_BODY_BUILDERS["ai-participant"](root,dimensions); break;
      case "top-projectile": body=COLLISION_BODY_BUILDERS["top-projectile"](root,dimensions); break;
      case "con-projectile": body=COLLISION_BODY_BUILDERS["con-projectile"](root,dimensions); break;
      case "equipment-pickup": body=COLLISION_BODY_BUILDERS["equipment-pickup"](root,dimensions); break;
      case "activity-entry": body=COLLISION_BODY_BUILDERS["activity-entry"](root,dimensions); break;
      case "con-aperture": body=COLLISION_BODY_BUILDERS["con-aperture"](root,dimensions); break;
      case "push-boundary": body=COLLISION_BODY_BUILDERS["push-boundary"](root,dimensions); break;
      case "sap-clamp": body=COLLISION_BODY_BUILDERS["sap-clamp"](root,dimensions); break;
      case "sap-finish": body=COLLISION_BODY_BUILDERS["sap-finish"](root,dimensions); break;
      default: throw new Error("Unsupported collision role: "+role);
    }
    body.gameRole=role; return body; }
  function makeTrigger(role,position,dimensions,action,label) {
    const root=new THREE.Group(); root.position.fromArray(position); game.view.scene.add(root);
    const body=addCollisionBody(role,root,dimensions); body.action=action; body.label=label; return body;
  }
  function placePlayer(position) {
    const result=collisionWorld.placeSolid(playerBody,vector(position));
    if(result.placed) { game.manager.player.velocity.set(0,0,0); game.manager.player.verticalSpeed=0; game.view.rig?.snap(); }
    return result.placed;
  }
  function cameraMode(mode,subject,profile) {
    game.view.cameraMode=mode;
    game.view.rig.setSubject(subject||playerRoot,{profile:{mode:mode==="overhead"?"third-person-follow":mode==="over-the-shoulder"?"third-person-follow":"first-person",height:mode==="first-person"?config.player.eyeHeight:0,focusHeight:0,distance:0,pitch:0,minPitch:-1.4,maxPitch:1.4,...profile},alignYaw:mode==="first-person"&&profile?.yaw===undefined,snap:true});
  }
  function clearDynamic() {
    for(const body of dynamicBodies) { collisionWorld.remove(body); game.view.scene.remove(body.owner); }
    dynamicBodies=[];
  }
  function cleanupActivity() {
    if(game.manager.seated) game.standFromSwing();
    if(game.manager.activity?.id==="con") game.manager.player.heldItem=null;
    game.manager.activity?.exit(); clearDynamic();
    for(const body of pushBodies) body.enabled=false;
    if(pushBodies[0]) { collisionWorld.placeSolid(pushBodies[0],new THREE.Vector3(21.1,0,-10)); pushBodies[0].enabled=true; }
    for(const clamp of game.sapClamps||[]) clamp.enabled=false;
    game.view.roles.pushPlayer.visible=false;
    game.view.arc.visible=false;
    if(game.view.roles.stiltWalker) game.view.roles.stiltWalker.visible=false;
    if(game.view.roles.crossbowWeapon) game.view.roles.crossbowWeapon.visible=false;
  }
  game.initializeGameplay=function() {
    spatialFrame=runtime.createSpatialFrame({worldUp:config.spatial.worldUp,modelForward:config.spatial.visualForward});
    collisionWorld=runtime.createCollisionWorld(); game.collisionWorld=collisionWorld; game.spatialFrame=spatialFrame;
    for(const entry of game.view.layout) addCollisionBody(entry.role,entry.root,entry.dimensions);
    playerRoot=new THREE.Group(); playerRoot.position.fromArray(config.player.spawn.position); game.view.scene.add(playerRoot);
    playerBody=addCollisionBody("player",playerRoot,{radius:config.player.radius,height:config.player.height,bodyCenter:[0,config.player.height/2,0]}); game.playerRoot=playerRoot; game.playerBody=playerBody;
    game.view.rig=runtime.createCameraRig({camera:game.view.camera,subject:playerRoot,frame:spatialFrame,mode:"first-person",height:config.player.eyeHeight,focusHeight:config.player.eyeHeight,sensitivity:config.camera.mouseSensitivity,collisionWorld,obstructionLayer:"camera",cameraRadius:0.15});
    cameraMode("first-person");
    for(const actor of [game.view.roles.opponent,game.view.roles.boardOpponent,game.view.roles.pushOpponent,game.view.roles.pushPlayer]) {
      const body=addCollisionBody("ai-participant",actor,{radius:0.26,height:1.75,bodyCenter:[0,0.875,0]});
      if(actor===game.view.roles.pushOpponent||actor===game.view.roles.pushPlayer) pushBodies.push(body);
    }
    pushBodies[1].enabled=false; game.view.roles.pushPlayer.visible=false;
    for(const activity of config.activities) {
      const entry=makeTrigger("activity-entry",activity.entryPosition,{width:1.6,height:2.3,depth:1.6,bodyCenter:[0,1.15,0]},()=>game.enterActivity(activity.id),"E · Play "+activity.name);
      entry.activity=activity.id; entries.push(entry);
    }
    pickupTriggers.push(makeTrigger("equipment-pickup",[-15,0.7,14],{radius:0.85},()=>pickup("wooden-top"),"E · Take wooden top"));
    pickupTriggers.push(makeTrigger("equipment-pickup",[-15,0.6,-7],{radius:0.8},()=>pickup("con-ball"),"E · Take ribboned ball"));
    game.aperture=makeTrigger("con-aperture",config.con.ring.position,{width:1.6,height:1.6,depth:0.15});
    game.pushBoundary=makeTrigger("push-boundary",[20,0,-10],{radius:3});
    game.sapClamps=[];
    for(let pair=0;pair<4;pair++) game.sapClamps.push(makeTrigger("sap-clamp",[0,0.22,-17-pair*2],{width:1.4,height:0.25,depth:0.15}));
    game.sapFinish=makeTrigger("sap-finish",[0,0.8,-25],{width:1.4,height:1.6,depth:0.8});
    game.view.updateBoard([5,5,5,5,5,10,5,5,5,5,5,10]);
  };
  function pickup(item) {
    const manager=game.manager;
    if(manager.activeActivity==="con") { manager.message="10 quả còn đã có trong túi, không cần lấy thêm."; return; }
    if(manager.player.heldItem===item) { manager.player.heldItem=null; manager.message="Equipment returned. Your hands are free."; game.audio.playSFX("equip"); return; }
    if(manager.player.heldItem) { manager.message="Your hands are full. Return your equipment to its container first (E)."; return; }
    if(manager.activeActivity&&manager.activeActivity!==(item==="wooden-top"?"top":"con")) return;
    manager.player.heldItem=item; manager.message=item==="wooden-top"?"Top collected. Approach the Đánh Cù sign and press E.":"Ball collected. Approach Ném Còn, then aim above the ring.";
    game.audio.playSFX("pickup"); game.audio.playSFX("equip");
    if(item==="wooden-top") { const lid=game.view.roles.chest.userData.motionParts.lid; lid.rotation.x=-1.4; }
  }
  game.updateInteraction=function() {
    const manager=game.manager;
    if(!game.canLook()) { manager.interactionTarget=null; return; }
    if(manager.seated) { manager.interactionTarget={label:"E · Đứng dậy khỏi xích đu",action:game.standFromSwing}; return; }
    if(manager.state==="exploring"&&!manager.activeActivity&&playerRoot.position.distanceTo(game.view.roles.swing.position)<2.7) {
      manager.interactionTarget={label:"E · Ngồi xích đu ngắm cảnh",action:game.sitOnSwing}; return;
    }
    const ray=collisionWorld.raycast(game.view.camera.position,game.view.rig.getViewForward(),config.player.interactionReach,{includeTriggers:true,ignoreOwner:playerRoot});
    manager.interactionTarget=ray?.collider?.action?ray.collider:null;
  };
  game.sitOnSwing=function() {
    const manager=game.manager;
    if(manager.state!=="exploring"||manager.activeActivity||manager.seated) return;
    const forward=game.view.rig.getViewForward();
    manager.swingPose={yaw:Math.atan2(-forward.x,-forward.z),pitch:Math.asin(game.clamp(forward.y,-1,1))};
    manager.seated=true; manager.player.velocity.set(0,0,0); manager.player.verticalSpeed=0;
    cameraMode("first-person",game.view.roles.swing.userData.seat,{height:1.15,focusHeight:1.15,yaw:game.view.roles.swing.rotation.y,pitch:0.08});
    manager.message="Thư giãn dưới tán đa · Ngắm cổng hội, núi và mây · E / Chạm Đứng dậy để rời ghế";
    game.input.reset(); game.updateInteraction(); game.ui.refresh(true); game.requestLook();
  };
  game.standFromSwing=function() {
    const manager=game.manager;
    if(!manager.seated) return;
    manager.seated=false;
    cameraMode("first-person",playerRoot,manager.swingPose||{}); manager.swingPose=null;
    manager.message="Đã đứng dậy. Tiếp tục dạo quanh hội làng nhé!";
    game.input.reset(); game.updateInteraction(); game.ui.refresh(true);
  };
  game.action=function(code) {
    const manager=game.manager;
    if(code==="Escape") { if(manager.state==="paused") manager.resume(); else manager.pause(); return; }
    if(manager.seated&&["KeyE","Space"].includes(code)&&manager.state==="exploring") { game.standFromSwing(); return; }
    if(manager.state==="stilts-active"&&["KeyQ","KeyE"].includes(code)) { manager.activity.step(code); return; }
    if(manager.state==="crossbow-active"&&code==="Space") { manager.activity.shoot(); return; }
    if(code==="KeyE"&&game.canLook()&&manager.state!=="crossbow-active") { game.updateInteraction(); manager.interactionTarget?.action(); }
    if(manager.state==="push-active"&&code==="Space") manager.activity.hit();
    else if(manager.state==="sap-active"&&["KeyD","KeyF","KeyJ","KeyK"].includes(code)) manager.activity.step(code);
    else if(code==="Space"&&manager.state!=="top-active"&&game.canLook()&&manager.player.grounded) { manager.player.verticalSpeed=config.player.jumpSpeed; manager.player.grounded=false; game.audio.playSFX("jump"); }
  };
  game.charge=function(pressed) {
    const manager=game.manager,activity=manager.activity;
    if(manager.state==="crossbow-active") { if(pressed) activity.shoot(); return; }
    if(!["top-preparation","con-aim"].includes(manager.state)||!activity) return;
    if(pressed) {
      if(manager.state==="top-preparation"&&activity.wrapped<config.top.wrapSeconds) { manager.message="Hold R to wind the rope completely before charging."; return; }
      if(!manager.player.heldItem) { manager.message="Walk to the equipment basket and press E to collect a ball."; return; }
      activity.charging=true; activity.chargeTime=0;
    } else if(activity.charging) { activity.charging=false; activity.launch(); }
  };
  game.start=function() {
    game.manager.setState("exploring"); game.audio.unlock(); game.audio.playSFX("ambience"); game.requestLook();
  };
  game.restart=function() {
    cleanupActivity();
    for(const top of savedTops) { collisionWorld.remove(top.body); collisionWorld.remove(top.pickup); game.view.scene.remove(top.root); }
    savedTops=[];
    game.manager.reset(); game.audio.playBGM(); placePlayer(config.player.spawn.position); cameraMode("first-person",playerRoot,{yaw:config.player.spawn.yawRadians,pitch:config.player.spawn.pitchRadians}); game.input.reset(); game.ui.refresh();
  };
  game.leaveActivity=function() {
    if(game.manager.seated) { game.standFromSwing(); return; }
    const manager=game.manager; const complete=manager.stamps.size===config.activities.length&&!manager.completeSeen;
    const saved=manager.savedPose;
    cleanupActivity(); manager.activity=null; manager.activeActivity=null; manager.savedPose=null;
    if(saved) { placePlayer(saved.position); cameraMode("first-person",playerRoot,{yaw:saved.yaw,pitch:saved.pitch}); }
    else cameraMode("first-person");
    manager.setState(complete?"festival-complete":"exploring");
    if(complete) manager.completeSeen=true;
    else game.requestLook();
  };
  game.retryActivity=function() { const id=game.manager.activeActivity; if(id) game.enterActivity(id,true); };
  game.enterActivity=function(id,retry) {
    const manager=game.manager;
    if(!retry&&manager.activeActivity) return;
    if(manager.seated) game.standFromSwing();
    if(id==="top"&&manager.player.heldItem!=="wooden-top") { manager.message="Pick up a wooden top at the chest beside this arena first."; return; }
    if(id==="con"&&manager.player.heldItem&&manager.player.heldItem!=="con-ball") { manager.message="Cất cù vào rương trước khi nhận 10 quả còn."; return; }
    if(!retry) {
      const forward=game.view.rig.getControlFrame().forward;
      manager.savedPose={position:playerRoot.position.toArray(),yaw:Math.atan2(-forward.x,-forward.z),pitch:Math.asin(game.clamp(game.view.rig.getViewForward().y,-1,1))};
    } else cleanupActivity();
    manager.activeActivity=id; manager.roundVersion++; manager.finalScore=null; manager.submitAttempts=0; manager.lastAttemptScore=null; manager.submissionState="idle";
    const factories={top:TopGame,quan:QuanGame,con:ConGame,push:PushGame,sap:SapGame,stilts:StiltsGame,crossbow:CrossbowGame};
    manager.activity=new factories[id]();
    manager.message=id==="con"?"Bạn đã nhận 10 quả còn — giữ rồi thả để ném liên tiếp, không cần về giỏ.":id==="push"&&manager.difficulty==="God"?"GOD: cần 24 PERFECT liên tiếp và đầy thanh lực. GOOD ngắt chuỗi; MISS mất 15% lực.":config.activities.find(activity=>activity.id===id).instructions;
    manager.setState({top:"top-preparation",quan:"quan-turn",con:"con-aim",push:"push-active",sap:"sap-active",stilts:"stilts-active",crossbow:"crossbow-active"}[id]);
    if(game.canLook()) game.requestLook();
  };
  function result(activity,success,text) {
    activity.finished=true; activity.charging=false; activity.success=success;
    if(success) game.manager.stamp(activity.id); else game.audio.playSFX("alert");
    game.manager.message=text; game.manager.setState(activity.id+"-result");
  }
  class TopGame extends game.MiniGameBase {
    constructor() {
      super("top"); this.wrapped=0; this.power=0; this.charging=false; this.chargeTime=0; this.tops=[]; this.contact=false; this.contactRolls=0; this.broken=false; this.retrieved=false; this.debris=[];
      placePlayer([-16.8,0,10]); cameraMode("first-person",playerRoot,{yaw:Math.PI/2,pitch:-0.45});
    }
    launch() {
      if(this.wrapped<config.top.wrapSeconds||game.manager.player.heldItem!=="wooden-top") return;
      game.manager.player.heldItem=null;
      const strength=game.manager.tuning.aiStrength;
      for(let index=0;index<2;index++) {
        const root=game.view.spawn("wooden-top",[-18.7-index*1.5,0.03,10]);
        const body=addCollisionBody("top-projectile",root,{radius:config.top.radius,bodyCenter:[0,0.18,0]}); dynamicBodies.push(body); body.layer="top-arena"; body.mask=new Set(["top-arena"]);
        const speed=config.top.power.minSpeed+(config.top.power.maxSpeed-config.top.power.minSpeed)*this.power;
        const direction=game.view.rig.getViewForward().clone(); direction.y=0; direction.normalize();
        const spin=index===0?28+32*this.power:(28+32*(0.4+strength*0.5));
        this.tops.push({root,body,velocity:index===0?direction.multiplyScalar(speed):new THREE.Vector3(2,0,0.2),spin,broken:false});
      }
      game.audio.playSFX("whoosh"); game.manager.setState("top-active");
    }
    update(dt) {
      super.update(dt);
      if(game.manager.state==="top-preparation") {
        if(game.input.isDown("KeyR")&&this.wrapped<config.top.wrapSeconds) { this.wrapped=Math.min(config.top.wrapSeconds,this.wrapped+dt); if(Math.floor(this.wrapped*8)!==Math.floor((this.wrapped-dt)*8)) game.audio.playSFX("equip"); }
        if(this.charging) { this.chargeTime+=dt; this.power=game.triangle(this.chargeTime*2/game.manager.tuning.powerCycleSeconds); }
        return;
      }
      if(this.finished) return;
      for(const top of this.tops) {
        if(top.broken) continue;
        top.spin=Math.max(0,top.spin-config.top.spinDecayRadiansPerSecondSquared*dt);
        const own=top===this.tops[0],opponent=this.tops[own?1:0];
        const frame=game.view.rig.getControlFrame();
        const steering=own?runtime.mapDirectionalInput(frame,{
          forward:game.input.direction().forward,
          right:game.input.direction().right
        }):opponent.root.position.clone().sub(top.root.position);
        steering.y=0;
        const speed=game.clamp(top.spin/22,0.3,2.3);
        if(steering.lengthSq()>0.001) {
          top.velocity.addScaledVector(steering.normalize(),(own?7:3.5)*dt);
        } else {
          const drift=new THREE.Vector3(Math.cos(this.elapsed*1.7),0,Math.sin(this.elapsed*1.7));
          top.velocity.addScaledVector(drift,1.8*dt);
        }
        top.velocity.y=0;
        top.velocity.multiplyScalar(Math.exp(-Math.min(config.top.groundFriction,0.8)*dt));
        top.velocity.clampLength(speed*0.55,speed*(own?1.5:1));
        const position=top.root.position;
        const center=new THREE.Vector3(-20,0,10),offset=position.clone().sub(center); offset.y=0;
        if(offset.length()>3.7&&top.velocity.dot(offset)>0) top.velocity.reflect(offset.normalize()).multiplyScalar(0.7);
        const next=top.root.position.clone().addScaledVector(top.velocity,dt).setY(0.03);
        const boundaryOffset=next.clone().sub(center); boundaryOffset.y=0;
        if(boundaryOffset.length()>3.7) {
          const normal=boundaryOffset.normalize();
          next.copy(center).addScaledVector(normal,3.7).setY(0.03);
          if(top.velocity.dot(normal)>0) top.velocity.reflect(normal).multiplyScalar(0.85);
        }
        const motion=collisionWorld.moveSolid(top.body,next.sub(top.root.position),{deltaSeconds:dt});
        const parts=top.root.userData.motionParts;
        parts.visual.rotation.y+=top.spin*dt;
        parts.visual.rotation.z=Math.sin(this.elapsed*top.spin)*Math.max(0,(12-top.spin)/12)*0.4;
        if(motion.contacts.some(contact=>contact.collider.gameRole==="top-projectile")) {
          const other=this.tops.find(candidate=>candidate!==top&&!candidate.broken);
          if(other) {
            const normal=top.root.position.clone().sub(other.root.position).setY(0).normalize();
            const relative=top.velocity.clone().sub(other.velocity).dot(normal);
            if(relative<0) {
              const impulse=normal.multiplyScalar(-(1+config.top.restitution)*relative/2);
              top.velocity.add(impulse); other.velocity.sub(impulse);
            }
          }
        }
      }
      const [own,other]=this.tops;
      const touching=own&&!own.broken&&other&&!other.broken&&own.root.position.distanceTo(other.root.position)<config.top.radius*2+0.015;
      if(touching&&!this.contact) {
        this.contactRolls++; game.audio.playSFX("hit");
        if(Math.random()<0.05) {
          const target=Math.random()<0.5?own:other; target.broken=true; target.root.visible=false; target.body.enabled=false;
          if(target===own) this.broken=true; game.audio.playSFX("break");
          const count=2+Math.floor(Math.random()*2);
          for(let piece=0;piece<count;piece++) { const debris=game.view.mesh(game.view.scene,"box",[0.13,0.08,0.1],"#bd7a43",[target.root.position.x+(piece-1)*0.14,0.07,target.root.position.z]); debris.rotation.set(piece*0.5,0,piece); this.debris.push(debris); }
        }
      }
      this.contact=touching;
      if(own&&(own.broken||other.broken||own.spin<0.8||other.spin<0.8)) {
        const won=!own.broken&&(other.broken||own.spin>other.spin);
        if(!own.broken) {
          own.spin=0;
          dynamicBodies=dynamicBodies.filter(body=>body!==own.body);
          const pickupBody=makeTrigger("equipment-pickup",own.root.position.toArray(),{radius:0.5,bodyCenter:[0,0.35,0]},()=>{
            if(game.manager.player.heldItem) return;
            game.manager.player.heldItem="wooden-top"; this.retrieved=true;
            collisionWorld.remove(own.body); collisionWorld.remove(pickupBody); game.view.scene.remove(own.root);
            pickupBody.enabled=false; game.audio.playSFX("pickup"); game.manager.message="Top retrieved. Return to the arena and wrap again.";
          },"E · Retrieve your top");
          savedTops.push({root:own.root,body:own.body,pickup:pickupBody});
        }
        result(this,won,won?"Your top outlasted the villager! Stamp earned. Retrieve it on foot for another round.":this.broken?"Your top broke. Return to the chest for a replacement.":"The villager outlasted your top. Retrieve it on foot and try again.");
      }
    }
    exit() { super.exit(); for(const debris of this.debris) game.view.scene.remove(debris); }
  }
  function quanMove(cells,pit,direction,animate=true) {
    const board=cells.slice(),events=[]; let captured=0,hand=board[pit],cursor=pit,guard=0;
    board[pit]=0; if(animate) events.push({cells:board.slice(),pit});
    while(hand>0&&guard++<10000) {
      cursor=(cursor+direction+12)%12; board[cursor]++; hand--; if(animate) events.push({cells:board.slice(),pit:cursor});
      if(hand>0) continue;
      const next=(cursor+direction+12)%12;
      if(next===5||next===11) break;
      if(board[next]>0) { hand=board[next]; board[next]=0; cursor=next; if(animate) events.push({cells:board.slice(),pit:next}); continue; }
      let empty=next;
      while(board[empty]===0) {
        const target=(empty+direction+12)%12;
        if(board[target]===0) break;
        captured+=board[target]; board[target]=0; if(animate) events.push({cells:board.slice(),pit:target,captured});
        empty=(target+direction+12)%12;
      }
      break;
    }
    return {cells:board,captured,events};
  }
  function evaluateQuan(cells,side,depth,scores,alpha=-Infinity,beta=Infinity) {
    if(depth===0||(!cells[5]&&!cells[11])) return scores[1]-scores[0];
    const pits=side===0?config.quan.playerPits:config.quan.aiPits;
    let best=side===1?-Infinity:Infinity;
    for(const pit of pits) if(cells[pit]>0) for(const direction of [-1,1]) {
      const move=quanMove(cells,pit,direction,false),nextScores=scores.slice(); nextScores[side]+=move.captured;
      const value=evaluateQuan(move.cells,1-side,depth-1,nextScores,alpha,beta);
      if(side===1) { best=Math.max(best,value); alpha=Math.max(alpha,best); }
      else { best=Math.min(best,value); beta=Math.min(beta,best); }
      if(beta<=alpha) return best;
    }
    return Number.isFinite(best)?best:scores[1]-scores[0];
  }
  class QuanGame extends game.MiniGameBase {
    constructor() {
      super("quan"); this.cells=[5,5,5,5,5,10,5,5,5,5,5,10]; this.scores=[0,0]; this.debt=[0,0]; this.turn=0; this.selected=null; this.direction=1; this.queue=[]; this.animationClock=0; this.think=0; this.counted=false;
      this.opponent=config.quan.opponents[game.quanOpponentIndex||0].id;
      document.exitPointerLock?.();
      game.view.roles.board.userData.cameraAspect=null;
      cameraMode("overhead",game.view.roles.board,{yaw:0,distance:3.2,height:4.3,pitch:0,focusHeight:0.35});
      game.view.updateBoard(this.cells);
    }
    legal(side) { return (side===0?config.quan.playerPits:config.quan.aiPits).filter(index=>this.cells[index]>0); }
    selectPit(index) {
      if(this.turn!==0||this.queue.length||this.finished) return;
      if(this.selected!==null) {
        const delta=(index-this.selected+12)%12;
        if(delta===1||delta===11) { this.commit(this.selected,delta===1?1:-1); return; }
      }
      if(this.legal(0).includes(index)) { this.selected=index; game.audio.playSFX("ui-click"); game.ui.refresh(true); }
    }
    commit(pit,direction) {
      if(this.queue.length||this.finished||!this.legal(this.turn).includes(pit)) return;
      const move=quanMove(this.cells,pit,direction);
      this.queue=move.events; this.pending=move; this.baseScore=this.scores[this.turn]; this.animationClock=0; this.selected=null; game.ui.refresh();
    }
    finishMove() {
      this.cells=this.pending.cells; this.scores[this.turn]=this.baseScore+this.pending.captured; this.pending=null;
      if(!this.cells[5]&&!this.cells[11]) {
        for(let side=0;side<2;side++) { const pits=side===0?config.quan.playerPits:config.quan.aiPits; this.scores[side]+=pits.reduce((sum,index)=>sum+this.cells[index],0)-this.debt[side]; for(const index of pits) this.cells[index]=0; }
        const won=this.scores[0]>this.scores[1],draw=this.scores[0]===this.scores[1],records=game.manager.records;
        if(won) { this.counted=records.lastOpponent!==this.opponent; if(this.counted) records.quanStreak++; records.lastOpponent=this.opponent; records.quanBest=Math.max(records.quanBest,records.quanStreak); }
        else if(!draw) { records.quanStreak=0; records.lastOpponent=null; }
        result(this,won,(won?"You won! ":draw?"A draw. Retry for the stamp. ":"The villager won. ")+this.scores[0]+" — "+this.scores[1]+". "+(won?(this.counted?"Streak counted.":"Same-opponent win: streak not increased."):""));
      } else {
        this.turn=1-this.turn; this.refill(this.turn); this.think=config.quan.ai.thinkSecondsByDifficulty[game.manager.difficulty]; game.ui.refresh();
      }
      game.view.updateBoard(this.cells);
    }
    refill(side) {
      const pits=side===0?config.quan.playerPits:config.quan.aiPits;
      if(pits.some(index=>this.cells[index])) return;
      const paid=Math.min(5,this.scores[side]); this.scores[side]-=paid; this.debt[side]+=5-paid;
      for(const pit of pits) this.cells[pit]=1;
      game.manager.message="Empty row replenished: one pebble per pit. Borrowed shortfall is repaid at settlement.";
    }
    update(dt) {
      super.update(dt); if(this.finished) return;
      if(this.queue.length) {
        this.animationClock+=dt;
        if(this.animationClock>=(this.queue[0].captured?config.quan.captureIntervalSeconds:config.quan.sowIntervalSeconds)) {
          this.animationClock=0; const event=this.queue.shift(); this.cells=event.cells;
          if(event.captured) this.scores[this.turn]=this.baseScore+event.captured;
          game.view.updateBoard(this.cells); game.view.sowAt(event.pit,this.turn); game.audio.playSFX("dig");
          const hand=game.view.roles.boardOpponent.userData.motionParts.shoulder1; hand.rotation.x=-0.8+Math.sin(event.pit)*0.2;
          if(!this.queue.length) this.finishMove(); game.ui.refresh();
        }
      } else if(this.turn===1) {
        this.think-=dt; if(this.think>0) return;
        const difficulty=game.manager.difficulty;
        const legalPits=this.legal(1);
        const randomChance=config.quan.ai.randomMoveChanceByDifficulty?.[difficulty]||0;
        if(randomChance>0&&Math.random()<randomChance&&legalPits.length) {
          const pit=legalPits[Math.floor(Math.random()*legalPits.length)];
          this.commit(pit,Math.random()<0.5?-1:1);
          return;
        }
        let best=null; const depth=config.quan.ai.searchDepthByDifficulty[difficulty];
        for(const pit of legalPits) for(const direction of [-1,1]) {
          const move=quanMove(this.cells,pit,direction),scores=[this.scores[0],this.scores[1]+move.captured];
          const value=evaluateQuan(move.cells,0,depth-1,scores);
          if(!best||value>best.value) best={pit,direction,value};
        }
        if(best) this.commit(best.pit,best.direction);
      }
    }
  }
  class ConGame extends game.MiniGameBase {
    constructor() {
      super("con"); this.attempt=0; this.hits=0; this.power=0; this.chargeTime=0; this.charging=false; this.trajectory=[]; this.ringCrossing=false; this.ball=null; this.balls=[]; this.remaining=10; this.launched=0; this.lastLaunch=-1; this.throwResults=[];
      const level=Math.max(0,config.difficulty.order.indexOf(game.manager.difficulty));
      const distance=[11,14,17,20][level],height=[6,7,8.2,9.5][level];
      this.ring={...config.con.ring,position:[config.con.ring.position[0],height,config.con.throwLine.position[2]-distance]};
      const ringRoot=game.view.roles.ring;
      ringRoot.position.set(this.ring.position[0],0,this.ring.position[2]); ringRoot.userData.pole.scale.y=height/config.con.ring.position[1]; ringRoot.userData.crown.position.y=height;
      game.aperture.owner.position.fromArray(this.ring.position);
      game.manager.player.heldItem="con-ball";
      placePlayer(config.con.throwLine.position); cameraMode("first-person",playerRoot,{yaw:0,pitch:0.65});
    }
    launchVector() {
      const direction=game.view.rig.getViewForward().clone();
      const speed=(config.con.power.minSpeed+(config.con.power.maxSpeed-config.con.power.minSpeed)*this.power)*1.4;
      if(game.manager.tuning.aimAssistDegrees>0) {
        const origin=playerRoot.position.clone().add(new THREE.Vector3(0,1.4,0));
        const target=vector(this.ring.position).sub(origin); const horizontal=Math.hypot(target.x,target.z);
        const discriminant=speed**4-config.con.gravity*(config.con.gravity*horizontal**2+2*target.y*speed**2);
        if(discriminant>0) {
          const angle=Math.atan((speed*speed-Math.sqrt(discriminant))/(config.con.gravity*horizontal));
          const assisted=new THREE.Vector3(target.x/horizontal*Math.cos(angle),Math.sin(angle),target.z/horizontal*Math.cos(angle));
          if(direction.angleTo(assisted)<THREE.MathUtils.degToRad(game.manager.tuning.aimAssistDegrees)) direction.copy(assisted);
        }
      }
      return direction.multiplyScalar(speed);
    }
    launch() {
      if(game.manager.player.heldItem!=="con-ball"||this.remaining<=0||this.elapsed-this.lastLaunch<0.35) return;
      const position=playerRoot.position.clone().add(new THREE.Vector3(0,config.con.launchHeight,0));
      position.addScaledVector(game.view.rig.getViewForward(),0.55);
      const root=game.view.spawn("con-ball",position.toArray()),body=addCollisionBody("con-projectile",root,{radius:0.13}); dynamicBodies.push(body);
      this.ball={root,body,velocity:this.launchVector(),age:0,settle:0,hit:false,index:this.launched++}; this.balls.push(this.ball); this.ringCrossing=false;
      this.remaining--; this.lastLaunch=this.elapsed; this.power=0;
      game.manager.player.heldItem=this.remaining>0?"con-ball":null;
      game.audio.playSFX("whoosh"); game.manager.setState(this.remaining>0?"con-aim":"con-flight");
      game.manager.message=this.remaining>0?"Còn "+this.remaining+" quả trong túi — tiếp tục ngắm và ném!":"Đã ném đủ 10 quả, chờ kết quả…";
    }
    update(dt) {
      super.update(dt); if(this.finished) return;
      if(game.manager.state==="con-aim") {
        if(this.charging) { this.chargeTime+=dt; this.power=game.triangle(this.chargeTime*2/game.manager.tuning.powerCycleSeconds); }
        const origin=playerRoot.position.clone().add(new THREE.Vector3(0,config.con.launchHeight,0)).addScaledVector(game.view.rig.getViewForward(),0.55),velocity=this.launchVector();
        this.trajectory=[];
        for(let time=0;time<3;time+=0.05) { const point=origin.clone().addScaledVector(velocity,time); point.y-=0.5*config.con.gravity*time*time; if(point.y<0) break; this.trajectory.push(point.toArray()); }
      }
      for(const ball of this.balls.slice()) {
        const previous=ball.root.position.clone(); ball.age+=dt; ball.velocity.y-=config.con.gravity*dt;
        const motion=collisionWorld.moveSolid(ball.body,ball.velocity.clone().multiplyScalar(dt),{deltaSeconds:dt});
        for(const contact of motion.contacts) if(ball.velocity.dot(contact.normal)<0) ball.velocity.addScaledVector(contact.normal,-(1+config.con.bounceRestitution)*ball.velocity.dot(contact.normal));
        if(motion.contacts.length) { ball.velocity.x*=0.85; ball.velocity.z*=0.85; }
        const current=ball.root.position,ring=this.ring;
        if(!ball.hit&&(previous.z-ring.position[2])*(current.z-ring.position[2])<=0&&previous.z!==current.z) {
          const fraction=(ring.position[2]-previous.z)/(current.z-previous.z);
          const intersection=previous.clone().lerp(current,fraction);
          if(Math.hypot(intersection.x-ring.position[0],intersection.y-ring.position[1])<=ring.innerRadius-config.con.ballRadius) {
            ball.hit=true; this.ringCrossing=true; this.hits++; game.manager.records.conTotal++; game.manager.records.hitStreak++; game.manager.records.bestHitStreak=Math.max(game.manager.records.bestHitStreak,game.manager.records.hitStreak); game.audio.playSFX("hit"); game.manager.message="Through the ring! +1";
          }
        }
        ball.root.userData.motionParts.visual.rotation.x+=dt*8;
        if(current.y<0.25&&ball.velocity.length()<0.8) ball.settle+=dt;
        if(ball.settle>config.con.settleSeconds||ball.age>config.con.maxFlightSeconds||Math.abs(current.x)>config.world.bounds.max[0]-1||Math.abs(current.z)>31) {
          this.throwResults[ball.index]=ball.hit; this.attempt++; if(!ball.hit) { game.manager.records.hitStreak=0; game.audio.playSFX("alert"); }
          collisionWorld.remove(ball.body); game.view.scene.remove(ball.root); dynamicBodies=dynamicBodies.filter(body=>body!==ball.body); this.balls=this.balls.filter(active=>active!==ball); this.ball=this.balls[this.balls.length-1]||null;
          if(this.attempt===10) {
            game.manager.records.conBest=Math.max(game.manager.records.conBest,this.hits);
            result(this,this.hits>=1,this.hits+" / 10 rings. "+(this.hits?"Festival stamp earned!":"No rings this round. Try a higher launch angle and more power."));
          }
        }
      }
    }
  }
  class PushGame extends game.MiniGameBase {
    constructor() {
      super("push"); this.god=game.manager.difficulty==="God"; this.perfectChain=0; this.requiredPerfectChain=24; this.displacement=0; this.meter=50; this.grade="Sẵn sàng"; this.clock=-2;
      this.period=2.3; this.angle=0; this.direction=1; this.targetAngle=0.75; this.combo=0; this.rank="C"; this.rankIndex=0;
      this.zoneWidth=1.25; this.stun=0; this.lastInput=-10; this.attempted=false;
      this.nextAi=1.4; this.nextRush=8+Math.random()*4; this.rushUntil=0; this.setCombo(0);
      for(const body of pushBodies) body.enabled=true;
      game.view.roles.pushPlayer.visible=true;
      collisionWorld.placeSolid(pushBodies[0],new THREE.Vector3(21.1,0,-10)); collisionWorld.placeSolid(pushBodies[1],new THREE.Vector3(18.9,0,-10));
      const fit=Math.max(1,1.25/game.view.camera.aspect);
      cameraMode("overhead",game.view.roles.push,{yaw:Math.PI/8,distance:4.8*fit,height:4.5*fit,focusHeight:0.35});
      game.view.roles.push.userData.cameraAspect=game.view.camera.aspect;
      document.exitPointerLock?.(); game.audio.playSFX("equip");
      game.manager.message="Bấm SPACE hoặc chạm vòng tròn khi bi xanh vào cung đỏ. Trúng: cung đổi chỗ, nhỏ dần, bi tăng tốc và đảo chiều!";
    }
    setCombo(value) {
      this.combo=value; this.rankIndex=Math.min(5,Math.floor(value/2));
      this.rank=["C","B","A","S","SS","SSS"][this.rankIndex];
      this.period=this.god?Math.max(1,1.75-value*0.032):Math.max(0.8,2.65-game.manager.tuning.aiStrength*0.7-value*0.11);
      this.zoneWidth=this.god?Math.max(0.38,0.8-value*0.018):Math.max(0.36,1.3-game.manager.tuning.aiStrength*0.25-value*0.07);
    }
    miss() {
      this.grade="MISS"; this.perfectChain=0; this.setCombo(0); this.stun=this.god?0.3:0.65; this.meter-=this.god?15:5;
      game.audio.playSFX("alert");
    }
    hit() {
      if(this.finished||this.clock<0||this.stun>0||this.attempted||this.clock-this.lastInput<0.18) return;
      this.lastInput=this.clock; this.attempted=true;
      const error=Math.abs(Math.atan2(Math.sin(this.angle-this.targetAngle),Math.cos(this.angle-this.targetAngle)));
      if(error<=this.zoneWidth/2) {
        const perfect=error<=this.zoneWidth*(this.god?0.3:0.16);
        this.perfectChain=perfect?this.perfectChain+1:0;
        this.grade=perfect?"PERFECT":"GOOD";
        this.meter+=this.god?(perfect?3+this.rankIndex*0.12:0.3):Math.min(8,(perfect?4.5:3)+this.rankIndex*0.7);
        this.setCombo(this.combo+1);
        this.direction*=-1;
        const circle=Math.PI*2;
        const nextTarget=(this.angle+Math.PI+(Math.random()-0.5)*1.1)%circle;
        this.targetAngle=game.clamp(nextTarget,0.65,circle-0.65);
        this.attempted=false; game.audio.playSFX("hit");
      } else this.miss();
      this.resolve(); game.ui.refresh();
    }
    resolve() {
      this.meter=game.clamp(this.meter,0,this.god&&this.perfectChain<this.requiredPerfectChain?99:100);
      if(this.finished||this.meter>0&&this.meter<100) return;
      const won=this.meter===100; this.displacement=(this.meter-50)/50*Math.max(2.25,config.push.exitDisplacement);
      this.moveActors(1/60); game.audio.playSFX(won?"clap":"alert");
      result(this,won,won?"Bạn đã đẩy đối thủ ra khỏi vòng phấn! Nhận dấu hội làng.":"Bạn đã bị đẩy khỏi vòng. Canh bi xanh vào cung đỏ để thử lại!");
    }
    moveActors(dt) {
      for(let index=0;index<pushBodies.length;index++) {
        const body=pushBodies[index],targetX=20+this.displacement+(index===0?1.1:-1.1);
        collisionWorld.moveSolid(body,new THREE.Vector3(targetX-body.owner.position.x,0,0),{deltaSeconds:dt});
      }
      const staff=game.view.roles.push.userData.motionParts.staff;
      staff.position.x=this.displacement; staff.position.y=0.76+Math.sin(this.clock*6)*0.015;
    }
    update(dt) {
      super.update(dt); if(this.finished) return; this.clock+=dt;
      if(this.clock>=0) {
        this.setCombo(this.combo); this.stun=Math.max(0,this.stun-dt);
        const circle=Math.PI*2,travel=dt*circle/this.period;
        const entry=this.targetAngle-this.direction*this.zoneWidth/2;
        const deadline=this.targetAngle+this.direction*this.zoneWidth/2;
        const distanceToEntry=((entry-this.angle)*this.direction%circle+circle)%circle;
        const distanceToExit=((deadline-this.angle)*this.direction%circle+circle)%circle;
        this.angle=(this.angle+this.direction*travel+circle)%circle;
        if(this.attempted&&distanceToEntry<travel) this.attempted=false;
        if(!this.attempted&&distanceToExit<travel) { this.attempted=true; this.miss(); }
        if(this.clock>=this.nextRush) {
          this.rushUntil=this.clock+5; this.nextRush=this.clock+12+Math.random()*6;
          game.manager.message="Kẻ địch đang dồn lực! Hãy giữ vững nhịp bấm!";
          game.audio.playSFX("alert");
        }
        if(this.god) this.meter-=dt*(this.clock<this.rushUntil?1.35:0.85);
        if(!this.god&&this.clock>=this.nextAi) {
          this.nextAi=this.clock+1.2+Math.random()*0.8;
          if(Math.random()<0.48+game.manager.tuning.aiStrength*0.35) {
            const rushing=this.clock<this.rushUntil&&this.rankIndex<3;
            this.meter-=(1.4+game.manager.tuning.aiStrength*1.5)*(rushing?2:1);
          }
        }
        this.resolve();
      }
      if(!this.finished) this.displacement+=( (this.meter-50)/50*Math.max(2.25,config.push.exitDisplacement)-this.displacement)*Math.min(1,dt*10);
      this.moveActors(dt);
    }
  }
  class SapGame extends game.MiniGameBase {
    constructor() {
      super("sap"); this.level=Math.max(0,config.difficulty.order.indexOf(game.manager.difficulty));
      this.period=60/config.sap.bpm/[1,1.15,1.35,1.6][this.level];
      this.targetSteps=config.sap.trackLength+this.level*4; this.travelTime=2.1;
      this.promptDuration=Math.min(0.8,this.period*0.85);
      this.window=[0.19,0.16,0.13,0.10][this.level];
      this.keys=["KeyD","KeyF","KeyJ","KeyK"];
      this.combo=0; this.bestCombo=0; this.progress=0; this.score=0; this.accuracyTotal=0;
      this.stepTargetZ=config.sap.startPosition[2]; this.trip=false; this.tripTimer=0; this.flashes=[0,0,0,0]; this.resetChart(2.85);
      game.view.roles.sap.userData.stepTiles.forEach((tile,index)=>{
        tile.visible=index<this.targetSteps; tile.position.z=-(index+1)*config.sap.trackLength/this.targetSteps;
        tile.scale.z=config.sap.trackLength/this.targetSteps/0.45;
      });
      placePlayer(config.sap.startPosition); cameraMode("first-person",playerRoot,{yaw:0,pitch:-0.25});
      document.exitPointerLock?.();
    }
    get note() { return this.notes.find(note=>!note.hit)||null; }
    resetChart(countIn) {
      this.clock=-countIn; this.beat=-1; this.lastClap=-1; this.grade="Sẵn sàng";
      const pattern=[0,1,2,3,2,0,3,1,0,2,1,3,1,0,2,3];
      this.notes=Array.from({length:this.targetSteps},(_,index)=>({index:index+1,lane:pattern[index%pattern.length],code:this.keys[pattern[index%pattern.length]],time:index*this.period,hit:false}));
    }
    step(code) {
      if(this.finished||this.tripTimer>0) return;
      const lane=this.keys.indexOf(code);
      if(lane<0) return;
      const note=this.note;
      if(!note||this.clock<note.time-this.promptDuration) return;
      this.flashes[lane]=0.14;
      if(note.lane!==lane||this.clock>note.time+this.window) { this.clampFeet(); return; }
      const quality=game.clamp((note.time+this.window-this.clock)/(this.promptDuration+this.window),0,1);
      this.grade=quality>=0.6?"Tuyệt vời!":quality>=0.25?"Tốt!":"Kịp rồi!";
      this.score+=quality>=0.6?350:quality>=0.25?200:100; this.accuracyTotal+=quality;
      this.combo++; this.bestCombo=Math.max(this.bestCombo,this.combo); note.hit=true;
      this.progress=Math.min(this.targetSteps,this.progress+1);
      this.stepTargetZ=config.sap.startPosition[2]-config.sap.trackLength*this.progress/this.targetSteps;
      game.manager.player.verticalSpeed=0; game.manager.player.grounded=true;
      game.audio.playSFX("footstep"); game.manager.message=this.grade+" · "+this.progress+" / "+this.targetSteps+" bước";
    }
    clampFeet() {
      this.combo=0; this.trip=true; this.tripTimer=1.1;
      this.grade="MISS · Kẹp chân! Đi lại từ đầu"; game.manager.message=this.grade;
      game.manager.player.verticalSpeed=0; game.audio.playSFX("alert"); game.audio.playBGM();
    }
    update(dt) {
      super.update(dt); if(this.finished) return;
      this.flashes=this.flashes.map(value=>Math.max(0,value-dt));
      if(this.progress>=this.targetSteps&&Math.abs(playerRoot.position.z-this.stepTargetZ)<0.01) { result(this,true,"Qua hết đường sạp! Nhận dấu hội làng · "+this.score+" điểm · Chuỗi "+this.bestCombo); return; }
      if(this.tripTimer>0) {
        this.tripTimer=Math.max(0,this.tripTimer-dt);
        for(const pole of game.view.roles.sap.userData.poles) pole.position.z=-pole.userData.pair*2+pole.userData.side*config.sap.closedGap/2;
        if(this.tripTimer===0) {
          this.progress=0; this.score=0; this.accuracyTotal=0; this.trip=false;
          this.stepTargetZ=config.sap.startPosition[2]; placePlayer(config.sap.startPosition); this.resetChart(2.1); game.audio.playBGM();
        }
        return;
      }
      this.clock+=dt; this.beat=((Math.floor(this.clock/this.period)%4)+4)%4;
      if(this.note&&this.clock>this.note.time+this.window) { this.clampFeet(); return; }
      const beatNumber=Math.floor(this.clock/this.period);
      if(this.clock>=0&&beatNumber!==this.lastClap) { this.lastClap=beatNumber; game.audio.playSFX("clap"); }
      const phase=((this.clock/this.period)%1+1)%1;
      const pulse=Math.pow(Math.cos(phase*Math.PI),2);
      const gap=THREE.MathUtils.lerp(config.sap.closedGap,config.sap.openGap,pulse);
      for(const pole of game.view.roles.sap.userData.poles) pole.position.z=-pole.userData.pair*2+pole.userData.side*gap/2;
      for(const clamp of game.sapClamps) clamp.enabled=false;
    }
  }
  class StiltsGame extends game.MiniGameBase {
    constructor() {
      super("stilts"); this.level=config.difficulty.order.indexOf(game.manager.difficulty);
      this.targetSteps=config.stilts.steps[this.level]; this.period=config.stilts.periodSeconds[this.level];
      this.window=config.stilts.windowSeconds[this.level]; this.progress=0; this.clock=-2.5;
      this.nextBeat=0; this.expectedFoot="KeyQ"; this.lastFoot=null; this.fallen=false; this.fallTimer=0;
      this.grade="Sẵn sàng · Chân trái trước"; this.stepAnimation=0;
      const walker=game.view.roles.stiltWalker; walker.visible=true;
      walker.position.fromArray(config.stilts.startPosition); walker.rotation.set(0,0,0);
      this.targetZ=walker.position.z; game.view.roles.stiltCourse.userData.finish.position.z=-this.targetSteps;
      const fit=Math.max(1,0.8/game.view.camera.aspect);
      cameraMode("over-the-shoulder",walker,{yaw:Math.PI,pitch:0,distance:4.5*fit,height:4.5*Math.sqrt(3)*fit,focusHeight:1.1});
      document.exitPointerLock?.(); game.audio.playSFX("equip");
    }
    step(code) {
      if(this.finished||this.fallen) return;
      if(this.clock < -this.window) return;
      if(code!==this.expectedFoot||Math.abs(this.clock-this.nextBeat)>this.window) { this.fall("Sai chân hoặc lệch nhịp!"); return; }
      this.progress++; this.lastFoot=code; this.expectedFoot=code==="KeyQ"?"KeyE":"KeyQ";
      this.nextBeat+=this.period; this.targetZ=config.stilts.startPosition[2]-this.progress*config.stilts.stepDistance;
      this.stepAnimation=1; this.grade="Đúng nhịp! · "+this.progress+" / "+this.targetSteps+" m";
      game.manager.message=this.grade; game.audio.playSFX("footstep");
    }
    fall(reason) {
      this.fallen=true; this.fallTimer=0.85; this.grade=reason+" Nhân vật bị ngã.";
      game.manager.message=this.grade; game.audio.playSFX("alert");
    }
    update(dt) {
      super.update(dt); if(this.finished) return;
      const walker=game.view.roles.stiltWalker;
      if(this.fallen) {
        this.fallTimer=Math.max(0,this.fallTimer-dt);
        walker.rotation.z=(1-this.fallTimer/0.85)*1.3; walker.position.y=-(1-this.fallTimer/0.85)*0.45;
        if(this.fallTimer===0) result(this,false,this.grade+" Bấm thử lại để đi từ đầu.");
        return;
      }
      this.clock+=dt;
      const remaining=this.targetZ-walker.position.z;
      walker.position.z+=Math.sign(remaining)*Math.min(Math.abs(remaining),dt*5);
      this.stepAnimation=Math.max(0,this.stepAnimation-dt/0.2);
      walker.rotation.z=Math.sin(this.stepAnimation*Math.PI)*(this.lastFoot==="KeyQ"?-0.055:0.055);
      const parts=walker.userData.motionParts;
      for(const side of [-1,1]) {
        const moving=(this.lastFoot==="KeyQ"? -1:1)===side;
        const lift=moving?Math.sin(this.stepAnimation*Math.PI)*0.15:0;
        parts["hip"+side].position.y=0.95+lift;
        parts["hip"+side].position.z=-lift;
        walker.userData.stilts[side===-1?0:1].position.z=-lift;
        walker.userData.stilts[side===-1?0:1].position.y=0.6+lift;
      }
      if(this.progress===this.targetSteps&&Math.abs(remaining)<0.01) { result(this,true,"Đã đi hết "+this.targetSteps+" m cà kheo! Nhận dấu hội làng."); return; }
      if(this.progress<this.targetSteps&&this.clock>this.nextBeat+this.window) this.fall("Bỏ lỡ nhịp bước!");
    }
  }
  class CrossbowGame extends game.MiniGameBase {
    constructor() {
      super("crossbow"); const level=config.difficulty.order.indexOf(game.manager.difficulty);
      this.required=config.crossbow.requiredHits[level]; this.total=config.crossbow.arrowCounts[level];
      this.shots=0; this.hits=0; this.arrows=[]; this.cooldown=0; this.lastShot=null; this.grade="Ngắm tâm vàng · Bắn khi sẵn sàng";
      this.distance=config.crossbow.distanceByDifficulty[level];
      this.motionAmplitude=config.crossbow.motionAmplitudeByDifficulty[level]; this.motionSpeed=config.crossbow.motionSpeedByDifficulty[level];
      this.targetOrigin=vector(config.crossbow.targetPosition); this.targetOrigin.z=config.crossbow.startPosition[2]-this.distance;
      game.view.roles.crossbowRange.position.copy(this.targetAt(0));
      placePlayer(config.crossbow.startPosition);
      const pitch=Math.atan2(this.targetOrigin.y-config.player.eyeHeight,this.distance);
      cameraMode("first-person",playerRoot,{yaw:0,pitch});
      game.view.camera.zoom=1.7; game.view.camera.updateProjectionMatrix();
      game.view.roles.crossbowWeapon.visible=true; game.audio.playSFX("equip");
    }
    targetAt(time) {
      return this.targetOrigin.clone().add(new THREE.Vector3(Math.sin(time*this.motionSpeed)*this.motionAmplitude,0,0));
    }
    shoot() {
      if(this.finished||this.cooldown>0||this.shots>=this.total) return;
      const origin=game.view.camera.position.clone(),direction=game.view.rig.getViewForward().normalize();
      const target=game.view.roles.crossbowRange.position,distance=(target.z-origin.z)/direction.z;
      const end=origin.clone().addScaledVector(direction,distance>0&&distance<100?distance:45);
      const obstruction=collisionWorld.raycast(origin,direction,Math.min(100,origin.distanceTo(end)),{ignoreOwner:playerRoot});
      const blocked=Boolean(obstruction&&obstruction.distance<origin.distanceTo(end)-0.15);
      const eligible=!blocked&&distance>0&&distance<100;
      if(blocked) end.copy(obstruction.point||origin.clone().addScaledVector(direction,obstruction.distance));
      const root=new THREE.Group(); game.view.scene.add(root);
      game.view.mesh(root,"cylinder",[0.016,0.016,0.7,8],"#80532e",[0,0,0],[Math.PI/2,0,0]);
      game.view.mesh(root,"cone",[0.045,0.13,8],"#b6c4c4",[0,0,-0.4],[-Math.PI/2,0,0]);
      const start=origin.clone().addScaledVector(direction,0.9); root.position.copy(start); root.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),end.clone().sub(start).normalize());
      const body=addCollisionBody("con-projectile",root,{radius:0.02}); body.enabled=false; dynamicBodies.push(body);
      this.arrows.push({root,body,start,end,eligible,hit:false,age:0,duration:start.distanceTo(end)/config.crossbow.arrowSpeed,landed:false});
      this.shots++; this.cooldown=config.crossbow.reloadSeconds; this.grade="Mũi tên đang bay…";
      game.audio.playSFX("whoosh","crossbow");
    }
    update(dt) {
      super.update(dt); if(this.finished) return;
      this.cooldown=Math.max(0,this.cooldown-dt);
      const target=this.targetAt(this.elapsed); game.view.roles.crossbowRange.position.copy(target);
      for(const arrow of this.arrows) {
        if(arrow.landed) { if(arrow.hit) arrow.root.position.copy(target).add(arrow.targetOffset); continue; }
        arrow.age+=dt; arrow.root.position.lerpVectors(arrow.start,arrow.end,Math.min(1,arrow.age/arrow.duration));
        if(arrow.age>=arrow.duration) {
          const impactTarget=this.targetAt(this.elapsed-(arrow.age-arrow.duration));
          arrow.hit=arrow.eligible&&Math.hypot(arrow.end.x-impactTarget.x,arrow.end.y-impactTarget.y)<=config.crossbow.centerRadius;
          arrow.landed=true;
          if(arrow.hit) { this.hits++; arrow.targetOffset=arrow.end.clone().sub(impactTarget); arrow.root.position.copy(target).add(arrow.targetOffset); }
          this.lastShot={hit:arrow.hit,position:arrow.end.toArray()};
          this.grade=arrow.hit?"TRÚNG TÂM!":"Trượt tâm · Chỉnh lại hướng ngắm";
          game.manager.message=this.grade; game.audio.playSFX(arrow.hit?"hit":"alert");
        }
      }
      if(this.shots===this.total&&this.arrows.every(arrow=>arrow.landed)) result(this,this.hits>=this.required,"Bắn Nỏ: "+this.hits+" / "+this.total+" trúng tâm · Yêu cầu "+this.required+" / "+this.total+". "+(this.hits>=this.required?"Nhận dấu hội làng!":"Chưa đạt, hãy thử lại."));
    }
    exit() {
      super.exit(); game.view.roles.crossbowRange.position.fromArray(config.crossbow.targetPosition);
      game.view.camera.zoom=1; game.view.camera.updateProjectionMatrix();
    }
  }
  game.selectBoard=function(event) {
    const activity=game.manager.activity; if(activity?.id!=="quan"||activity.turn!==0||activity.queue.length) return;
    const rect=game.view.renderer.domElement.getBoundingClientRect(),pointer=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    const ray=new THREE.Raycaster(); ray.setFromCamera(pointer,game.view.camera);
    const hit=ray.intersectObjects(game.view.roles.board.userData.cells.map(cell=>cell.userData.pickTarget),false)[0];
    const index=hit?.object.userData.index;
    if(Number.isInteger(index)) activity.selectPit(index);
  };
  game.fixedUpdate=function(dt) {
    const manager=game.manager;
    if(manager.state==="sap-active"&&!manager.activity.trip) {
      const remaining=manager.activity.stepTargetZ-playerRoot.position.z;
      const stride=Math.min(Math.abs(remaining),config.sap.trackLength/manager.activity.targetSteps*dt/0.18)*Math.sign(remaining);
      if(manager.state!=="paused"&&stride) collisionWorld.moveSolid(playerBody,new THREE.Vector3(0,0,stride),{deltaSeconds:dt});
    }
    if(["ready","paused","festival-complete"].includes(manager.state)||manager.state.endsWith("-result")) return;
    manager.time+=dt; manager.frame++;
    if(game.canLook()&&!manager.seated) {
      const player=manager.player,walking=!["sap-active","top-active","crossbow-active"].includes(manager.state);
      const inputIntent=walking?game.input.direction():{forward:0,right:0};
      const frame=game.view.rig.getControlFrame(),desired=runtime.mapDirectionalInput(frame,inputIntent);
      const facing=runtime.resolveLocomotionFacing(frame,inputIntent,desired);
      const orientation=facing.lengthSq()>0?runtime.faceDirection(playerRoot,facing,{frame:spatialFrame,apply:false}):undefined;
      player.velocity.lerp(desired.multiplyScalar(config.player.walkSpeed),1-Math.exp(-dt*12));
      player.verticalSpeed-=config.player.gravity*dt;
      const displacement=player.velocity.clone().multiplyScalar(dt); displacement.y=player.verticalSpeed*dt;
      const motion=collisionWorld.moveSolid(playerBody,displacement,{orientation,deltaSeconds:dt});
      const grounded=motion.contacts.some(contact=>contact.normal.y>0.6);
      if(grounded) { if(!player.grounded) game.audio.playSFX("land"); player.verticalSpeed=0; }
      player.grounded=grounded;
      if(player.velocity.length()>0.5&&grounded&&Math.floor(manager.time*2.2)!==Math.floor((manager.time-dt)*2.2)) game.audio.playSFX("footstep");
    }
    manager.activity?.update(dt);
    game.view.rig.fixedUpdate();
    game.updateInteraction(); game.ui.tick(dt);
  };
  game.forceOutcome=function(state) {
    const id=state.split("-")[0];
    if(["top","quan","con","push","sap","stilts","crossbow"].includes(id)&&state.endsWith("-result")) {
      if(game.manager.activeActivity!==id) { if(id==="top") game.manager.player.heldItem="wooden-top"; if(id==="con") game.manager.player.heldItem="con-ball"; game.enterActivity(id,true); }
      result(game.manager.activity,id!=="con"||game.manager.activity.hits>0,"Activity result reached through the shared outcome transition.");
    } else if(state==="festival-complete") { for(const activity of config.activities) game.manager.stamp(activity.id); game.manager.setState(state); }
    else if(state==="paused") game.manager.pause();
  };
})(window);
