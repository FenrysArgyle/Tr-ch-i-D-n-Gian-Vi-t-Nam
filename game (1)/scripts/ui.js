(function registerUi(window) {
  "use strict";
  window.SoonLabGame ||= {};
  const game=window.SoonLabGame, config=game.config;
  const escape=value=>String(value).replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
  game.createUi=function() {
    const panel=document.querySelector("#overlay"),hud=document.querySelector("#hud"),activityHud=document.querySelector("#activity-hud"),message=document.querySelector("#message"),hint=document.querySelector("#interact"),lockHint=document.querySelector("[data-pointer-lock-hint]");
    let lastState="",lastBoard="",lastActivityMarkup="",clock=0,nameDraft="",nameSession=0,namePending=false,returnFocus=null;
    const fullscreenButton=document.querySelector("#mobile-fullscreen"),fullscreenNotice=document.querySelector("#fullscreen-notice");
    let fullscreenPending=false,fullscreenNoticeTimer;
    const effects=document.createElement("div"),reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
    effects.id="interface-effects"; effects.setAttribute("aria-hidden","true");
    document.querySelector("#game-root").appendChild(effects);
    let presentationKey="",outcomeTimer;
    function clickFeedback(target,event) {
      if(reducedMotion.matches||target.disabled||!target.closest("#overlay, #top-actions")) return;
      const bounds=target.getBoundingClientRect(),rootBounds=effects.getBoundingClientRect();
      const ripple=document.createElement("span"); ripple.className="selection-ripple";
      const centerX=event.detail?event.clientX:bounds.left+bounds.width/2,centerY=event.detail?event.clientY:bounds.top+bounds.height/2;
      ripple.style.left=(centerX-rootBounds.left)+"px"; ripple.style.top=(centerY-rootBounds.top)+"px";
      effects.appendChild(ripple);
      while(effects.childElementCount>40) effects.firstElementChild.remove();
      ripple.animate([{opacity:0.8,transform:"translate(-50%,-50%) scale(0.15)"},{opacity:0,transform:"translate(-50%,-50%) scale(2.4)"}],{duration:480,easing:"cubic-bezier(.16,1,.3,1)"}).finished.then(()=>ripple.remove(),()=>ripple.remove());
    }
    function transitionPanel(state,active) {
      const nextKey=state+":"+Boolean(game.showRecords);
      if(nextKey===presentationKey) return;
      presentationKey=nextKey;
      window.clearTimeout(outcomeTimer); effects.replaceChildren();
      const outcome=!game.showRecords&&(state==="festival-complete"||state.endsWith("-result"));
      const success=state==="festival-complete"||active?.success===true;
      panel.dataset.outcome=outcome?(success?"success":"failure"):"";
      if(reducedMotion.matches) return;
      const inner=panel.querySelector(".panel-inner");
      if(inner&&!panel.hidden) {
        const frames=outcome&&!success?[{opacity:0,transform:"translateX(-12px)"},{opacity:1,transform:"translateX(7px)",offset:0.55},{opacity:1,transform:"translateX(-3px)",offset:0.8},{opacity:1,transform:"translateX(0)"}]:[{opacity:0,transform:"translateY(18px) scale(.985)"},{opacity:1,transform:"translateY(0) scale(1)"}];
        inner.animate(frames,{duration:outcome?540:340,easing:"cubic-bezier(.16,1,.3,1)"});
      }
      if(!outcome) return;
      const glow=document.createElement("span"); glow.className="outcome-glow "+(success?"success":"failure"); effects.appendChild(glow);
      if(success) for(let index=0;index<28;index++) {
        const particle=document.createElement("i"); particle.className="celebration-particle";
        particle.style.left=((index*37+11)%100)+"%";
        particle.style.setProperty("--drift",((index%7-3)*22)+"px");
        particle.style.setProperty("--turn",((index%2?1:-1)*(240+index*19))+"deg");
        particle.style.background=["#e5b74f","#639d81","#df8264","#fff2c4"][index%4];
        particle.style.animationDelay=(index%8*0.045)+"s"; effects.appendChild(particle);
      }
      outcomeTimer=window.setTimeout(()=>effects.replaceChildren(),2100);
    }
    const fullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
    function updateFullscreen() {
      const active=Boolean(fullscreenElement());
      fullscreenButton.textContent=active?"⛶ Thu nhỏ":"⛶ Toàn màn hình";
      fullscreenButton.setAttribute("aria-label",active?"Thoát toàn màn hình":"Bật toàn màn hình");
      fullscreenButton.setAttribute("aria-pressed",String(active));
      fullscreenNotice.hidden=true;
    }
    function showFullscreenNotice(text) {
      window.clearTimeout(fullscreenNoticeTimer);
      fullscreenNotice.textContent=text;
      fullscreenNotice.hidden=false;
      fullscreenNoticeTimer=window.setTimeout(()=>{fullscreenNotice.hidden=true;},6000);
    }
    fullscreenButton.addEventListener("pointerdown",event=>event.stopPropagation());
    fullscreenButton.addEventListener("click",async event=>{
      event.stopPropagation();
      if(fullscreenPending) return;
      const active=Boolean(fullscreenElement());
      const target=active?document:document.documentElement;
      const toggle=active?(document.exitFullscreen||document.webkitExitFullscreen):(target.requestFullscreen||target.webkitRequestFullscreen);
      if(!toggle) {
        showFullscreenNotice("Trình duyệt này không hỗ trợ toàn màn hình cho trò chơi. Bạn vẫn có thể chơi bình thường.");
        return;
      }
      fullscreenPending=true;
      fullscreenButton.disabled=true;
      try {
        await toggle.call(target);
        updateFullscreen();
      } catch(error) {
        showFullscreenNotice("Chưa thể bật/tắt toàn màn hình. Hãy thử lại hoặc cho phép toàn màn hình trong trình duyệt.");
      } finally {
        fullscreenPending=false;
        fullscreenButton.disabled=false;
      }
    });
    document.addEventListener("fullscreenchange",updateFullscreen);
    document.addEventListener("webkitfullscreenchange",updateFullscreen);
    updateFullscreen();
    const danceTarget=document.createElement("button");
    danceTarget.id="dance-target"; danceTarget.type="button"; danceTarget.hidden=true;
    danceTarget.setAttribute("aria-label","Nhảy Sạp · Bấm chữ trong vòng tròn");
    const keys=["D","F","J","K"];
    danceTarget.innerHTML='<span class="dance-approach"></span><b class="dance-key"></b><small>BẤM NGAY</small>';
    document.querySelector("#game-root").appendChild(danceTarget);
    const danceKey=danceTarget.querySelector(".dance-key");
    function updateDance() {
      const active=game.manager.activity;
      const note=active?.id==="sap"?active.note:null;
      danceTarget.hidden=game.manager.state!=="sap-active"||game.showRecords||active.trip||!note||active.clock<note.time-active.promptDuration;
      if(danceTarget.hidden) return;
      danceKey.textContent=keys[note.lane];
      danceTarget.setAttribute("aria-label","Bấm "+keys[note.lane]+" trước khi vòng tròn khép lại");
      const remaining=game.clamp((note.time+active.window-active.clock)/(active.promptDuration+active.window),0,1);
      danceTarget.style.setProperty("--approach",1+remaining);
      danceTarget.classList.toggle("in-time",remaining<0.35);
    }
    danceTarget.addEventListener("pointerdown",event=>{
      event.preventDefault(); event.stopPropagation(); game.audio.unlock();
      const active=game.manager.activity;
      if(game.manager.state==="sap-active"&&!danceTarget.hidden&&active.note) active.step(active.note.code);
      refresh();
    });
    const pushTiming=document.createElement("button");
    pushTiming.id="push-timing"; pushTiming.type="button"; pushTiming.hidden=true;
    pushTiming.innerHTML='<span class="push-track"></span><span class="push-orbit"><i></i></span><span class="push-prompt">SPACE</span><small class="push-rating"></small>';
    pushTiming.setAttribute("aria-label","Đẩy gậy: bấm khi bi xanh vào cung đỏ");
    document.querySelector("#game-root").appendChild(pushTiming);
    pushTiming.addEventListener("pointerdown",event=>{
      event.preventDefault(); event.stopPropagation(); game.audio.unlock();
      if(game.manager.state==="push-active") game.manager.activity.hit();
    });
    const newControls=document.createElement("div"); newControls.id="festival-extra-controls"; newControls.hidden=true;
    newControls.innerHTML='<button type="button" data-stilt-foot="KeyQ">Q · TRÁI</button><button type="button" data-stilt-foot="KeyE">E · PHẢI</button><button type="button" data-crossbow-fire>BẮN NỎ</button>';
    document.querySelector("#game-root").appendChild(newControls);
    newControls.addEventListener("pointerdown",event=>{
      const target=event.target.closest("button"); if(!target) return;
      event.preventDefault(); event.stopPropagation(); game.audio.unlock();
      if(game.manager.state==="stilts-active") game.action(target.dataset.stiltFoot);
      if(game.manager.state==="crossbow-active"&&target.hasAttribute("data-crossbow-fire")) game.charge(true);
    });
    function button(action,label,style) { return '<button data-action="'+action+'" class="'+(style||"secondary")+'">'+label+'</button>'; }
    function recordMarkup() {
      const board=game.boardResult,current=board?.ok?board.current:null;
      const details=current?'<b>Personal best: '+current.score+' / 10</b><span>Best-score rank #'+current.rank+' · '+(current.nextScore===null?'Top score':current.nextScore+' hits to overtake')+'</span>':(game.boardLoading?'<span>Checking personal best…</span>':board?.ok?'<span>No personal best yet. Complete ten throws.</span>':'<span>Personal best, rank and target unavailable. Local play continues.</span>');
      const card='<div class="personal-best"><span data-player-name></span>'+details+button('edit-name','Edit nickname','text-button')+'</div>';
      if(game.boardLoading) return card+'<p>Loading festival records…</p>';
      if(!board?.ok) return card+'<p class="muted">Online records are unavailable. Retry with Refresh.</p>';
      return card+'<ol class="records">'+board.items.map((row,index)=>'<li'+(row.playerId===game.leaderboard.profile.playerId?' class="self-record"':'')+'><span>#'+row.rank+' <span data-record-name="'+index+'"></span>'+(row.playerId===game.leaderboard.profile.playerId?' · You':'')+'</span><b>'+row.score+'</b></li>').join('')+'</ol>';
    }
    function refresh(force) {
      const manager=game.manager;if(!manager) return;
      const state=manager.state,active=manager.activity,activity=config.activities.find(item=>item.id===manager.activeActivity);
      const boardKey=active?.id==="quan"?[active.turn,active.selected,active.queue.length,...active.cells,...active.scores].join(","):"";
      document.querySelector("#game-root").classList.toggle("quan-playing",state==="quan-turn"&&!game.showRecords);
      document.querySelector("#difficulty-tag").textContent=manager.difficulty;
      document.querySelector("#stamp-count").textContent=manager.stamps.size+" / "+config.activities.length;
      for(const activity of config.activities) {
        const stamp=document.querySelector('[data-stamp="'+activity.id+'"]'); stamp.classList.toggle("earned",manager.stamps.has(activity.id));
        stamp.title=activity.name+(manager.stamps.has(activity.id)?" · earned":" · not yet earned");
      }
      document.querySelector("#held-item").textContent=manager.player.heldItem?manager.player.heldItem==="wooden-top"?"Wooden top":"Ribboned ball":"Hands empty";
      document.querySelector("#leave-activity").hidden=(!manager.activeActivity&&!manager.seated)||state==="paused";
      document.querySelector("#leave-activity").textContent=manager.seated?"Đứng dậy":"Leave activity";
      document.querySelector("#game-root").classList.toggle("swing-seated",Boolean(manager.seated));
      hud.hidden=state==="ready";
      document.querySelector("#compass").hidden=state!=="exploring";
      lockHint.hidden=state==="sap-active"||game.input?.touchMode||!game.canLook()||document.pointerLockElement===game.view?.renderer.domElement;
      game.input?.refreshTouch();
      document.querySelector("#aim-reticle").hidden=!game.canLook()||state==="sap-active";
      document.querySelector("#aim-reticle").classList.toggle("on-target",Boolean(manager.interactionTarget));
      message.textContent=manager.message;
      hint.hidden=!manager.interactionTarget||!game.canLook(); hint.textContent=manager.interactionTarget?.label||"";
      if(manager.player.heldItem&&manager.interactionTarget?.label?.startsWith("E · Take")) hint.textContent="E · Return held equipment / collect when hands are free";
      hint.classList.toggle("interaction-focus",!hint.hidden);
      if(game.input?.touchMode&&!hint.hidden) hint.textContent="Chạm · "+hint.textContent.replace(/^E · /,"");
      document.querySelector("#game-root").classList.toggle("con-playing",active?.id==="con");
      document.querySelector("#game-root").classList.toggle("sap-playing",state==="sap-active");
      activityHud.classList.toggle("con-hud",active?.id==="con");
      activityHud.classList.toggle("sap-hud",active?.id==="sap");
      const pushing=state==="push-active";
      document.querySelector("#game-root").classList.toggle("push-playing",pushing);
      activityHud.classList.toggle("push-hud",pushing);
      pushTiming.hidden=!pushing||game.showRecords;
      if(!pushTiming.hidden) {
        const start=(active.targetAngle-active.zoneWidth/2)*180/Math.PI,end=(active.targetAngle+active.zoneWidth/2)*180/Math.PI;
        pushTiming.style.setProperty("--zone-start",start+"deg"); pushTiming.style.setProperty("--zone-end",end+"deg");
        pushTiming.style.setProperty("--needle",active.angle*180/Math.PI+"deg");
        pushTiming.classList.toggle("stunned",active.stun>0);
        pushTiming.querySelector(".push-prompt").textContent=active.clock<0?Math.ceil(-active.clock):game.input?.touchMode?"CHẠM":"SPACE";
        pushTiming.querySelector(".push-rating").textContent=active.grade;
      }

      newControls.hidden=!["stilts-active","crossbow-active"].includes(state)||game.showRecords;
      for(const target of newControls.querySelectorAll("[data-stilt-foot]")) {
        target.hidden=state!=="stilts-active"; target.disabled=Boolean(active?.fallen);
        target.classList.toggle("expected",target.dataset.stiltFoot===active?.expectedFoot);
      }
      const fireButton=newControls.querySelector("[data-crossbow-fire]"); fireButton.hidden=state!=="crossbow-active";
      fireButton.disabled=state==="crossbow-active"&&(active.cooldown>0||active.shots>=active.total);
      document.querySelector("#game-root").classList.toggle("extra-playing",!newControls.hidden);
      updateDance();
      activityHud.hidden=!activity||state.endsWith("-result")||state==="paused";
      if(activity&&!activityHud.hidden) {
        let detail="",meter="";
        if(active.id==="top") {
          const value=state==="top-preparation"?(active.wrapped<config.top.wrapSeconds?active.wrapped/config.top.wrapSeconds:active.power):active.tops[0]?.spin/60||0;
          detail=state==="top-preparation"?active.wrapped<config.top.wrapSeconds?"HOLD R · WRAP THE ROPE":"HOLD MOUSE · CHARGE, RELEASE TO LAUNCH":"WASD / MŨI TÊN · LÁI CÙ  |  "+Math.round(active.tops[0]?.spin||0)+"  ·  AI  "+Math.round(active.tops[1]?.spin||0);
          meter='<div class="meter"><i style="width:'+value*100+'%"></i><span class="sweet-spot"></span></div>';
        }
        if(active.id==="con") {
          detail='<span class="con-round">LƯỢT <b>'+Math.min(10,active.launched+1)+'</b> / 10</span><strong class="con-score">'+active.hits+' <small>TRÚNG VÒNG</small></strong>';
          const instruction=state==="con-flight"?"Còn đang bay…":!manager.player.heldItem?"Chờ các quả còn chạm đất…":game.input?.touchMode?"Vuốt để ngắm · Giữ nút ném, thả để tung":"Ngắm cao hơn vòng · Giữ chuột để lấy lực, thả để ném";
          meter='<div class="con-attempts" aria-label="Kết quả 10 lượt">'+Array.from({length:10},(_,index)=>'<span class="'+(active.throwResults[index]!==undefined?(active.throwResults[index]?"hit":"miss"):index<active.launched?"current":"")+'">'+(active.throwResults[index]!==undefined?(active.throwResults[index]?"✓":"×"):index+1)+'</span>').join("")+'</div><div class="con-power-label"><span>LỰC NÉM</span><b>'+Math.round(active.power*100)+'%</b></div><div class="meter"><i style="width:'+active.power*100+'%"></i></div><p class="con-instruction">'+instruction+'</p><small>Trong túi: '+active.remaining+' / 10 quả · Đang bay: '+active.balls.length+'</small><small>Vòng cách '+Math.abs(active.ring.position[2]-config.con.throwLine.position[2])+' m · Cao '+active.ring.position[1]+' m</small><small>Kỷ lục: '+manager.records.conBest+'/10 · Chuỗi trúng: '+manager.records.hitStreak+'</small>';
        }
        if(active.id==="sap") {
          detail=active.clock<0?"Sẵn sàng · "+Math.ceil(-active.clock):active.grade;
          meter='<div class="dance-progress">'+Array.from({length:active.targetSteps},(_,index)=>'<span class="'+(index<active.progress?"done":"")+'">'+(index<active.progress?"✓":index+1)+'</span>').join("")+'</div><small>'+active.progress+' / '+active.targetSteps+' · Chuỗi '+active.combo+' · '+active.score+' điểm · '+(active.progress?Math.round(active.accuracyTotal/active.progress*100):100)+'%</small><small>Lỡ nhịp: kẹp chân, đi lại từ đầu</small><small>'+(game.input?.touchMode?"Chạm chữ trong vòng tròn trước khi vòng khép lại":"Bấm chữ D · F · J · K hiện trong vòng tròn trước khi vòng khép lại")+'</small>';
        }
        if(active.id==="push") {
          const rushing=active.clock<active.rushUntil;
          detail='<b>'+Math.round(active.meter)+'%</b><span>HẠNG '+active.rank+' · CHUỖI '+active.combo+'</span><b>'+Math.round(100-active.meter)+'%</b>';
          meter='<div class="push-bar"><i style="width:'+active.meter+'%"></i></div><small>BẠN <span>ĐỐI THỦ</span></small><p class="rush-warning">'+(active.god?'GOD · PERFECT: '+active.perfectChain+' / '+active.requiredPerfectChain+' liên tiếp · '+(rushing?'ĐỐI THỦ DỒN LỰC · ':'')+'GOOD ngắt chuỗi, MISS mất 15%':rushing?(active.rankIndex>=3?'Hạng '+active.rank+': đã hóa giải dồn lực!':'Kẻ địch đang dồn lực! Hãy giữ vững nhịp bấm!'):'SPACE / CHẠM · Canh bi xanh vào cung đỏ')+'</p>';

        }
        if(active.id==="stilts") {
          const ready=active.clock<0;
          detail=active.fallen?active.grade:ready?"Sẵn sàng · "+Math.ceil(-active.clock):active.grade;
          const distance=active.nextBeat-active.clock,phase=game.clamp(1-distance/active.period,0,1);
          meter='<div class="stilt-beat '+(!ready&&Math.abs(distance)<=active.window?'on-beat':'')+'"><b>'+(active.expectedFoot==="KeyQ"?'Q · TRÁI':'E · PHẢI')+'</b><i style="transform:scale('+(1.8-phase*0.8)+')"></i></div><div class="meter"><i style="width:'+active.progress/active.targetSteps*100+'%"></i></div><small>'+active.progress+' / '+active.targetSteps+' m · Luân phiên Q → E</small><small>Chờ vòng khép vào viền · Sai chân / lệch nhịp sẽ ngã</small>';
        }
        if(active.id==="crossbow") {
          detail=active.grade;
          meter='<strong class="crossbow-score">'+active.hits+' / '+active.required+' TRÚNG TÂM</strong><div class="meter"><i style="width:'+active.hits/active.required*100+'%"></i></div><small>Mũi tên còn: '+(active.total-active.shots)+' / '+active.total+' · '+manager.difficulty+': '+active.required+'/'+active.total+'</small><small>Cự ly '+active.distance+' m · '+(active.motionSpeed?'Bia di chuyển · Ngắm đón hướng bia':'Bia cố định')+'</small><small>Ngắm tâm vàng · Chuột trái / Space / nút BẮN</small>';
        }
        if(active.id==="quan") detail=active.queue.length?"SOWING STONES…":active.turn===0?"YOUR TURN · SELECT A PIT":"VILLAGER IS THINKING…";
        const activityMarkup='<div class="eyebrow">'+activity.name+'</div><div class="activity-status">'+detail+'</div>'+meter;
        if(activityMarkup!==lastActivityMarkup) { activityHud.innerHTML=activityMarkup; lastActivityMarkup=activityMarkup; }
      }
      if(!force&&state===lastState&&boardKey===lastBoard) return;
      const focused=document.activeElement,selection=focused?.id==="nickname"?[focused.selectionStart,focused.selectionEnd]:null;
      if(selection) nameDraft=focused.value;
      const scrollTop=panel.scrollTop;
      lastState=state; lastBoard=boardKey;
      panel.classList.toggle("board-panel",state==="quan-turn");
      panel.hidden=true; let content="";
      if(game.showRecords) {
        content='<div class="eyebrow">FESTIVAL RECORDS</div><h2>Ring masters</h2>'+recordMarkup()+button("refresh-records","Refresh")+button("close-records","Back","primary");
      } else if(state==="ready") {
        content='<div class="eyebrow"><span class="tiny-flower">✦</span> A VILLAGE FULL OF TRADITIONS</div><h1>Lễ Hội<br><em>Trò Chơi Dân Gian</em></h1><p class="intro">A little courage. A little rhythm.<br>Seven ways to celebrate the Vietnamese countryside.</p><details class="creator-art"><summary>Tranh nhân vật do bạn cung cấp</summary><img src="'+escape(game.assets.find(asset=>asset.id==="creator-character-reference").path)+'" alt="Tranh nhân vật do người tạo cung cấp" style="display:block;max-width:100%;max-height:240px;object-fit:contain;margin:12px auto"></details><div class="ready-stamps"><span>SPIN</span><span>STRATEGIZE</span><span>THROW</span><span>PUSH</span><span>DANCE</span><span>CÀ KHEO</span><span>BẮN NỎ</span></div><label class="difficulty-label">CHOOSE YOUR CHALLENGE</label><div class="difficulty-buttons">'+config.difficulty.order.map(level=>'<button data-difficulty="'+level+'" aria-pressed="'+(level===manager.difficulty)+'" class="'+(level===manager.difficulty?'selected':'')+'">'+level+'</button>').join("")+'</div><p class="muted difficulty-help">'+({Noob:"Gentle AI, helpful aim, and forgiving beats. A perfect first visit.",Pro:"Sharper rivals and tighter beats. Find your festival flow.",Hacker:"Expert rivals and fast meters. Precision makes the difference.",God:"Đẩy gậy cực khó: cần 24 PERFECT liên tiếp và đầy thanh lực; GOOD ngắt chuỗi, MISS mất 15%."})[manager.difficulty]+'</p><div class="button-row">'+button("start","Enter the festival  →","primary")+button("records","Records")+'</div><div class="controls-strip"><span><kbd>W A S D</kbd> Walk</span><span><kbd>MOUSE</kbd> Look</span><span><kbd>E</kbd> Interact</span></div>';
      } else if(state==="paused") content='<div class="eyebrow">TAKE A BREATHER</div><h2>Festival paused</h2><p>Your stamps are safe. Resume when you’re ready.</p>'+button("resume","Resume festival","primary")+button("restart","Restart festival");
      else if(state==="festival-complete") content='<div class="eyebrow">A DAY TO REMEMBER</div><h2>Bảy trò chơi.<br>Bảy dấu hội!</h2><p>You’ve completed the village festival. Stay a while, revisit your favorites, or begin a new celebration.</p><div class="celebration">✦ ✦ ✦ ✦ ✦ ✦ ✦</div>'+button("continue","Keep exploring","primary")+button("restart","New festival");
      else if(state.endsWith("-result")) {
        content='<div class="eyebrow">'+(activity?.name||"FESTIVAL")+' · ROUND COMPLETE</div><h2>'+(manager.stamps.has(manager.activeActivity)?"A tradition mastered!":"One more try?")+'</h2><p>'+escape(manager.message)+'</p>'+(active?.id==="con"?'<div class="score-hero">'+active.hits+'<small> / 10</small></div><div id="submission-status">'+escape(manager.submissionState==='submitted'?"Best score saved":manager.submissionState==='failed'?"Online records unavailable — local result retained":manager.submissionState==='test-suppressed'?"Test mode — no score uploaded":"Saving your best score…")+'</div>'+button("records","View records")+(manager.submissionState==="failed"?button("retry-submit","Retry score upload"):""):"")+(active?.id==="quan"?'<p>Streak: '+manager.records.quanStreak+' · Best: '+manager.records.quanBest+'</p>'+button("next-opponent","Next villager"):"")+'<div class="button-row">'+(active?.id!=="top"?button("retry","Retry activity","primary"):"")+button("leave","Return to village",active?.id==="top"?"primary":"secondary")+'</div>';
      } else if(state==="quan-turn") {
        content='<div class="eyebrow">Ô ĂN QUAN · '+escape(config.quan.opponents.find(opponent=>opponent.id===active.opponent).displayName)+'</div><div class="board-scores"><span>BẠN <b>'+active.scores[0]+'</b></span><span>ĐỐI THỦ <b>'+active.scores[1]+'</b></span></div><p class="muted" role="status">'+(active.queue.length?'Đang rải quân trên bàn…':active.turn?'Đối thủ đang suy nghĩ…':active.selected===null?'Chạm ô có quân ở hàng gần bạn để chọn.':'Đã chọn ô '+(active.selected+1)+' · '+active.cells[active.selected]+' quân. Chạm ô sáng ngay bên trái hoặc phải để rải theo chiều đó.')+'</p>';
      }
      if(state==="con-result"&&!game.showRecords) content+=recordMarkup();
      if(game.editingName) content+='<form id="nickname-form"><label>Festival nickname<input id="nickname" maxlength="32" autocomplete="off" aria-describedby="name-status name-help"></label><p id="name-help">Use 1–16 characters. This changes your leaderboard and future-play nickname; your best score stays unchanged.</p><button class="primary" type="submit" '+(namePending?'disabled':'')+'>Save</button><button type="button" data-action="cancel-name">Cancel</button><p id="name-status" role="status">'+escape(game.nameStatus||'')+'</p></form>';
      if(content) {
        panel.innerHTML='<div class="panel-inner">'+content+'</div>'; panel.hidden=false;
        panel.querySelectorAll('[data-player-name]').forEach(element=>element.textContent=game.leaderboard.profile.displayName);
        panel.querySelectorAll('[data-record-name]').forEach(element=>{const row=game.boardResult.items[Number(element.dataset.recordName)];element.textContent=row.playerId===game.leaderboard.profile.playerId?game.leaderboard.profile.displayName:row.displayName;});
        panel.scrollTop=scrollTop;
        const input=panel.querySelector('#nickname');
        if(input) { input.value=nameDraft; if(selection) {input.focus({preventScroll:true});input.setSelectionRange(...selection);} }
      }
      transitionPanel(state,active);
      document.querySelector("#village-subtitle").textContent=manager.activeActivity?activity?.name||"Festival":"MIỀN QUÊ VIỆT NAM";
    }
    document.addEventListener("click",async event=>{
      const target=event.target.closest("button");if(!target||target.disabled) return;
      clickFeedback(target,event);
      game.audio.unlock(); game.audio.playSFX("ui-click");
      if(target.dataset.difficulty) { game.manager.difficulty=target.dataset.difficulty; refresh(true); return; }
      if(target.dataset.pit!==undefined) { const active=game.manager.activity; if(active?.id==="quan") active.selectPit(Number(target.dataset.pit)); refresh(true); return; }
      const active=game.manager.activity;
      switch(target.dataset.action) {
        case "start": game.start(); break;
        case "resume": game.manager.resume(); break;
        case "restart": game.showRecords=false; game.editingName=false; game.restart(); break;
        case "leave": game.leaveActivity(); break;
        case "retry": game.retryActivity(); break;
        case "continue": game.manager.setState("exploring"); game.requestLook(); break;
        case "direction-left": if(active?.id==="quan") active.direction=-1; refresh(true); break;
        case "direction-right": if(active?.id==="quan") active.direction=1; refresh(true); break;
        case "confirm-move": if(active?.id==="quan"&&active.turn===0) active.commit(active.selected,active.direction); break;
        case "next-opponent": game.quanOpponentIndex=((game.quanOpponentIndex||0)+1)%config.quan.opponents.length; game.retryActivity(); break;
        case "records": if(!["ready","paused"].includes(game.manager.state)&&!game.manager.state.endsWith("-result")) game.manager.pause(); game.showRecords=true; document.exitPointerLock?.(); await game.loadRecords(); break;
        case "refresh-records": await game.loadRecords(); break;
        case "close-records": game.showRecords=false; game.editingName=false; nameSession++; refresh(true); break;
        case "edit-name": nameDraft=game.leaderboard.profile.displayName;game.nameStatus="";namePending=false;nameSession++;returnFocus=target;game.editingName=true;refresh(true);document.querySelector("#nickname")?.focus();break;
        case "cancel-name": closeName(); break;
        case "retry-submit": if(game.manager.submissionState!=="submitting") game.submitScore(); break;
      }
    });
    function closeName() {
      game.editingName=false;nameSession++;refresh(true);
      if(returnFocus?.isConnected) returnFocus.focus(); else panel.querySelector('[data-action="edit-name"]')?.focus();
    }
    function validName(value) {
      const normalized=value.normalize('NFC').trim();
      return Array.from(normalized).length>=1&&Array.from(normalized).length<=16&&!/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(normalized);
    }
    document.addEventListener('input',event=>{
      if(event.target.id!=='nickname') return;
      nameDraft=event.target.value;const valid=validName(nameDraft);
      event.target.setAttribute('aria-invalid',String(!valid));
      panel.querySelector('#name-status').textContent=valid?'':'Use 1–16 characters without control characters.';
      panel.querySelector('#nickname-form [type="submit"]').disabled=!valid||namePending;
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&game.editingName){event.preventDefault();event.stopImmediatePropagation();closeName();}},true);
    document.addEventListener("submit",async event=>{
      if(event.target.id!=="nickname-form") return;event.preventDefault();
      const name=document.querySelector("#nickname").value,version=game.manager.roundVersion,session=nameSession;
      if(namePending||!validName(name)) return;
      nameDraft=name;namePending=true;game.nameStatus='Saving nickname…';refresh(true);
      const response=await game.leaderboard.rename(name);
      if(version!==game.manager.roundVersion||session!==nameSession||!game.editingName) return;
      namePending=false;
      game.nameStatus=response.ok?(response.skipped?"Test mode — nickname not changed":"Nickname saved"):"Nickname could not be saved. Check records with Refresh, then retry.";
      if(response.ok&&!response.skipped) { game.editingName=false;nameSession++;if(response.items) game.acceptBoard(response); }
      refresh(true);
      if(game.editingName) document.querySelector('#nickname')?.focus();else panel.querySelector('[data-action="edit-name"]')?.focus();
    });
    return {refresh,tick(dt) { clock+=dt;if(clock>0.06) { clock=0;refresh(); } else if(game.manager.state==="sap-active") updateDance(); }};
  };
})(window);
