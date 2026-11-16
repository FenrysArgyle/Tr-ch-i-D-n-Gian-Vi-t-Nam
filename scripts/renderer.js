(function registerRenderer(window) {
  "use strict";
  window.SoonLabGame ||= {};
  const game = window.SoonLabGame;
  const THREE = window.THREE;
  const palette = game.config.world.palette;
  let tracker;
  const materials = new Map(), geometries = new Map();
  let personIndex=0, lowDetail=false;
  const originalGeometries=new WeakMap(), simplifiedGeometries=new WeakMap(), hiddenDetails=new Map();
  function applyMeshDetail(part) {
    if(!part.isMesh) return;
    if(!originalGeometries.has(part)) originalGeometries.set(part,part.geometry);
    const original=originalGeometries.get(part);
    if(!lowDetail) { part.geometry=original; return; }
    let simplified=simplifiedGeometries.get(original);
    if(!simplified) {
      const parameters=original.parameters, shape=part.userData.detailShape;
      if(shape?.shape==="box") simplified=new THREE.BoxGeometry(...shape.dimensions);
      else if(original.type==="SphereGeometry") simplified=new THREE.SphereGeometry(parameters.radius,Math.min(8,parameters.widthSegments),Math.min(6,parameters.heightSegments),parameters.phiStart,parameters.phiLength,parameters.thetaStart,parameters.thetaLength);
      else if(original.type==="CylinderGeometry") simplified=new THREE.CylinderGeometry(parameters.radiusTop,parameters.radiusBottom,parameters.height,8,1,parameters.openEnded,parameters.thetaStart,parameters.thetaLength);
      else if(original.type==="ConeGeometry") simplified=new THREE.ConeGeometry(parameters.radius,parameters.height,8,1,parameters.openEnded);
      else if(original.type==="TorusGeometry") simplified=new THREE.TorusGeometry(parameters.radius,parameters.tube,4,20,parameters.arc);
      else if(part.name.startsWith("mountain-ridge-")) {
        simplified=original.clone();
        const indices=[];
        for(let row=0;row<20;row+=2) for(let column=0;column<192;column+=4) {
          const corner=row*193+column, next=corner+386;
          indices.push(corner,next,corner+4,corner+4,next,next+4);
        }
        simplified.setIndex(indices);
      }
      if(simplified) { tracker.track(simplified); simplifiedGeometries.set(original,simplified); }
    }
    part.geometry=simplified||original;
  }
  function markCharacterDetails(root) {
    root.traverse(part=>{
      if(!part.isMesh) return;
      const original=originalGeometries.get(part)||part.geometry;
      if(!original.boundingBox) original.computeBoundingBox();
      const size=original.boundingBox.getSize(new THREE.Vector3()).multiply(part.scale);
      if(Math.max(size.x,size.y,size.z)<0.105) part.userData.lowDetailHidden=true;
      if(lowDetail&&part.userData.lowDetailHidden) { hiddenDetails.set(part,part.visible); part.visible=false; }
    });
  }
  function material(color) {
    if (!materials.has(color)) materials.set(color, tracker.track(new THREE.MeshStandardMaterial({ color, roughness:0.76, flatShading:false })));
    return materials.get(color);
  }
  function geometry(key, make) { if (!geometries.has(key)) geometries.set(key, tracker.track(make())); return geometries.get(key); }
  function roundedBox(dimensions) {
    if (Math.max(...dimensions)>20||Math.min(...dimensions)<0.025) return new THREE.BoxGeometry(...dimensions);
    const geo=new THREE.BoxGeometry(1,1,1,8,8,8),positions=geo.attributes.position,normals=geo.attributes.normal;
    const radius=Math.min(...dimensions)*0.16,point=new THREE.Vector3(),nearest=new THREE.Vector3(),normal=new THREE.Vector3();
    const core=dimensions.map(size=>size/2-radius);
    for(let index=0;index<positions.count;index++) {
      point.fromBufferAttribute(positions,index);
      nearest.set(game.clamp(point.x,-0.25,0.25),game.clamp(point.y,-0.25,0.25),game.clamp(point.z,-0.25,0.25));
      normal.copy(point).sub(nearest).normalize();
      positions.setXYZ(index,nearest.x*4*core[0]+normal.x*radius,nearest.y*4*core[1]+normal.y*radius,nearest.z*4*core[2]+normal.z*radius);
      normals.setXYZ(index,normal.x,normal.y,normal.z);
    }
    return geo;
  }
  function mesh(root, shape, dimensions, color, position, rotation) {
    const key = shape + dimensions.join(",");
    const geo = geometry(key, () => {
      if(shape === "box") return roundedBox(dimensions);
      if(shape === "cylinder") return new THREE.CylinderGeometry(dimensions[0],dimensions[1],dimensions[2],Math.max(24,dimensions[3]||24),dimensions[4]||1);
      if(shape === "sphere") return new THREE.SphereGeometry(...dimensions);
      if(shape === "torus") return new THREE.TorusGeometry(dimensions[0],dimensions[1],Math.max(12,dimensions[2]||12),Math.max(64,dimensions[3]||64));
      return new THREE.ConeGeometry(dimensions[0],dimensions[1],Math.max(48,dimensions[2]||48));
    });
    const part = new THREE.Mesh(geo, material(color));
    part.position.fromArray(position || [0,0,0]);
    if (rotation) part.rotation.set(...rotation);
    part.userData.detailShape={shape,dimensions};
    if(lowDetail) applyMeshDetail(part);
    part.castShadow = true; part.receiveShadow = true; root.add(part); return part;
  }
  function group() { const root = new THREE.Group(); const visual = new THREE.Group(); root.add(visual); root.userData.motionParts = { visual }; return root; }
  function bamboo(root, length, radius, position, rotation) {
    const stem = new THREE.Group(); stem.position.fromArray(position || [0,0,0]); if (rotation) stem.rotation.set(...rotation); root.add(stem);
    mesh(stem,"cylinder",[radius*0.84,radius,length,7],palette.bamboo);
    for (let node=-length/2+0.2; node<length/2; node+=0.65) mesh(stem,"cylinder",[radius*1.12,radius*1.12,0.035,7],"#747c40",[0,node,0]);
    return stem;
  }
  function chalk(root, radius, position) { return mesh(root,"torus",[radius,0.025,4,64],palette.chalk,position || [0,0.035,0],[Math.PI/2,0,0]); }
  function roof(root, width, depth, height) {
    for (const side of [-1,1]) {
      mesh(root,"box",[width,0.17,depth*0.57],palette.terracotta,[0,height,side*depth*0.23],[side*0.34,0,0]);
      mesh(root,"box",[width+0.3,0.12,0.2],"#d47b52",[0,height-0.38,side*depth*0.49]);
    }
    mesh(root,"cylinder",[0.14,0.14,width+0.5,8],"#ebaa70",[0,height+0.43,0],[0,0,Math.PI/2]);
  }
  function buildFestivalGate() {
    const root = group(), visual = root.userData.motionParts.visual;
    for (const side of [-1,1]) {
      mesh(visual,"box",[0.8,4.2,0.9],palette.limewash,[side*3.4,2.1,0]);
      mesh(visual,"box",[1.1,0.25,1.2],palette.terracotta,[side*3.4,0.15,0]);
      mesh(visual,"box",[1,0.2,1],palette.terracotta,[side*3.4,4.1,0]);
      bamboo(visual,6,0.07,[side*4.2,3,0]);
      const flag = mesh(visual,"box",[0.8,1.2,0.035],side===1?palette.yellow:palette.red,[side*4.6,5,0]);
      root.userData.motionParts["flag"+side] = flag;
    }
    mesh(visual,"box",[6.8,0.5,0.5],palette.wood,[0,3.85,0]); roof(visual,8,2.4,4.6);
    mesh(visual,"box",[4.8,0.7,0.08],palette.red,[0,3.25,-0.32]);
    return root;
  }
  function softMesh(root,shape,dimensions,color,position,rotation) {
    const part=mesh(root,shape,dimensions,color,position,rotation),key="soft:"+color;
    if(!materials.has(key)) materials.set(key,tracker.track(new THREE.MeshStandardMaterial({color,roughness:0.78,flatShading:false})));
    part.material=materials.get(key); return part;
  }
  function oval(root,size,color,position) {
    const detailed=Math.max(...size)>=0.1;
    const part=softMesh(root,"sphere",detailed?[1,40,28]:[1,16,12],color,position); part.scale.fromArray(size); return part;
  }
  function sculptHand(root,side,detailed=true) {
    const skin="#d6a17e",light="#e4b18b";
    oval(root,[0.055,0.073,0.029],skin,[0,0.01,-0.035]);
    oval(root,[0.036,0.04,0.034],light,[-side*0.024,-0.012,-0.041]);
    for(let finger=0;finger<4;finger++) {
      const length=[0.068,0.081,0.075,0.057][finger],fingerRoot=new THREE.Group();
      fingerRoot.position.set(side*(finger-1.5)*0.026,0.055,-0.037);
      fingerRoot.rotation.set(-0.3,0,side*(finger-1.5)*-0.055); root.add(fingerRoot);
      const radius=finger===3?0.010:0.012;
      if(!detailed) { oval(fingerRoot,[radius,length*0.5,radius],skin,[0,length*0.4,-0.01]); continue; }
      softMesh(fingerRoot,"cylinder",[radius*0.9,radius,length*0.55,10],skin,[0,length*0.22,0]);
      oval(fingerRoot,[radius,radius,radius],light,[0,length*0.48,0]);
      const tip=new THREE.Group(); tip.position.set(0,length*0.48,0); tip.rotation.x=-0.45; fingerRoot.add(tip);
      softMesh(tip,"cylinder",[radius*0.72,radius*0.9,length*0.45,10],skin,[0,length*0.2,0]);
      oval(tip,[radius*0.75,radius*0.9,radius*0.75],light,[0,length*0.43,0]);
      oval(tip,[radius*0.57,length*0.105,0.0025],"#edc8ae",[0,length*0.32,radius*0.72]);
    }
    const thumb=new THREE.Group(); thumb.position.set(-side*0.047,0,-0.03); thumb.rotation.set(-0.4,0,side*0.8); root.add(thumb);
    softMesh(thumb,"cylinder",[0.014,0.018,0.047,10],skin,[0,0.015,0]);
    oval(thumb,[0.014,0.025,0.014],light,[0,0.043,-0.008]);
  }
  function buildPlayerHands() {
    const root=group(),visual=root.userData.motionParts.visual;
    for(const side of [-1,1]) {
      const wrist=new THREE.Group(); wrist.position.set(side*0.27,-0.34,-0.5); wrist.rotation.y=-side*0.16; visual.add(wrist);
      softMesh(wrist,"cylinder",[0.052,0.067,0.27,12],palette.teal,[0,-0.13,0.07],[0.55,0,0]);
      softMesh(wrist,"cylinder",[0.05,0.052,0.035,12],"#e4d4b1",[0,-0.025,0.007],[0.3,0,0]);
      softMesh(wrist,"cylinder",[0.038,0.046,0.085,12],"#d6a17e",[0,-0.023,-0.008],[0.3,0,0]);
      sculptHand(wrist,side);
      root.userData.motionParts[side===1?"rightWrist":"leftWrist"]=wrist;
    }
    markCharacterDetails(root);
    return root;
  }
  function person(seated) {
    const root=group(),visual=root.userData.motionParts.visual,variant=personIndex++%4;
    const hipHeight=seated?0.5:0.95,shirt=[palette.teal,"#8b3e43","#30556c","#a4673d"][variant];
    const skin=["#d6a17e","#c88e6a","#e0b28d","#ca9475"][variant],hair="#292322",trim="#d7b66e";
    const chest=softMesh(visual,"cylinder",[0.22,0.245,0.59,24],shirt,[0,hipHeight+0.32,0]);
    root.userData.motionParts.chest=chest;
    oval(visual,[0.255,0.12,0.145],shirt,[0,hipHeight+0.57,0]);
    softMesh(visual,"cylinder",[0.24,0.255,0.075,24],"#713a39",[0,hipHeight+0.06,0]);
    for(const side of [-1,1]) {
      softMesh(visual,"box",[0.054,0.22,0.018],trim,[side*0.053,hipHeight+0.53,-0.207],[0,0,side*0.32]);
      softMesh(visual,"box",[0.015,0.44,0.015],trim,[side*0.19,hipHeight+0.3,-0.14],[0,0,side*0.06]);
      for(let stitch=0;stitch<7;stitch++) {
        softMesh(visual,"box",[0.032,0.032,0.012],stitch%2?"#edd7a4":"#ae5b4d",[side*0.19,hipHeight+0.12+stitch*0.052,-0.16],[0,0,Math.PI/4]);
      }
      for(let fold=0;fold<3;fold++) {
        const crease=oval(visual,[0.012,0.12,0.012],shirt,[side*(0.11+fold*0.032),hipHeight+0.22,-0.206]);
        crease.rotation.z=side*0.16;
      }
    }
    for(let button=0;button<5;button++) {
      oval(visual,[0.011,0.011,0.008],trim,[0,hipHeight+0.49-button*0.083,-0.236]);
      softMesh(visual,"box",[0.04,0.008,0.009],"#e9c898",[0.018,hipHeight+0.49-button*0.083,-0.232]);
    }
    softMesh(visual,"cylinder",[0.066,0.086,0.16,20],skin,[0,hipHeight+0.7,0]);
    const head=new THREE.Group(); head.position.set(0,hipHeight+0.91,0); visual.add(head);
    root.userData.motionParts.head=head; root.userData.motionParts.eyes=[];
    oval(head,[0.162,0.218,0.151],skin,[0,0,0]);
    oval(head,[0.13,0.108,0.12],skin,[0,-0.119,-0.012]);
    oval(head,[0.164,0.125,0.154],hair,[0,0.113,0.018]);
    for(let lock=0;lock<7;lock++) {
      const angle=(lock/6-0.5)*2.5;
      const curl=oval(head,[0.038,0.07,0.023],hair,[Math.sin(angle)*0.143,0.095+Math.cos(angle)*0.024,-Math.cos(angle)*0.137]);
      curl.rotation.z=-angle*0.42;
    }
    for(const side of [-1,1]) {
      oval(head,[0.031,0.049,0.024],skin,[side*0.16,-0.005,0]);
      oval(head,[0.014,0.027,0.009],"#b97e62",[side*0.179,-0.005,-0.015]);
      oval(head,[0.051,0.034,0.02],skin,[side*0.089,-0.044,-0.119]);
      oval(head,[0.039,0.021,0.015],"#a97459",[side*0.063,0.025,-0.13]);
      const eye=new THREE.Group(); eye.position.set(side*0.063,0.026,-0.137); head.add(eye);
      oval(eye,[0.033,0.013,0.009],"#f0e4d5",[0,0,0]);
      oval(eye,[0.013,0.013,0.006],"#594035",[0,-0.001,-0.007]);
      oval(eye,[0.006,0.01,0.003],"#201e1d",[0,-0.001,-0.012]);
      oval(eye,[0.003,0.004,0.002],"#fff8e5",[-0.004,0.004,-0.015]);
      root.userData.motionParts.eyes.push(eye);
      const brow=oval(head,[0.037,0.008,0.007],hair,[side*0.063,0.063,-0.137]); brow.rotation.z=side*0.1;
      softMesh(head,"cylinder",[0.009,0.014,0.075,10],hair,[side*0.143,0.04,0.005]);
    }
    oval(head,[0.023,0.047,0.023],skin,[0,-0.023,-0.147]);
    oval(head,[0.029,0.021,0.027],skin,[0,-0.051,-0.157]);
    for(const side of [-1,1]) oval(head,[0.008,0.004,0.006],"#9d6854",[side*0.019,-0.063,-0.162]);
    oval(head,[0.042,0.008,0.008],"#a56354",[0,-0.106,-0.137]);
    oval(head,[0.035,0.006,0.009],"#cb8e77",[0,-0.115,-0.138]);
    if(variant%2===0||seated) {
      softMesh(head,"cone",[0.35,0.19,40],"#dfc68a",[0,0.259,0]);
      softMesh(head,"torus",[0.345,0.009,6,40],"#a98b4c",[0,0.165,0],[Math.PI/2,0,0]);
      for(let rib=0;rib<12;rib++) {
        const angle=rib*Math.PI/6;
        const ribPart=softMesh(head,"cylinder",[0.0025,0.0025,0.356,5],"#c3a871",[Math.cos(angle)*0.168,0.214,Math.sin(angle)*0.168]);
        ribPart.rotation.set(Math.sin(angle)*1.3,0,-Math.cos(angle)*1.3);
      }
      for(const side of [-1,1]) softMesh(head,"cylinder",[0.005,0.005,0.32,6],"#7e5545",[side*0.14,0.015,0],[0,0,-side*0.36]);
    } else {
      softMesh(head,"cylinder",[0.164,0.168,0.056,24],"#5d343d",[0,0.135,0.01]);
      softMesh(head,"torus",[0.165,0.012,6,32],trim,[0,0.12,0.01],[Math.PI/2,0,0]);
    }
    for(const side of [-1,1]) {
      const shoulder=new THREE.Group(); shoulder.position.set(side*0.25,hipHeight+0.58,0); visual.add(shoulder);
      oval(shoulder,[0.105,0.12,0.11],shirt,[side*0.025,-0.04,0]);
      softMesh(shoulder,"cylinder",[0.085,0.095,0.3,20],shirt,[side*0.07,-0.12,-0.04],[0,0,side*0.32]);
      const elbow=new THREE.Group(); elbow.position.set(side*0.12,-0.27,-0.05); shoulder.add(elbow);
      oval(elbow,[0.071,0.072,0.072],skin,[0,0,0]);
      softMesh(elbow,"cylinder",[0.051,0.07,0.26,20],skin,[0,-0.1,-0.09],[0.8,0,0]);
      softMesh(elbow,"cylinder",[0.073,0.074,0.038,20],trim,[0,-0.025,-0.02],[0.8,0,0]);
      const hand=new THREE.Group(); hand.position.set(0,-0.22,-0.2); hand.rotation.x=2; hand.scale.setScalar(0.85); elbow.add(hand); sculptHand(hand,side,true);
      const hip=new THREE.Group(); hip.position.set(side*0.14,hipHeight,0); visual.add(hip);
      softMesh(hip,"cylinder",[0.11,0.078,0.45,20],"#3e4650",[0,-0.2,seated?-0.14:0],[seated?1:0,0,0]);
      softMesh(hip,"cylinder",[0.078,0.06,0.42,20],"#3e4650",[0,seated?-0.25:-0.63,seated?-0.42:0]);
      const shoe=oval(hip,[0.083,0.052,0.16],"#604734",[0,seated?-0.47:-0.89,seated?-0.48:-0.06]);
      shoe.userData.shoe=true;
      softMesh(shoe,"box",[0.9,0.2,0.18],"#bd9d73",[0,0.6,-0.18],[0,0,side*0.15]);
      root.userData.motionParts["shoulder"+side]=shoulder;
      root.userData.motionParts["elbow"+side]=elbow;
      root.userData.motionParts["hip"+side]=hip;
    }
    root.userData.motionParts.idlePhase=variant*1.7;
    markCharacterDetails(root);
    return root;
  }
  function buildFestivalOpponent() { return person(false); }
  function buildBambooHandler() { return person(true); }
  function buildTopChest() {
    const root=group(), visual=root.userData.motionParts.visual;
    mesh(visual,"box",[1.5,0.65,0.8],palette.wood,[0,0.43,0]);
    for (const side of [-1,1]) { mesh(visual,"box",[1.65,0.1,0.95],"#be8a51",[0,0.78,0]); mesh(visual,"box",[0.12,0.2,0.65],"#623c26",[side*0.58,0.08,0]); }
    for (const divider of [-0.45,0,0.45]) mesh(visual,"box",[0.04,0.09,0.72],"#4c3122",[divider,0.83,0]);
    const lid=new THREE.Group(); lid.position.set(0,0.8,0.4); lid.rotation.x=-1.15; visual.add(lid);
    mesh(lid,"box",[1.6,0.1,0.8],"#a46a3b",[0,0,-0.4]);
    for (const side of [-1,1]) mesh(lid,"box",[0.1,0.13,0.82],"#d5b573",[side*0.5,0,-0.4]);
    root.userData.motionParts.lid=lid; return root;
  }
  function buildWoodenTop() {
    const root=group(), visual=root.userData.motionParts.visual;
    mesh(visual,"cylinder",[0.16,0.025,0.24,12],"#bd7a43",[0,0.15,0]);
    mesh(visual,"sphere",[0.16,12,6],palette.wood,[0,0.25,0]).scale.y=0.5;
    mesh(visual,"cylinder",[0.055,0.055,0.07,8],"#e5b875",[0,0.34,0]);
    mesh(visual,"cone",[0.035,0.09,8],"#7b8182",[0,0.025,0],[Math.PI,0,0]);
    for(let coil=0;coil<3;coil++) mesh(visual,"torus",[0.135,0.012,4,16],"#f3dfac",[0,0.19+coil*0.025,0],[Math.PI/2,0,0]);
    mesh(visual,"box",[0.22,0.015,0.02],"#f3dfac",[0.2,0.2,0]); return root;
  }
  function buildQuanBoard() {
    const root=group(), visual=root.userData.motionParts.visual;
    mesh(visual,"box",[4.8,0.035,2.1],"#b28a59",[0,0.025,0]);
    const cells=[];
    for(let index=0;index<12;index++) {
      const cell=new THREE.Group();
      const row=index<5?0:index>5&&index<11?1:2;
      const column=row===0?index:row===1?10-index:0;
      cell.position.set(row===2?(index===5?2.25:-2.25):(column-2)*0.78,0.06,row===0?0.49:row===1?-0.49:0);
      visual.add(cell);
      if(row===2) chalk(cell,0.48); else {
        mesh(cell,"box",[0.74,0.018,0.025],palette.chalk,[0,0,0.43]);
        mesh(cell,"box",[0.74,0.018,0.025],palette.chalk,[0,0,-0.43]);
        for(const side of [-1,1]) mesh(cell,"box",[0.025,0.018,0.86],palette.chalk,[side*0.37,0,0]);
      }
      const pickTarget=mesh(cell,"box",[row===2?0.85:0.72,0.035,row===2?0.85:0.82],palette.chalk,[0,0.015,0]);
      pickTarget.material=tracker.track(new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
      pickTarget.userData.index=index;
      const highlight=mesh(cell,"torus",[row===2?0.46:0.3,0.018,4,40],palette.yellow,[0,0.04,0],[Math.PI/2,0,0]);
      highlight.visible=false;
      const countCanvas=document.createElement("canvas"); countCanvas.width=128; countCanvas.height=64;
      const countTexture=tracker.track(new THREE.CanvasTexture(countCanvas));
      const countLabel=new THREE.Sprite(tracker.track(new THREE.SpriteMaterial({map:countTexture,depthTest:false})));
      countLabel.scale.set(0.36,0.18,1); countLabel.position.set(0,0.36,0); cell.add(countLabel);
      countLabel.visible=false;
      cell.userData={index,pickTarget,highlight,countCanvas,countTexture,countLabel,stones:new THREE.Group()};
      cell.add(cell.userData.stones); cells.push(cell);
    }
    for(const side of [-1,1]) mesh(visual,"box",[2.2,0.1,0.3],palette.wood,[0,0.05,side*1.4]);
    root.userData.cells=cells; return root;
  }
  function buildConBasket() {
    const root=group(), visual=root.userData.motionParts.visual;
    mesh(visual,"cylinder",[0.6,0.42,0.5,12],"#bc945c",[0,0.3,0]);
    for(let line=0;line<5;line++) mesh(visual,"torus",[0.44+line*0.035,0.025,4,16],"#e0bc77",[0,0.08+line*0.1,0],[Math.PI/2,0,0]);
    mesh(visual,"torus",[0.61,0.06,6,20],"#ead092",[0,0.56,0],[Math.PI/2,0,0]);
    for(const offset of [-0.25,0,0.25]) mesh(visual,"sphere",[0.13,8,6],offset?palette.red:palette.yellow,[offset,0.59,0]);
    return root;
  }
  function buildConBall() {
    const root=group(), visual=root.userData.motionParts.visual;
    mesh(visual,"sphere",[0.13,8,6],palette.red);
    mesh(visual,"torus",[0.13,0.008,3,12],palette.yellow);
    mesh(visual,"torus",[0.13,0.008,3,12],palette.teal,[0,0,0],[0,Math.PI/2,0]);
    mesh(visual,"sphere",[0.035,6,4],"#ead39d",[0,-0.13,0]);
    for(let ribbon=0;ribbon<4;ribbon++) mesh(visual,"box",[0.03,0.38,0.012],[palette.red,palette.yellow,palette.teal,palette.cloth][ribbon],[(ribbon-1.5)*0.045,-0.3,0],[-0.2,0,(ribbon-1.5)*0.18]);
    return root;
  }
  function buildConRing() {
    const root=group(), visual=root.userData.motionParts.visual;
    const pole=new THREE.Group(),crown=new THREE.Group(); visual.add(pole,crown); crown.position.y=5.5;
    bamboo(pole,6.5,0.075,[1.1,3.25,0]);
    bamboo(crown,1.2,0.04,[0.55,0,0],[0,0,Math.PI/2]);
    mesh(crown,"torus",[0.88,0.08,6,40],palette.red);
    mesh(crown,"torus",[0.88,0.085,6,40,Math.PI],palette.yellow);
    for(const height of [-0.6,-0.2,0.2]) mesh(crown,"torus",[0.09,0.018,4,8],"#dfc894",[1.1,height,0],[Math.PI/2,0,0]);
    root.userData.pole=pole; root.userData.crown=crown;
    return root;
  }
  function buildPushArena() {
    const root=group(), visual=root.userData.motionParts.visual; chalk(visual,3);
    for(const side of [-1,1]) {
      mesh(visual,"box",[0.6,0.02,0.06],palette.chalk,[side*1.1,0.04,0]);
    }
    chalk(visual,2.94); chalk(visual,3.06);
    for(let mark=0;mark<12;mark++) {
      const angle=mark*Math.PI/6;
      const line=mesh(visual,"box",[0.13,0.012,0.04],palette.chalk,[Math.cos(angle)*2.85,0.028,Math.sin(angle)*2.85]);
      line.rotation.y=-angle;
    }
    const staff=bamboo(visual,2.6,0.055,[0,0.76,0],[0,0,Math.PI/2]);
    for(const grip of [-0.8,0.8]) mesh(staff,"cylinder",[0.061,0.061,0.3,8],"#e4cc92",[0,grip,0]);
    root.userData.motionParts.staff=staff; return root;
  }
  function buildSapTrack() {
    const root=group(), visual=root.userData.motionParts.visual; const poles=[];
    for(const side of [-1,1]) bamboo(visual,8.8,0.08,[side*1.6,0.12,-4],[Math.PI/2,0,0]);
    for(let pair=0;pair<4;pair++) for(const side of [-1,1]) {
      const pole=bamboo(visual,3.6,0.055,[0,0.23,-pair*2+side*0.6],[0,0,Math.PI/2]);
      pole.userData.pair=pair; pole.userData.side=side; poles.push(pole);
    }
    mesh(visual,"box",[1.4,0.025,1],palette.teal,[0,0.02,0.4]);
    mesh(visual,"box",[1.4,0.03,0.6],palette.yellow,[0,0.03,-8]);
    for(let stripe=0;stripe<12;stripe++) {
      mesh(visual,"box",[1.35,0.008,0.023],"#d5c482",[0,0.038,0.05+stripe*0.06]);
      mesh(visual,"box",[1.35,0.008,0.023],"#be8041",[0,0.049,-8.25+stripe*0.045]);
    }

    root.userData.stepTiles=Array.from({length:20},()=>mesh(visual,"box",[1.1,0.01,0.35],"#a6b789",[0,0.025,0]));
    root.userData.poles=poles; return root;
  }
  const PROCEDURAL_3D_ROLE_BUILDERS = Object.freeze({
    "festival-gate":buildFestivalGate,
    "player-hands":buildPlayerHands,
    "festival-opponent":buildFestivalOpponent,
    "bamboo-handler":buildBambooHandler,
    "top-chest":buildTopChest,
    "wooden-top":buildWoodenTop,
    "quan-board":buildQuanBoard,
    "con-basket":buildConBasket,
    "con-ball":buildConBall,
    "con-ring":buildConRing,
    "push-arena":buildPushArena,
    "sap-track":buildSapTrack
  });
  game.createScene = function () {
    tracker=game.runtime.createResourceTracker();
    const scene=new THREE.Scene(); scene.background=new THREE.Color("#c0e3e8"); scene.fog=new THREE.Fog("#c0e3e8",48,110);
    const camera=new THREE.PerspectiveCamera(70,1,0.08,180);
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false}); renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.setClearColor("#c0e3e8"); document.querySelector("#scene").appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-label","First-person Vietnamese festival village");
    renderer.domElement.tabIndex=0;
    const fill=new THREE.HemisphereLight("#e1f5fb","#a47c4c",1.65); scene.add(fill);
    const sun=new THREE.DirectionalLight("#ffe1a7",2.3); sun.position.set(-18,32,12); sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-36,right:36,top:36,bottom:-36,far:100}); sun.shadow.bias=-0.0004; scene.add(sun);
    const layout=[], labels=[], roles={}, animated=[], birds=[], clouds=[], trees=[];
    const skyGeometry=tracker.track(new THREE.SphereGeometry(155,48,24));
    const skyColors=[],skyPosition=skyGeometry.attributes.position;
    const zenith=new THREE.Color("#69b6dc"),horizon=new THREE.Color("#f5e3bf");
    for(let index=0;index<skyPosition.count;index++) {
      const blend=Math.pow(game.clamp(skyPosition.getY(index)/155,0,1),0.55),color=horizon.clone().lerp(zenith,blend);
      skyColors.push(color.r,color.g,color.b);
    }
    skyGeometry.setAttribute("color",new THREE.Float32BufferAttribute(skyColors,3));
    const skyDome=new THREE.Mesh(skyGeometry,tracker.track(new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,depthWrite:false,fog:false})));
    skyDome.name="warm-horizon-blue-sky"; skyDome.renderOrder=-10; scene.add(skyDome);
    const sky=new THREE.Group(); sky.name="sun-and-drifting-clouds"; scene.add(sky);
    const cloudMaterial=tracker.track(new THREE.MeshStandardMaterial({color:"#fff9ed",roughness:1,fog:false}));
    for(let index=0;index<15;index++) {
      const cloud=new THREE.Group(); cloud.name="drifting-cloud"; sky.add(cloud);
      const angle=index*2.39996,radius=48+index%4*10;
      cloud.position.set(Math.cos(angle)*radius,26+index%5*3.5,Math.sin(angle)*radius);
      cloud.userData={originX:cloud.position.x,phase:index*1.73};
      for(let puff=0;puff<8;puff++) {
        const lobe=oval(cloud,[2.2+puff%3*0.6,0.85+puff%2*0.65,1.5+puff%3*0.3],"#fff9ed",[(puff-3.5)*1.45,Math.sin(puff*1.6)*0.7,Math.cos(puff*2.4)*1.3]);
        lobe.material=cloudMaterial; lobe.castShadow=false; lobe.receiveShadow=false;
      }
      cloud.rotation.y=angle; clouds.push(cloud);
    }
    const glowSize=96,glowPixels=new Uint8Array(glowSize*glowSize*4);
    for(let row=0;row<glowSize;row++) for(let column=0;column<glowSize;column++) {
      const radius=Math.hypot((column+0.5)/glowSize*2-1,(row+0.5)/glowSize*2-1),offset=(row*glowSize+column)*4;
      glowPixels[offset]=255; glowPixels[offset+1]=220; glowPixels[offset+2]=153;
      glowPixels[offset+3]=Math.round(Math.pow(Math.max(0,1-radius),2.5)*190);
    }
    const glowTexture=tracker.track(new THREE.DataTexture(glowPixels,glowSize,glowSize)); glowTexture.needsUpdate=true;
    const glowMaterial=tracker.track(new THREE.SpriteMaterial({map:glowTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
    const solarGlow=new THREE.Sprite(glowMaterial); solarGlow.position.copy(sun.position).normalize().multiplyScalar(78); solarGlow.scale.set(35,35,1); sky.add(solarGlow);
    const solarDisc=mesh(sky,"sphere",[1.65,24,16],"#fff2cb",solarGlow.position.toArray());
    solarDisc.material=tracker.track(new THREE.MeshBasicMaterial({color:"#fff2cb",fog:false})); solarDisc.castShadow=false; solarDisc.receiveShadow=false;
    function buildLandscapeTree(position,variant,seed) {
      const tree=new THREE.Group(); tree.name=["banyan-tree","slender-tree","orchard-tree","tall-branching-tree"][variant]; tree.position.fromArray(position); scene.add(tree);
      const height=[12.5,15,10,14][variant],spread=[1.05,0.48,0.86,0.72][variant];
      const branches=[],leaves=[],up=new THREE.Vector3(0,1,0),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion();
      let randomState=seed+1;
      const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0; return randomState/4294967296;};
      const treeScale=variant===0?2:1,rootCount=variant===0?12:6,limbCount=variant===0?18:10;
      function branch(start,end,radius) { branches.push({start:start.clone().multiplyScalar(treeScale),end:end.clone().multiplyScalar(treeScale),radius:radius*treeScale}); }
      let trunk=new THREE.Vector3();
      for(let section=0;section<5;section++) {
        const tip=new THREE.Vector3(Math.sin(section*0.9+seed)*0.22,height*(section+1)/5,Math.cos(section*1.3+seed)*0.18);
        branch(trunk,tip,(variant===0?0.72:0.38)*(1-section*0.16)); trunk=tip;
      }
      for(let root=0;root<rootCount;root++) {
        const angle=root*Math.PI*2/rootCount;
        branch(new THREE.Vector3(Math.cos(angle)*(variant===0?2:0.85),0.04,Math.sin(angle)*(variant===0?2:0.85)),new THREE.Vector3(0,variant===0?1.1:0.8,0),variant===0?0.32:0.16);
      }
      for(let limb=0;limb<limbCount;limb++) {
        const angle=limb*2.39996+random()*0.5,start=new THREE.Vector3(0,height*(0.39+limb/limbCount*0.48),0);
        const reach=(2.2+random()*2)*spread,tip=new THREE.Vector3(Math.cos(angle)*reach,start.y+1.5+random()*1.5,Math.sin(angle)*reach);
        branch(start,tip,0.15+(1-limb/limbCount)*0.09);
        for(let fork=0;fork<3;fork++) {
          const forkAngle=angle+(fork-1)*0.8,reach=(1.2+random()*1.6)*spread;
          const end=tip.clone().add(new THREE.Vector3(Math.cos(forkAngle)*reach,0.7+random()*1.1,Math.sin(forkAngle)*reach));
          branch(tip,end,0.065);
          for(let twig=0;twig<3;twig++) {
            const twigAngle=forkAngle+(twig-1)*0.85;
            const endTwig=end.clone().add(new THREE.Vector3(Math.cos(twigAngle)*0.8*spread,0.35+random()*0.65,Math.sin(twigAngle)*0.8*spread));
            branch(end,endTwig,0.025);
            for(let cluster=0;cluster<3;cluster++) leaves.push({position:endTwig.clone().add(new THREE.Vector3((random()-0.5)*1.2,(random()-0.5)*0.7,(random()-0.5)*1.2)),scale:new THREE.Vector3(0.55+random()*0.4,variant===1?0.85:0.35+random()*0.35,0.5+random()*0.4),angle:random()*Math.PI,tone:random()});
          }
        }
      }
      const bark=new THREE.InstancedMesh(geometry("tree-branch",()=>new THREE.CylinderGeometry(0.62,1,1,20,3)),material(variant===0?"#776047":"#80654b"),branches.length);
      for(let index=0;index<branches.length;index++) {
        const part=branches[index],direction=part.end.clone().sub(part.start);
        rotation.setFromUnitVectors(up,direction.clone().normalize());
        matrix.compose(part.start.clone().add(part.end).multiplyScalar(0.5),rotation,new THREE.Vector3(part.radius,direction.length(),part.radius)); bark.setMatrixAt(index,matrix);
      }
      bark.castShadow=true; bark.receiveShadow=true; tree.add(bark);
      const foliage=new THREE.InstancedMesh(geometry("tree-leaf-cluster",()=>new THREE.SphereGeometry(1,24,16)),material("#ffffff"),leaves.length);
      const leafColor=new THREE.Color(),baseColor=new THREE.Color(["#587c38","#376d43","#72944a","#608b48"][variant]);
      for(let index=0;index<leaves.length;index++) {
        const leaf=leaves[index]; rotation.setFromAxisAngle(up,leaf.angle); matrix.compose(leaf.position.clone().multiplyScalar(treeScale),rotation,leaf.scale.clone().multiplyScalar(treeScale)); foliage.setMatrixAt(index,matrix);
        leafColor.copy(baseColor).multiplyScalar(0.78+leaf.tone*0.45); foliage.setColorAt(index,leafColor);
      }
      foliage.castShadow=true; foliage.receiveShadow=true; tree.add(foliage); tree.userData.phase=seed; trees.push(tree); return tree;
    }
    const scenery=new THREE.Group(); scenery.name="mountain-landscape"; scene.add(scenery);
    for(let layer=0;layer<3;layer++) {
      const positions=[],colors=[],indices=[],segments=192,rows=20;
      const baseColor=new THREE.Color(["#759562","#7d9e91","#a5b8b1"][layer]);
      for(let row=0;row<=rows;row++) for(let segment=0;segment<=segments;segment++) {
        const angle=segment/segments*Math.PI*2,progress=row/rows,radius=46+layer*21+progress*36+18*Math.pow(Math.max(0,-Math.sin(angle)),12);
        const ridge=0.68+0.19*Math.sin(angle*7+layer)+0.1*Math.sin(angle*13-layer)+0.06*Math.sin(angle*23);
        const height=Math.pow(Math.sin(progress*Math.PI),1.35)*[13,25,36][layer]*ridge;
        const fold=Math.sin(angle*19+progress*4)*Math.sin(angle*9-progress*7)*Math.sin(progress*Math.PI);
        const wrinkle=Math.sin(angle*31+row*1.4)*Math.sin(progress*Math.PI)*0.6;
        positions.push(Math.cos(angle)*radius,height+wrinkle+fold*(layer+1)*0.65-0.3,Math.sin(angle)*radius);
        const tone=baseColor.clone().multiplyScalar(0.88+height*0.006+fold*0.055+Math.sin(angle*11)*0.04); colors.push(tone.r,tone.g,tone.b);
        if(row<rows&&segment<segments) {
          const corner=row*(segments+1)+segment,next=corner+segments+1;
          indices.push(corner,next,corner+1,corner+1,next,next+1);
        }
      }
      const terrain=tracker.track(new THREE.BufferGeometry());
      terrain.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
      terrain.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
      terrain.setIndex(indices); terrain.computeVertexNormals();
      const surface=tracker.track(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));
      const mountain=new THREE.Mesh(terrain,surface); mountain.name="mountain-ridge-"+layer; scenery.add(mountain);
    }
    for(let index=0;index<16;index++) {
      const bird=new THREE.Group(); bird.name="flying-bird"; scenery.add(bird);
      oval(bird,[0.11,0.1,0.34],"#f2eadb",[0,0,0]);
      oval(bird,[0.085,0.085,0.09],"#eee3c9",[0,0.04,-0.31]);
      mesh(bird,"cone",[0.033,0.14,6],"#d3aa56",[0,0.03,-0.43],[-Math.PI/2,0,0]);
      mesh(bird,"cone",[0.12,0.25,5],"#414f4c",[0,0,0.36],[Math.PI/2,0,0]);
      const wings=[];
      for(const side of [-1,1]) {
        const wing=new THREE.Group(); bird.add(wing);
        const feather=oval(wing,[0.55,0.025,0.16],"#eee9dd",[side*0.49,0,0.02]); feather.rotation.y=-side*0.23;
        oval(wing,[0.19,0.018,0.13],"#455852",[side*0.91,0,0.13]); wings.push(wing);
      }
      bird.userData={wings,phase:index*0.71,radius:46+index%4*4,height:13+index%5*1.4}; birds.push(bird);
      bird.traverse(part=>{if(part.isMesh) part.castShadow=false;});
    }
    const meadow=mesh(scenery,"cylinder",[125,125,0.12,128],"#82966a",[0,-0.32,0]); meadow.castShadow=false;
    for(const side of [-1,1]) {
      const fields=new THREE.Group(); fields.position.set(side*18,-0.18,41); scenery.add(fields);
      for(let terrace=0;terrace<7;terrace++) {
        const crop=mesh(fields,"box",[17,0.09,1.35],terrace%2?"#9da55b":"#b1b36a",[0,0,terrace*1.8]); crop.castShadow=false;
        const bank=mesh(fields,"box",[17,0.13,0.2],"#7f8956",[0,0.02,terrace*1.8+0.8]); bank.castShadow=false;
      }
    }
    const entrancePath=mesh(scenery,"box",[5,0.05,20],"#d3ba88",[0,-0.19,42]); entrancePath.castShadow=false;
    function worldBox(role,position,size,color) {
      const root=new THREE.Group(); root.position.fromArray(position); scene.add(root);
      mesh(root,"box",size,color,[0,size[1]/2,0]);
      layout.push({role,root,dimensions:{width:size[0],height:size[1],depth:size[2],bodyCenter:[0,size[1]/2,0]}}); return root;
    }
    function spawn(role,position) { const root=PROCEDURAL_3D_ROLE_BUILDERS[role](); if(position) root.position.fromArray(position); scene.add(root); animated.push(root); return root; }
    function label(text,subtitle,position,id) {
      const element=document.createElement("div"); element.className="world-label"; element.innerHTML='<span>'+text+'</span><small>'+subtitle+'</small>';
      document.querySelector("#world-labels").appendChild(element); labels.push({element,position:new THREE.Vector3(...position),id});
    }
    const bounds=game.config.world.bounds,width=bounds.max[0]-bounds.min[0],depth=bounds.max[2]-bounds.min[2];
    const centerX=(bounds.min[0]+bounds.max[0])/2,centerZ=(bounds.min[2]+bounds.max[2])/2;
    let detailSeed=1729;
    const detailRandom=()=>{detailSeed=(Math.imul(detailSeed,1664525)+1013904223)>>>0;return detailSeed/4294967296;};
    const groundPixels=new Uint8Array(256*256*4);
    for(let index=0;index<256*256;index++) {
      const grain=(detailRandom()-0.5)*28+(index%37===0?-17:0),offset=index*4;
      groundPixels[offset]=game.clamp(199+grain,0,255); groundPixels[offset+1]=game.clamp(173+grain,0,255); groundPixels[offset+2]=game.clamp(126+grain,0,255); groundPixels[offset+3]=255;
    }
    const earthTexture=tracker.track(new THREE.DataTexture(groundPixels,256,256,THREE.RGBAFormat));
    earthTexture.colorSpace=THREE.SRGBColorSpace; earthTexture.wrapS=earthTexture.wrapT=THREE.RepeatWrapping; earthTexture.repeat.set(36,30); earthTexture.magFilter=THREE.LinearFilter; earthTexture.needsUpdate=true;
    const floor=worldBox("world-floor",[centerX,-0.2,centerZ],[width,0.2,depth],"#b79a6a");
    floor.children[0].material=tracker.track(new THREE.MeshStandardMaterial({map:earthTexture,color:"#f5e7cb",roughness:1}));
    const detailMatrix=new THREE.Matrix4(),detailRotation=new THREE.Quaternion(),detailUp=new THREE.Vector3(0,1,0);
    function groundInstances(name,count,geo,color,placement) {
      const instances=new THREE.InstancedMesh(geo,material(color),count); instances.name=name;
      for(let index=0;index<count;index++) {
        const detail=placement(index); detailRotation.setFromAxisAngle(detailUp,detailRandom()*Math.PI*2);
        detailMatrix.compose(new THREE.Vector3(...detail.position),detailRotation,new THREE.Vector3(...detail.scale)); instances.setMatrixAt(index,detailMatrix);
        instances.setColorAt(index,new THREE.Color(color).multiplyScalar(0.8+detailRandom()*0.4));
      }
      instances.receiveShadow=true; scene.add(instances); return instances;
    }
    groundInstances("earth-pebbles-and-grit",950,geometry("ground-pebble",()=>new THREE.IcosahedronGeometry(1,1)),"#baa483",()=>({position:[(detailRandom()-0.5)*(width-2),0.014,(detailRandom()-0.5)*(depth-2)],scale:[0.025+detailRandom()*0.05,0.012+detailRandom()*0.018,0.025+detailRandom()*0.045]}));
    const grassVertices=[];
    for(let blade=0;blade<3;blade++) { const angle=blade*Math.PI/3,dx=Math.cos(angle)*0.04,dz=Math.sin(angle)*0.04; grassVertices.push(-dx,0,-dz,dx,0,dz,dx*2,0.26+blade*0.035,dz*2); }
    const grassGeometry=tracker.track(new THREE.BufferGeometry()); grassGeometry.setAttribute("position",new THREE.Float32BufferAttribute(grassVertices,3)); grassGeometry.computeVertexNormals();
    const grass=groundInstances("meadow-grass-and-path-verges",1100,grassGeometry,"#74854a",index=>{
      const side=index%2?1:-1;
      let x=index<700?(side===1?bounds.max[0]-1-detailRandom()*4:bounds.min[0]+1+detailRandom()*4):-6+(detailRandom()-0.5)*6;
      const z=index<700?(detailRandom()-0.5)*(depth-3):(detailRandom()-0.5)*5;
      if(Math.abs(x)<11&&z>-50&&z<-32) x=13;
      return {position:[x,0.025,z],scale:[0.7+detailRandom(),0.5+detailRandom()*0.9,0.7+detailRandom()]};
    }); grass.material=tracker.track(new THREE.MeshStandardMaterial({color:"#dce6bb",roughness:1,side:THREE.DoubleSide}));
    groundInstances("fallen-banyan-leaves",180,geometry("fallen-leaf",()=>new THREE.SphereGeometry(1,6,4)),"#a39450",()=>{const angle=detailRandom()*Math.PI*2,radius=1.6+detailRandom()*4;return {position:[-6+Math.cos(angle)*radius,0.024,Math.sin(angle)*radius],scale:[0.04+detailRandom()*0.04,0.006,0.08+detailRandom()*0.05]};});
    for(const [position,size] of [[[centerX,0,bounds.min[2]],[width,2,0.5]],[[centerX,0,bounds.max[2]],[width,2,0.5]],[[bounds.min[0],0,centerZ],[0.5,2,depth]],[[bounds.max[0],0,centerZ],[0.5,2,depth]]]) worldBox("world-boundary",position,size,"#8b9963");
    for(const path of game.config.world.paths) {
      const start=new THREE.Vector3(...path.from),end=new THREE.Vector3(...path.to),center=start.clone().add(end).multiplyScalar(0.5);
      const road=mesh(scene,"box",[path.width,0.018,start.distanceTo(end)],"#d9bd88",[center.x,0.012,center.z]); road.rotation.y=Math.atan2(end.x-start.x,end.z-start.z);
    }
    roles.gate=spawn("festival-gate",[0,0,28]);
    for(const side of [-1,1]) { const root=new THREE.Group(); root.position.set(side*3.4,0,28); scene.add(root); layout.push({role:"gate-post",root,dimensions:{width:0.8,height:4.2,depth:0.9,bodyCenter:[0,2.1,0]}}); }
    const banyan=buildLandscapeTree([-6,0,0],0,11);
    layout.push({role:"banyan-trunk",root:banyan,dimensions:{radius:2.2,height:25,bodyCenter:[0,12.5,0]}});
    const swing=new THREE.Group(); swing.name="banyan-scenic-swing"; swing.position.set(-4,0,5); swing.rotation.y=Math.atan2(-4,-23); scene.add(swing); roles.swing=swing;
    const branchStart=new THREE.Vector3(-6,7,0),branchEnd=new THREE.Vector3(-1.5,6.85,0).applyAxisAngle(new THREE.Vector3(0,1,0),swing.rotation.y).add(swing.position);
    const branchDirection=branchEnd.clone().sub(branchStart);
    const swingBranch=mesh(scene,"cylinder",[0.25,0.48,branchDirection.length(),24],"#776047",branchStart.clone().add(branchEnd).multiplyScalar(0.5).toArray());
    swingBranch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),branchDirection.normalize());
    mesh(swing,"cylinder",[0.23,0.3,3.3,24],"#776047",[0,6.85,0],[0,0,Math.PI/2]);
    for(const side of [-1,1]) {
      mesh(swing,"torus",[0.29,0.032,8,32],"#bdac80",[side*0.76,6.85,0],[0,Math.PI/2,0]);
    }
    const pivot=new THREE.Group(); pivot.position.y=6.6; swing.add(pivot); swing.userData.pivot=pivot;
    const seat=new THREE.Group(); seat.position.y=-5.85; pivot.add(seat); swing.userData.seat=seat;
    for(const side of [-1,1]) {
      mesh(pivot,"cylinder",[0.018,0.018,5.85,12],"#cdbb8d",[side*0.76,-2.925,0]);
      for(const offset of [-0.17,0.17]) mesh(seat,"torus",[0.037,0.012,6,20],"#d9cda9",[side*0.76,0.06,offset],[0,0,Math.PI/2]);
      mesh(seat,"box",[0.12,0.12,0.68],"#65452f",[side*0.65,-0.08,0]);
    }
    for(let plank=0;plank<3;plank++) {
      mesh(seat,"box",[1.75,0.11,0.19],plank%2?"#b1804e":"#bd915b",[0,0,(plank-1)*0.2]);
      for(const side of [-1,1]) mesh(seat,"sphere",[0.017,8,6],"#695849",[side*0.65,0.058,(plank-1)*0.2]);
    }
    for(let index=0;index<20;index++) {
      const angle=index*Math.PI/10,radius=35+index%3*2.5;
      const treePosition=[Math.cos(angle)*radius*1.3,0,Math.sin(angle)*radius];
      if(Math.abs(treePosition[0])<18&&treePosition[2]<-29) treePosition[2]=-62;
      buildLandscapeTree(treePosition,1+index%3,index+27);
    }
    for(const location of [[32,0,-23],[-24,0,-24],[32,0,23],[-32,0,23]]) {
      const house=worldBox("village-building",location,[7,3.5,6],palette.limewash); roof(house,8.4,7.5,4);
      mesh(house,"box",[1.1,2.1,0.04],palette.wood,[0,1.05,3.03]);
      mesh(house,"box",[7.1,0.18,6.1],"#9f895f",[0,0.09,0]);
      mesh(house,"box",[1.45,0.16,0.2],"#d9ba7c",[0,2.16,3.09]);
      for(const side of [-1,1]) {
        mesh(house,"box",[0.12,2.2,0.17],"#ac7950",[side*0.62,1.1,3.08]);
        for(let slat=0;slat<5;slat++) mesh(house,"box",[0.04,0.87,0.03],"#c4ab71",[side*2-0.48+slat*0.24,2,3.08]);
      }

      for(const side of [-1,1]) { mesh(house,"box",[1.3,1,0.05],palette.teal,[side*2,2,3.04]); mesh(house,"box",[1.5,0.12,0.2],"#e3c58a",[side*2,1.5,3.08]); }
    }
    const villageHouse=new THREE.Group(); villageHouse.name="walkable-village-house"; villageHouse.position.set(0,0,-41); villageHouse.rotation.y=Math.PI/2; scene.add(villageHouse); roles.villageHouse=villageHouse;
    function houseSolid(name,position,size,color) {
      const root=worldBox("village-building",[position[2]+10,position[1],5-position[0]],[size[2],size[1],size[0]],color); root.name=name; return root;
    }
    houseSolid("house-back-wall",[53,0,-10],[0.28,4.6,18],"#d8bb86");
    for(const side of [-1,1]) {
      houseSolid("house-side-wall",[46,0,-10+side*9],[14,4.6,0.28],"#e6d0a5");
      houseSolid("house-front-wall",[39,0,-10+side*5.5],[0.28,4.6,7],"#e6d0a5");
      houseSolid("house-door-post",[38.9,0,-10+side*2.15],[0.4,4.2,0.4],palette.wood);
      for(const offset of [-5,5]) {
        mesh(villageHouse,"box",[2.2,1.6,0.12],"#624f36",[offset,2.5,side*8.82]);
        for(let slat=0;slat<7;slat++) mesh(villageHouse,"box",[0.07,1.5,0.16],"#b38a51",[offset-0.9+slat*0.3,2.5,side*8.7]);
      }
      const roofPanel=mesh(villageHouse,"box",[8.5,0.22,20],"#a74e35",[side*3.7,5.8,0],[0,0,-side*0.4]); roofPanel.name="village-house-tile-roof";
      const tiles=new THREE.Group(); tiles.userData.lowDetailHidden=true; villageHouse.add(tiles);
      for(let row=0;row<32;row++) mesh(tiles,"cylinder",[0.045,0.045,8.5,8],"#c16c46",[side*3.7,5.95,row*0.62-9.6],[0,0,Math.PI/2-side*0.4]);
      mesh(villageHouse,"box",[0.12,0.22,20.2],"#78432f",[side*7.65,4.25,0]);
    }
    mesh(villageHouse,"cylinder",[0.18,0.18,20.5,12],"#dc9a65",[0,7.4,0],[Math.PI/2,0,0]);
    mesh(villageHouse,"box",[0.35,0.45,4.8],palette.wood,[-7,4.2,0]);
    mesh(villageHouse,"box",[14,0.025,18],"#b97552",[0,0.016,0]);
    const floorDetails=new THREE.Group(); floorDetails.userData.lowDetailHidden=true; villageHouse.add(floorDetails);
    for(let row=0;row<18;row++) mesh(floorDetails,"box",[13.7,0.006,0.018],"#dba77b",[0,0.033,row-8.5]);
    for(let column=0;column<14;column++) mesh(floorDetails,"box",[0.018,0.006,17.7],"#dba77b",[column-6.5,0.033,0]);
    function embroideredPanel(root,width,height,position,colors) {
      mesh(root,"box",[width,height,0.025],colors[0],position);
      const details=new THREE.Group(); details.userData.lowDetailHidden=true; root.add(details);
      for(const side of [-1,1]) mesh(details,"box",[0.022,height,0.012],colors[1],[position[0]+side*(width/2-0.018),position[1],position[2]+0.018]);
      const count=Math.max(2,Math.floor(height/0.12));
      for(let motif=0;motif<count;motif++) {
        const centerY=position[1]-height/2+(motif+0.5)*height/count;
        const diamond=mesh(details,"box",[width*0.38,width*0.38,0.014],colors[2],[position[0],centerY,position[2]+0.025],[0,0,Math.PI/4]);
        mesh(diamond,"sphere",[0.018,8,6],colors[1],[0,0,0.018]);
      }
    }
    function buildCostumeMannequin(index) {
      const model=new THREE.Group(); model.name="costume-mannequin-"+index;
      const dark="#202530",silver="#d2d6ce",gold="#e3bb50",ivory="#dfd8c9";
      const cloth=index===1?"#b81f36":index===5?"#174a99":dark;
      const trim=index===5?["#ddc248","#f2e295","#c74258"]:["#c33667","#f2cc65","#62b5b0"];
      mesh(model,"cylinder",[0.66,0.7,0.12,32],"#655643",[0,0.08,0]);
      mesh(model,"cylinder",[0.035,0.045,1.4,12],"#9e9582",[0,0.82,-0.1]);
      for(const side of [-1,1]) {
        oval(model,[0.14,0.1,0.27],"#3b3736",[side*0.19,0.27,0.06]);
        const leg=mesh(model,"cylinder",[0.16,0.145,1.12,24],cloth,[side*0.19,0.88,0]);
        leg.scale.z=1.08;
        mesh(model,"cylinder",[0.17,0.17,0.06,24],index===4?silver:trim[0],[side*0.19,0.39,0]);
        if(index===3||index===4||index===5) for(const height of [0.43,0.48]) mesh(model,"cylinder",[0.169,0.169,0.018,24],index===4?silver:trim[1],[side*0.19,height,0]);
      }
      const torso=mesh(model,"cylinder",[0.38,0.29,0.86,32],cloth,[0,1.99,0]); torso.scale.z=0.65;
      oval(model,[0.4,0.14,0.25],cloth,[0,2.34,0]);
      mesh(model,"cylinder",[0.095,0.11,0.18,24],ivory,[0,2.51,0]);
      oval(model,[0.15,0.2,0.145],ivory,[0,2.74,0]);
      mesh(model,"cylinder",[0.15,0.14,0.12,24],dark,[0,2.42,0]);
      for(const side of [-1,1]) {
        const sleeve=new THREE.Group(); sleeve.position.set(side*0.43,2.27,0); sleeve.rotation.z=side*0.16; model.add(sleeve);
        const length=index===1?0.35:0.82;
        const arm=mesh(sleeve,"cylinder",[0.155,0.13,length,24],index===1?dark:cloth,[0,-length/2,0]); arm.scale.z=0.95;
        mesh(sleeve,"cylinder",[0.137,0.137,0.065,24],trim[0],[0,-length+0.035,0]);
        mesh(sleeve,"cylinder",[0.14,0.14,0.018,24],trim[1],[0,-length+0.07,0]);
        if(index===1) oval(sleeve,[0.092,0.26,0.09],ivory,[0,-0.59,0]);
        oval(sleeve,[0.09,0.13,0.07],ivory,[0,index===1?-0.86:-0.89,0]);
        if(index===2) for(const height of [-0.23,-0.47]) {
          mesh(sleeve,"cylinder",[0.157,0.157,0.12,24],"#78539c",[0,height,0]);
          embroideredPanel(sleeve,0.17,0.13,[0,height,0.15],trim);
        }
      }
      if(index===1||index===2) {
        const skirt=mesh(model,"cylinder",[0.3,0.66,1.12,48,6],index===1?"#d92885":dark,[0,1.02,0]); skirt.scale.z=0.7;
        for(const [height,radius] of [[0.52,0.64],[0.65,0.6],[0.77,0.56]]) {
          const band=mesh(model,"cylinder",[radius-0.015,radius+0.015,0.075,48],height===0.65?trim[0]:dark,[0,height,0]); band.scale.z=0.71;
          const edge=mesh(model,"cylinder",[radius,radius+0.008,0.018,48],gold,[0,height+0.045,0]); edge.scale.z=0.72;
        }
        if(index===1) {
          embroideredPanel(model,0.52,0.91,[0,1.04,0.39],["#ce2832",gold,"#63a447"]);
          const sash=new THREE.Group(); sash.position.set(0,2.13,0.266); sash.rotation.z=-0.62; model.add(sash);
          embroideredPanel(sash,0.1,0.85,[0,0,0],trim);
          for(let coin=0;coin<7;coin++) mesh(sash,"cylinder",[0.055,0.055,0.014,20],silver,[-0.12,-0.32+coin*0.105,0.03],[Math.PI/2,0,0]);
        } else {
          for(const side of [-1,1]) embroideredPanel(model,0.19,0.73,[side*0.16,2.02,0.257],trim);
          embroideredPanel(model,0.6,0.16,[0,0.98,0.45],trim);
          for(const side of [-1,1]) mesh(model,"box",[0.14,0.73,0.035],"#24a9dc",[side*0.09,1.15,0.43],[0,0,side*0.12]);
          mesh(model,"cylinder",[0.17,0.21,0.32,24],"#245d87",[0,2.93,0]);
          for(let ornament=0;ornament<10;ornament++) {
            const angle=ornament*Math.PI/5;
            oval(model,[0.035,0.035,0.035],ornament%2?gold:trim[0],[Math.sin(angle)*0.2,2.8,Math.cos(angle)*0.2]);
          }
        }
      } else if(index===4) {
        const coat=mesh(model,"cylinder",[0.29,0.47,0.8,32],dark,[0,1.22,0]); coat.scale.z=0.7;
        for(const side of [-1,1]) {
          embroideredPanel(model,0.075,1.46,[side*0.13,1.66,0.28],["#877890",silver,"#d87686"]);
          for(let pom=0;pom<4;pom++) oval(model,[0.105,0.1,0.085],"#c52e43",[side*(0.25-pom*0.045),2.35-pom*0.21,0.34]);
          for(let tassel=0;tassel<3;tassel++) mesh(model,"cone",[0.065,0.42,16],tassel%2?gold:"#d73643",[side*(0.4+tassel*0.055),1.08,0.14]);
        }
        oval(model,[0.16,0.09,0.1],"#bd2c3e",[0,1.6,0.34]);
        for(const height of [2.21,2.09,1.97]) mesh(model,"torus",[0.13,0.018,8,24],silver,[0,height,0.29]);
      } else {
        const coat=mesh(model,"cylinder",[0.3,0.34,0.22,32],cloth,[0,1.55,0]); coat.scale.z=0.67;
        if(index===3) {
          embroideredPanel(model,0.06,0.58,[-0.12,2.03,0.258],["#9f3648",silver,"#e0a151"]);
          for(const height of [1.75,2.31]) mesh(model,"box",[0.2,0.035,0.028],"#bc5e61",[-0.05,height,0.27]);
        } else {
          embroideredPanel(model,0.12,0.94,[0,1.99,0.263],trim);
          for(const side of [-1,1]) embroideredPanel(model,0.23,0.06,[side*0.18,1.5,0.23],trim);
        }
      }
      const belt=mesh(model,"cylinder",[0.31,0.31,0.09,32],index===1?gold:cloth,[0,1.58,0]); belt.scale.z=0.7;
      return model;
    }
    for(let index=1;index<=5;index++) {
      const rack=new THREE.Group(); rack.name="village-outfit-rack-"+index; rack.position.set(-9+index*3,0,-45); scene.add(rack);
      rack.add(buildCostumeMannequin(index));
      layout.push({role:"booth-fixture",root:rack,dimensions:{width:1.55,height:3.2,depth:1.3,bodyCenter:[0,1.6,0]}});
    }
    function instrumentRod(root,start,end,radius,color) {
      const from=new THREE.Vector3(...start),to=new THREE.Vector3(...end),direction=to.clone().sub(from);
      const rod=mesh(root,"cylinder",[radius,radius,direction.length(),12],color,from.clone().add(to).multiplyScalar(0.5).toArray());
      rod.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
      return rod;
    }
    function buildFolkInstrument(kind) {
      const model=new THREE.Group(); model.name="folk-instrument-"+kind;
      const wood="#89502d",lightWood="#d8b16b",string="#ded8c4",dark="#38291f",brass="#bd8c39";
      const fine=new THREE.Group(); fine.userData.lowDetailHidden=true; model.add(fine);
      if(kind==="dan-tranh"||kind==="dan-bau") {
        mesh(model,"box",[2.55,0.18,0.58],wood,[0,0.12,0]);
        mesh(model,"box",[2.48,0.035,0.55],lightWood,[0,0.22,0]);
        for(const side of [-1,1]) mesh(model,"box",[0.09,0.3,0.6],dark,[side*1.18,0.12,0]);
        const count=kind==="dan-tranh"?16:1;
        for(let index=0;index<count;index++) {
          const depth=count===1?0:(index/(count-1)-0.5)*0.45;
          const bridgeX=count===1?0.8:-0.8+index*0.1;
          mesh(model,"cone",[0.052,0.13,3],dark,[bridgeX,0.3,depth],[0,Math.PI/2,0]);
          instrumentRod(fine,[-1.13,0.35,depth],[1.12,0.35,depth],0.004,string);
          mesh(fine,"cylinder",[0.017,0.017,0.07,8],brass,[1.16,0.29,depth]);
        }
        if(kind==="dan-bau") {
          instrumentRod(model,[-1.05,0.2,0],[-1.22,1.02,0],0.022,dark);
          oval(model,[0.13,0.16,0.13],lightWood,[-1.14,0.63,0]);
          instrumentRod(fine,[-1.19,0.85,0],[1.12,0.35,0],0.006,string);
        }
      } else if(kind==="dan-nguyet"||kind==="dan-ty-ba"||kind==="dan-nhi") {
        const moon=kind==="dan-nguyet",fiddle=kind==="dan-nhi";
        if(moon) {
          mesh(model,"cylinder",[0.42,0.42,0.19,32],wood,[0,0.58,0],[Math.PI/2,0,0]);
          mesh(model,"cylinder",[0.395,0.395,0.025,32],lightWood,[0,0.58,0.108],[Math.PI/2,0,0]);
        } else if(fiddle) {
          mesh(model,"cylinder",[0.15,0.15,0.3,12],wood,[0,0.25,0],[Math.PI/2,0,0]);
          mesh(model,"cylinder",[0.14,0.14,0.018,12],"#c6ae82",[0,0.25,0.16],[Math.PI/2,0,0]);
        } else {
          oval(model,[0.35,0.5,0.13],wood,[0,0.6,0]);
          oval(model,[0.32,0.47,0.025],lightWood,[0,0.6,0.125]);
          mesh(model,"cone",[0.24,0.55,24],wood,[0,1.02,0]);
        }
        const neckBase=fiddle?0.35:0.91,neckTop=fiddle?1.9:1.95;
        mesh(model,"box",[fiddle?0.045:0.11,neckTop-neckBase,0.085],wood,[0,(neckTop+neckBase)/2,0]);
        mesh(model,"box",[0.12,0.25,0.09],dark,[0,neckTop+0.08,0],[0,0,-0.12]);
        const count=kind==="dan-ty-ba"?4:2;
        for(let index=0;index<count;index++) {
          const offset=(index-(count-1)/2)*0.025;
          instrumentRod(fine,[offset,0.32,0.16],[offset,neckTop+0.05,0.08],0.004,string);
          instrumentRod(model,[0,neckTop-0.08+index*0.1,0],[(index%2?1:-1)*0.2,neckTop-0.08+index*0.1,0],0.025,wood);
        }
        if(!fiddle) for(let fret=0;fret<9;fret++) mesh(fine,"box",[0.14,0.015,0.02],lightWood,[0,1.02+fret*0.1,0.06]);
        mesh(model,"box",[fiddle?0.14:0.3,0.035,0.04],dark,[0,0.4,0.16]);
        if(fiddle) {
          instrumentRod(model,[-0.55,0.25,0.22],[0.55,1.1,0.22],0.015,wood);
          instrumentRod(fine,[-0.55,0.25,0.24],[0.55,1.1,0.24],0.005,string);
        }
      } else if(kind==="sao-truc"||kind==="khen") {
        const count=kind==="khen"?6:1;
        if(count>1) oval(model,[0.24,0.36,0.15],wood,[0,0.45,0]);
        for(let index=0;index<count;index++) {
          const length=count===1?1.55:0.95+index*0.16,offset=(index-(count-1)/2)*0.105;
          const pipe=bamboo(model,length,0.041,[offset,length/2+0.08,0]);
          for(let hole=0;hole<6;hole++) mesh(fine,"sphere",[0.014,8,6],dark,[offset,0.32+hole*0.15,0.04]);
          mesh(pipe,"cylinder",[0.027,0.027,0.005,12],dark,[0,length/2+0.003,0]);
        }
        if(count>1) instrumentRod(model,[0,0.49,0],[0.57,0.65,0],0.035,lightWood);
      } else if(kind==="trong") {
        const drum=new THREE.Group(); drum.position.y=0.62; drum.rotation.z=0.15; model.add(drum);
        mesh(drum,"cylinder",[0.43,0.43,0.72,24],"#9f3d29");
        for(const side of [-1,1]) {
          mesh(drum,"cylinder",[0.44,0.44,0.035,24],"#e6ce96",[0,side*0.37,0]);
          mesh(drum,"torus",[0.43,0.024,8,32],brass,[0,side*0.32,0],[Math.PI/2,0,0]);
        }
        for(let index=0;index<12;index++) {
          const angle=index*Math.PI/6;
          instrumentRod(fine,[Math.sin(angle)*0.435,0.28,Math.cos(angle)*0.435],[Math.sin(angle+0.2)*0.435,0.95,Math.cos(angle+0.2)*0.435],0.008,lightWood);
        }
        for(const side of [-1,1]) instrumentRod(model,[side*0.24,1.12,-0.26],[-side*0.3,1.12,0.32],0.018,lightWood);
      } else if(kind==="cong") {
        for(const side of [-1,1]) mesh(model,"box",[0.07,1.65,0.1],wood,[side*0.7,0.82,0]);
        mesh(model,"box",[1.55,0.09,0.12],wood,[0,1.64,0]);
        mesh(model,"cylinder",[0.57,0.57,0.055,32],brass,[0,0.87,0],[Math.PI/2,0,0]);
        mesh(model,"torus",[0.54,0.035,8,32],dark,[0,0.87,0.025]);
        oval(model,[0.14,0.14,0.09],brass,[0,0.87,0.06]);
        for(const side of [-1,1]) instrumentRod(model,[side*0.26,1.4,0],[side*0.26,1.61,0],0.012,string);
        instrumentRod(model,[0.73,0.18,0.15],[0.92,0.85,0.15],0.025,wood);
        oval(model,[0.07,0.09,0.07],dark,[0.92,0.85,0.15]);
      }
      return model;
    }
    function instrumentCaption(root,text) {
      const canvas=document.createElement("canvas"); canvas.width=768; canvas.height=96;
      const context=canvas.getContext("2d"); context.fillStyle="#efe0ba"; context.fillRect(0,0,768,96);
      context.fillStyle="#50351f"; context.font="bold 30px sans-serif"; context.textAlign="center"; context.textBaseline="middle"; context.fillText(text,384,48);
      const texture=tracker.track(new THREE.CanvasTexture(canvas)); texture.colorSpace=THREE.SRGBColorSpace;
      const plaque=mesh(root,"box",[2.8,0.35,0.025],"#efe0ba",[0,0.65,0.66]);
      plaque.material=tracker.track(new THREE.MeshBasicMaterial({map:texture}));
    }
    const instrumentDisplays=[
      {position:[-4.3,0,4],angle:Math.PI,kinds:["dan-tranh"],label:"ĐÀN TRANH · 16 DÂY"},
      {position:[-0.7,0,7.5],angle:Math.PI,kinds:["dan-bau"],label:"ĐÀN BẦU · MỘT DÂY"},
      {position:[3.2,0,7.5],angle:Math.PI,kinds:["dan-nguyet","dan-ty-ba"],label:"ĐÀN NGUYỆT · ĐÀN TỲ BÀ"},
      {position:[0,0,-7.5],angle:0,kinds:["dan-nhi","sao-truc","khen"],label:"ĐÀN NHỊ · SÁO TRÚC · KHÈN"},
      {position:[4.1,0,-7.5],angle:0,kinds:["trong","cong"],label:"TRỐNG · CỒNG"}
    ];
    roles.folkInstruments=[];
    for(const display of instrumentDisplays) {
      const stand=new THREE.Group(); stand.name="traditional-instrument-display-"+display.kinds[0];
      stand.position.fromArray(display.position); stand.rotation.y=display.angle; villageHouse.add(stand);
      mesh(stand,"box",[3.2,0.16,1.2],"#805133",[0,0.92,0]);
      for(const side of [-1,1]) mesh(stand,"box",[0.12,0.84,1.02],"#593b29",[side*1.4,0.45,0]);
      mesh(stand,"box",[3,0.025,1.02],"#a32e35",[0,1.015,0]);
      display.kinds.forEach((kind,index)=>{
        const model=buildFolkInstrument(kind);
        model.position.set((index-(display.kinds.length-1)/2)*(display.kinds.length===3?0.9:1.4),1.04,0);
        if(display.kinds.length===3) model.scale.setScalar(0.85);
        stand.add(model); roles.folkInstruments.push(model);
      });
      instrumentCaption(stand,display.label);
      villageHouse.updateWorldMatrix(true,false);
      const collider=new THREE.Group(); collider.position.copy(villageHouse.localToWorld(new THREE.Vector3(...display.position))); collider.rotation.y=villageHouse.rotation.y+display.angle; scene.add(collider);
      layout.push({role:"booth-fixture",root:collider,dimensions:{width:3.2,height:1.05,depth:1.2,bodyCenter:[0,0.525,0]}});
    }
    const instrumentReference=game.assets.find(asset=>asset.runtimeKey==="traditionalInstrumentReference");
    if(instrumentReference) {
      const panel=mesh(villageHouse,"box",[2,1.5,0.06],"#b89863",[-4.3,2.8,8.72],[0,Math.PI,0]);
      panel.name="creator-instrument-reference";
      new THREE.TextureLoader().load(instrumentReference.path,texture=>{
        tracker.track(texture); texture.colorSpace=THREE.SRGBColorSpace;
        panel.material=tracker.track(new THREE.MeshBasicMaterial({map:texture}));
      },undefined,()=>{panel.visible=false;});
    }
    houseSolid("house-tea-table",[43,0,-16],[2,0.75,1.1],"#785035");
    for(const side of [-1,1]) houseSolid("house-tea-bench",[43,0,-16+side*1.2],[2.2,0.4,0.4],"#966d43");
    mesh(villageHouse,"cylinder",[0.4,0.4,0.025,32],"#a6814e",[-3,0.78,-6]);
    mesh(villageHouse,"sphere",[0.15,16,12],"#91a395",[-3,0.94,-6]);
    mesh(villageHouse,"torus",[0.12,0.024,8,24],"#91a395",[-2.82,0.94,-6],[0,Math.PI/2,0]);
    mesh(villageHouse,"cone",[0.06,0.21,12],"#91a395",[-3.17,0.99,-6],[0,0,0.9]);
    for(let cup=0;cup<3;cup++) mesh(villageHouse,"cylinder",[0.055,0.04,0.08,16],"#e7dfbb",[-3.35+cup*0.3,0.84,-5.7]);
    const folkDetails=new THREE.Group(); folkDetails.userData.lowDetailHidden=true; villageHouse.add(folkDetails);
    mesh(folkDetails,"box",[3.5,0.018,2.3],"#c7ad70",[-2,0.04,5]);
    for(let strand=0;strand<25;strand++) mesh(folkDetails,"box",[3.45,0.006,0.025],strand%5===0?"#8a6041":"#ddc48c",[-2,0.055,3.9+strand*0.09]);
    for(let index=0;index<3;index++) {
      const jar=houseSolid("house-water-jar",[41.4+index*1.2,0,-2.4],[0.82,1.1,0.82],"#79573f"); jar.children[0].visible=false;
      mesh(jar,"sphere",[0.46,24,16],index%2?"#697e6f":"#98714d",[0,0.55,0]);
      mesh(jar,"torus",[0.24,0.055,8,32],"#d2b17b",[0,1,0],[Math.PI/2,0,0]);
      mesh(jar,"cylinder",[0.25,0.25,0.04,24],"#473d2f",[0,0.98,0]);
    }
    for(let index=0;index<3;index++) {
      const basket=new THREE.Group(); basket.position.set(7.5-index*1.1,0,-46.5); scene.add(basket);
      mesh(basket,"cylinder",[0.4,0.28,0.5,24],"#b99156",[0,0.25,0]);
      for(let band=0;band<5;band++) mesh(basket,"torus",[0.3+band*0.022,0.018,6,32],"#e1bf7d",[0,0.08+band*0.09,0],[Math.PI/2,0,0]);
      mesh(basket,"cone",[0.55,0.28,32],"#e0c78f",[0,0.63,0]);
      layout.push({role:"booth-fixture",root:basket,dimensions:{width:1.1,height:0.9,depth:1.1,bodyCenter:[0,0.45,0]}});
    }
    for(const offset of [-5,5]) {
      bamboo(villageHouse,1,0.025,[-4,4.2,offset]);
      mesh(villageHouse,"sphere",[0.3,20,12],"#efbd68",[-4,3.55,offset]);
      for(const height of [3.25,3.85]) mesh(villageHouse,"cylinder",[0.2,0.2,0.09,16],"#805133",[-4,height,offset]);
      const glow=new THREE.PointLight("#ffda94",5,12,2); glow.position.set(-3,3.2,offset); villageHouse.add(glow);
    }
    label("Nhà trưng bày","TRANG PHỤC · NẾP QUÊ VIỆT",[0,3.6,-33.6],"village-house");
    roles.chest=spawn("top-chest",game.config.activities[0].equipmentPosition);
    roles.board=spawn("quan-board",[20,0,10]); roles.basket=spawn("con-basket",[-15,0,-7]); roles.ring=spawn("con-ring",[-20,0,-18]);
    roles.push=spawn("push-arena",[20,0,-10]); roles.sap=spawn("sap-track",[0,0,-17]);
    for(const [key,size] of [["chest",[1.5,0.8,0.8]],["basket",[1.2,0.55,1.2]]]) layout.push({role:"booth-fixture",root:roles[key],dimensions:{width:size[0],height:size[1],depth:size[2],bodyCenter:[0,size[1]/2,0]}});
    const topCircle=new THREE.Group(); topCircle.position.set(-20,0,10); scene.add(topCircle); chalk(topCircle,4);
    roles.stiltCourse=new THREE.Group(); roles.stiltCourse.position.fromArray(game.config.stilts.startPosition); scene.add(roles.stiltCourse);
    for(let tile=0;tile<24;tile++) {
      mesh(roles.stiltCourse,"box",[1.6,0.025,0.96],tile%2?"#d1b57d":"#e5c990",[0,0.02,-tile-0.5]);
      for(const side of [-1,1]) if(tile%3===0) bamboo(roles.stiltCourse,1.1,0.035,[side*1.1,0.55,-tile]);
    }
    const finish=new THREE.Group(); roles.stiltCourse.add(finish); finish.position.z=-12;
    for(const side of [-1,1]) bamboo(finish,3.4,0.05,[side*1.1,1.7,0]);
    mesh(finish,"box",[2.4,0.35,0.12],palette.red,[0,3.15,0]); roles.stiltCourse.userData.finish=finish;
    roles.stiltWalker=person(false); scene.add(roles.stiltWalker); roles.stiltWalker.visible=false;
    roles.stiltWalker.userData.motionParts.visual.position.y=0.9; roles.stiltWalker.userData.stilts=[];
    for(const side of [-1,1]) {
      const stilt=new THREE.Group(); stilt.position.set(side*0.14,0.6,0); roles.stiltWalker.add(stilt);
      bamboo(stilt,2.8,0.033,[0,0.8,0]); mesh(stilt,"box",[0.19,0.08,0.28],palette.wood,[0,0.3,-0.04]);
      roles.stiltWalker.userData.stilts.push(stilt);
    }
    const range=new THREE.Group(); scene.add(range); range.position.fromArray(game.config.crossbow.targetPosition); roles.crossbowRange=range;
    for(const side of [-1,1]) bamboo(range,2.8,0.055,[side*0.85,-0.25,-0.12]);
    for(const [radius,color,offset] of [[1.25,"#f2e3bb",0],[1,"#376d78",0.025],[0.75,"#cf5346",0.05],[0.4,"#f0c94e",0.075]]) mesh(range,"cylinder",[radius,radius,0.05,64],color,[0,0,offset],[Math.PI/2,0,0]);
    mesh(range,"sphere",[0.035,12,8],palette.ink||"#25483e",[0,0,0.11]);
    const shootingLine=new THREE.Group(); scene.add(shootingLine); shootingLine.position.fromArray(game.config.crossbow.startPosition);
    mesh(shootingLine,"box",[2.1,0.02,0.14],palette.yellow,[0,0.015,0]);
    roles.crossbowWeapon=new THREE.Group(); camera.add(roles.crossbowWeapon); roles.crossbowWeapon.position.set(0,-0.14,-0.85); roles.crossbowWeapon.visible=false;
    mesh(roles.crossbowWeapon,"box",[0.1,0.13,0.65],palette.wood,[0,0,0]);
    for(const side of [-1,1]) mesh(roles.crossbowWeapon,"box",[0.37,0.05,0.07],palette.wood,[side*0.2,0,-0.22],[0,side*0.2,side*0.12]);
    mesh(roles.crossbowWeapon,"box",[0.74,0.012,0.012],"#f0e4c5",[0,0,-0.1]);
    mesh(roles.crossbowWeapon,"cylinder",[0.009,0.009,0.58,8],"#d7b370",[0,0.08,-0.12],[Math.PI/2,0,0]);
    for(const activity of game.config.activities) {
      label(activity.name,activity.id==="top"?"01  ·  SPIN & SURVIVE":activity.id==="quan"?"02  ·  STONES & STRATEGY":activity.id==="con"?"03  ·  AIM FOR THE SKY":activity.id==="push"?"04  ·  FIND YOUR RHYTHM":activity.id==="sap"?"05  ·  STEP INTO THE BEAT":activity.id==="stilts"?"06  ·  Q / E ĐÚNG NHỊP":"07  ·  NGẮM TÂM BIA",[activity.entryPosition[0],2.1,activity.entryPosition[2]],activity.id);
      const sign=new THREE.Group(); sign.position.fromArray(activity.entryPosition); scene.add(sign);
      mesh(sign,"box",[0.09,1.45,0.09],palette.wood,[0,0.725,0]);
      mesh(sign,"box",[0.95,0.38,0.12],palette.cloth,[0,1.35,0]);
      mesh(sign,"box",[0.82,0.045,0.13],palette.red,[0,1.52,0]);
      for(const side of [-1,1]) mesh(sign,"box",[0.035,0.32,0.025],palette.yellow,[side*0.43,1.35,0.075]);
      mesh(sign,"box",[0.82,0.025,0.025],palette.yellow,[0,1.2,0.075]);

      chalk(sign,0.65);
      layout.push({role:"booth-fixture",root:sign,dimensions:{width:0.95,height:1.55,depth:0.12,bodyCenter:[0,0.775,0]}});
      if(activity.id==="push"||activity.id==="quan") continue;
      const booth=new THREE.Group(); booth.position.set(activity.position[0],0,activity.position[2]+3.5); scene.add(booth);
      for(const side of [-1,1]) bamboo(booth,3,0.06,[side*2,1.5,0]);
      mesh(booth,"box",[4.3,0.15,1.2],activity.id==="con"?palette.teal:palette.red,[0,3,0],[0.08,0,0]);
      for(let stripe=0;stripe<7;stripe++) mesh(booth,"box",[0.3,0.15,1.22],palette.yellow,[-1.8+stripe*0.6,3.02,0],[0.08,0,0]);
    }
    for(let index=0;index<34;index++) {
      const along=(-27+index*1.65)*1.3;
      mesh(scene,"cone",[0.23,0.58,3],[palette.red,palette.yellow,palette.teal][index%3],[along,5.5+Math.sin(index/10)*0.4,3],[0,0,Math.PI]);
      mesh(scene,"box",[1.7,0.018,0.018],"#aa9465",[along,5.8+Math.sin(index/10)*0.4,3]);
    }
    for(let index=0;index<24;index++) {
      const side=index%2?1:-1, depth=-28+Math.floor(index/2)*5;
      if(side===1&&depth>-21&&depth<1) continue;
      const shrub=new THREE.Group(); shrub.position.set(side*37,0,depth); scene.add(shrub);
      mesh(shrub,"cylinder",[0.12,0.2,2,6],palette.wood,[0,1,0]); mesh(shrub,"sphere",[1.5,6,4],"#849b58",[0,2.6,0]);
    }
    label("Lễ Hội Dân Gian","WELCOME TO THE FESTIVAL",[0,3.7,27.6],"gate");
    roles.opponent=spawn("festival-opponent",[-21,0,10]);
    roles.boardOpponent=spawn("festival-opponent",[20,0,8]); roles.boardOpponent.rotation.y=Math.PI;
    roles.pushOpponent=spawn("festival-opponent",[21.1,0,-10]); roles.pushOpponent.rotation.y=Math.PI/2;
    roles.pushPlayer=spawn("festival-opponent",[18.9,0,-10]); roles.pushPlayer.rotation.y=-Math.PI/2;
    roles.handlers=[];
    for(let index=0;index<4;index++) for(const side of [-1,1]) { const handler=spawn("bamboo-handler",[side*2,0,-17-index*2]); handler.rotation.y=side===1?Math.PI/2:-Math.PI/2; roles.handlers.push(handler); }
    roles.hands=spawn("player-hands"); scene.remove(roles.hands); camera.add(roles.hands); scene.add(camera);
    roles.heldTop=spawn("wooden-top"); scene.remove(roles.heldTop); roles.hands.add(roles.heldTop); roles.heldTop.position.set(0.19,-0.35,-0.65);
    roles.heldBall=spawn("con-ball"); scene.remove(roles.heldBall); roles.hands.add(roles.heldBall); roles.heldBall.position.set(0.2,-0.3,-0.65);
    roles.sowingHands=spawn("player-hands",[20,0.7,10]);
    roles.sowingHands.userData.motionParts.visual.scale.setScalar(1.4);
    roles.sowingHands.userData.motionParts.leftWrist.visible=false;
    const sowTarget=new THREE.Vector3(20,0.7,10);
    function sowAt(index,side) {
      const cell=roles.board.userData.cells[index].position;
      sowTarget.set(20+cell.x,0.7,10+cell.z);
      if(!roles.sowingHands.visible) roles.sowingHands.position.copy(sowTarget);
      roles.sowingHands.rotation.y=side===0?0:Math.PI;
    }
    const arcGeometry=tracker.track(new THREE.BufferGeometry()); const arcMaterial=tracker.track(new THREE.LineBasicMaterial({color:"#fff2b2"}));
    const arc=new THREE.Line(arcGeometry,arcMaterial); arc.frustumCulled=false; scene.add(arc);
    function updateBoard(cells) {
      roles.board.userData.cells.forEach((cell,index) => {
        const stones=cell.userData.stones;
        if (stones.userData.count===cells[index]) return;
        stones.children.forEach(stone=>{stone.visible=false;}); stones.userData.count=cells[index];
        stones.userData.pool ||= new Map();
        const context=cell.userData.countCanvas.getContext("2d");
        context.clearRect(0,0,128,64); context.fillStyle="#25483e"; context.fillRect(20,6,88,52);
        context.fillStyle="#fff8e8"; context.font="bold 38px Arial"; context.textAlign="center"; context.textBaseline="middle";
        context.fillText(String(cells[index]),64,33); cell.userData.countTexture.needsUpdate=true;
        const hasMandarin=(index===5||index===11)&&cells[index]>=10;
        const count=cells[index]-(hasMandarin?9:0);
        for(let stone=0;stone<count;stone++) { const mandarin=hasMandarin&&stone===0;
          const angle=stone*2.4,radius=Math.sqrt(stone%24)*0.052;
          const key=(mandarin?"mandarin-":"pebble-")+stone;
          let pebble=stones.userData.pool.get(key);
          if(!pebble) { pebble=mesh(stones,"sphere",[mandarin?0.13:0.045,8,6],mandarin?"#d3aa4c":"#e4dac2"); stones.userData.pool.set(key,pebble); }
          pebble.visible=true;
          pebble.position.set(Math.cos(angle)*radius,(mandarin?0.14:0.06)+Math.floor(stone/24)*0.08,Math.sin(angle)*radius);
        }
      });
    }
    function animate(dt) {
      const manager=game.manager, active=manager.activity, time=manager.time;
      roles.swing.userData.pivot.rotation.x=Math.sin(time*0.85)*(manager.seated?0.065:0.025);
      for(const cloud of clouds) if(cloud.visible) cloud.position.x=cloud.userData.originX+Math.sin(time*0.018+cloud.userData.phase)*8;
      for(const tree of trees) tree.rotation.z=Math.sin(time*0.65+tree.userData.phase)*0.003;
      for(const bird of birds) {
        if(!bird.visible) continue;
        const data=bird.userData,angle=time*0.065+data.phase;
        bird.position.set(Math.cos(angle)*data.radius,data.height+Math.sin(time*0.55+data.phase)*0.8,Math.sin(angle)*data.radius);
        bird.rotation.y=Math.PI-angle;
        data.wings.forEach((wing,index)=>{wing.rotation.z=(index===0?-1:1)*(0.16+Math.sin(time*4.8+data.phase)*0.5);});
      }
      for(const actor of animated) {
        const parts=actor.userData.motionParts;
        if(!parts.head) continue;
        const phase=parts.idlePhase,blink=Math.sin(time*0.8+phase)>0.997;
        parts.eyes.forEach(eye=>eye.scale.y=blink?0.12:1);
        parts.head.rotation.y=Math.sin(time*0.65+phase)*0.09;
        parts.head.rotation.x=Math.sin(time*0.9+phase)*0.025;
        parts.chest.scale.x=1+Math.sin(time*2+phase)*0.012;
        parts.chest.scale.z=1+Math.sin(time*2+phase)*0.018;
      }
      if(active?.id==="sap") roles.sap.userData.stepTiles.forEach((tile,index)=>{
        tile.material=material(index<active.progress?"#e0bb59":"#a6b789");
      });
      roles.heldTop.visible=manager.player.heldItem==="wooden-top"; roles.heldBall.visible=manager.player.heldItem==="con-ball";
      roles.board.userData.cells.forEach((cell,index)=>{
        const playing=manager.state==="quan-turn";
        cell.userData.countLabel.visible=playing;
        const adjacent=playing&&active.selected!==null&&[1,11].includes((index-active.selected+12)%12);
        cell.userData.highlight.visible=playing&&active.turn===0&&!active.queue.length&&(adjacent||active.legal(0).includes(index));
        cell.userData.highlight.material=material(active?.selected===index?"#e6aa28":adjacent?"#f5ce69":"#73bda0");
        cell.userData.highlight.scale.setScalar(active?.selected===index?1.12:1);
      });
      if(manager.state==="quan-turn"&&roles.board.userData.cameraAspect!==camera.aspect) {
        roles.board.userData.cameraAspect=camera.aspect;
        const fit=Math.max(1,1.05/camera.aspect);
        game.view.rig.configure({distance:3.2*fit,height:4.3*fit}); game.view.rig.snap();
      }
      if(manager.activeActivity==="push"&&roles.push.userData.cameraAspect!==camera.aspect) {
        roles.push.userData.cameraAspect=camera.aspect;
        const fit=Math.max(1,0.8/camera.aspect);
        game.view.rig.configure({distance:4.5*fit,height:4.5*Math.sqrt(3)*fit}); game.view.rig.snap();
      }
      if(manager.activeActivity==="stilts"&&roles.stiltCourse.userData.cameraAspect!==camera.aspect) {
        roles.stiltCourse.userData.cameraAspect=camera.aspect;
        const fit=Math.max(1,0.8/camera.aspect); game.view.rig.configure({distance:4.5*fit,height:4.5*Math.sqrt(3)*fit}); game.view.rig.snap();
      }
      if(manager.activeActivity==="crossbow") roles.crossbowWeapon.scale.setScalar(Math.min(0.7,camera.aspect*0.75));
      roles.hands.visible=game.canLook()&&!manager.seated&&manager.state!=="sap-result"&&manager.activeActivity!=="crossbow";
      roles.sowingHands.visible=active?.id==="quan"&&active.queue.length>0;
      roles.sowingHands.position.lerp(sowTarget,1-Math.exp(-12*dt));
      roles.sowingHands.userData.motionParts.visual.position.y=active?.id==="quan"&&active.queue.length?Math.sin(Math.min(1,active.animationClock/game.config.quan.sowIntervalSeconds)*Math.PI)*0.06:0;
      for(const handler of roles.handlers) { const parts=handler.userData.motionParts; const opening=active?.id==="sap"?Math.cos(active.clock/active.period*Math.PI*2):0; parts["shoulder-1"].rotation.x=-0.5+opening*0.15; parts.shoulder1.rotation.x=-0.5-opening*0.15; parts["elbow-1"].rotation.z=opening*0.1; parts.elbow1.rotation.z=-opening*0.1; }
      const hands=roles.hands.userData.motionParts;
      hands.rightWrist.rotation.x=active?.charging?-0.6:Math.sin(time*3)*0.025;
      hands.leftWrist.rotation.z=manager.state==="top-preparation"&&game.input.isDown("KeyR")?Math.sin(time*15)*0.3:0;
      if(active?.id==="sap"&&active.tripTimer>0) { hands.rightWrist.rotation.z=-0.8; hands.leftWrist.rotation.z=0.8; }
      for(const actor of [roles.opponent,roles.boardOpponent,roles.pushOpponent,roles.pushPlayer]) {
        const parts=actor.userData.motionParts;
        parts["shoulder-1"].rotation.x=Math.sin(time*2)*0.08;
        parts.shoulder1.rotation.x=Math.sin(time*2+1)*0.08;
        const pushing=(actor===roles.pushOpponent||actor===roles.pushPlayer)&&manager.activeActivity==="push";
        parts.visual.position.y=pushing?-0.45:0;
        const pushResult=active?.id==="push"&&active.finished;
        const winner=pushResult&&((active.meter===100)===(actor===roles.pushPlayer));
        parts.visual.rotation.z=pushResult&&!winner&&pushing?0.35:0;
        if(winner&&pushing) parts.visual.position.y+=Math.abs(Math.sin(time*6))*0.14;
        parts.visual.rotation.x=pushing?-0.12-Math.sin(time*Math.PI*2*game.config.push.bpm/60)*0.025:0;
        for(const side of [-1,1]) {
          if(pushing) parts["shoulder"+side].rotation.x=winner?-1.8:0.5;
          parts["shoulder"+side].rotation.z=pushing?-side*0.7:0;
          parts["elbow"+side].rotation.z=pushing?side*0.4:0;
          const leg=parts["hip"+side];
          leg.children[0].rotation.x=pushing?1.2:0;
          leg.children[0].position.z=pushing?-0.18:0;
          leg.children[1].position.set(0,pushing?-0.27:-0.63,pushing?-0.37:0);
          leg.children[1].rotation.x=pushing?-0.18:0;
          leg.children[2].position.set(0,pushing?-0.45:-0.89,pushing?-0.42:-0.06);
        }
      }
      for(const actor of animated) if(actor.userData.motionParts.flag1) actor.userData.motionParts.flag1.rotation.y=Math.sin(time)*0.14;
      arc.visible=active?.id==="con"&&manager.state==="con-aim"&&active.charging;
      if(arc.visible) arc.geometry.setFromPoints(active.trajectory.map(point=>new THREE.Vector3(...point)));
      for(const label of labels) {
        const point=label.position.clone().project(camera); const distance=camera.position.distanceTo(label.position);
        const visible=point.z<1&&point.z>-1&&Math.abs(point.x)<1.15&&Math.abs(point.y)<1.15&&distance<45&&!manager.activeActivity;
        label.element.hidden=!visible;
        label.element.classList.toggle("interaction-focus",manager.interactionTarget?.activity===label.id);
        if(visible) { label.element.style.left=(point.x*0.5+0.5)*100+"%"; label.element.style.top=(-point.y*0.5+0.5)*100+"%"; label.element.style.opacity=String(game.clamp((45-distance)/10,0.35,1)); }
      }
    }
    const originalFloorMaterial=floor.children[0].material;
    let lowFloorMaterial;
    const decorativeGround=new Set(["earth-pebbles-and-grit","meadow-grass-and-path-verges","fallen-banyan-leaves"]);
    function setLowDetail(enabled) {
      enabled=Boolean(enabled);
      if(enabled===lowDetail) return;
      lowDetail=enabled;
      if(!enabled) {
        for(const [part,visible] of hiddenDetails) part.visible=visible;
        hiddenDetails.clear();
      }
      scene.traverse(part=>{
        applyMeshDetail(part);
        const hide=part.userData.lowDetailHidden||decorativeGround.has(part.name)||part===skyDome
          ||trees.includes(part)||part===swingBranch||part===scenery||birds.includes(part)
          ||(clouds.includes(part)&&clouds.indexOf(part)%3!==0);
        if(enabled&&hide) { hiddenDetails.set(part,part.visible); part.visible=false; }
        if(part.isInstancedMesh&&part.parent&&trees.includes(part.parent)&&originalGeometries.get(part).type==="SphereGeometry") {
          part.userData.fullDetailCount??=part.count;
          part.count=enabled?Math.max(1,Math.ceil(part.userData.fullDetailCount*0.6)):part.userData.fullDetailCount;
          part.computeBoundingSphere();
        }
      });
      if(enabled&&!lowFloorMaterial) lowFloorMaterial=tracker.track(new THREE.MeshStandardMaterial({color:"#c7ad7e",roughness:1}));
      floor.children[0].material=enabled?lowFloorMaterial:originalFloorMaterial;
      renderer.shadowMap.enabled=!enabled;
      renderer.shadowMap.needsUpdate=true;
    }
    return {scene,camera,renderer,layout,roles,spawn,mesh,material,tracker,animate,updateBoard,sowAt,arc,lights:[fill,sun],setLowDetail,get lowDetail() { return lowDetail; },ready:true};
  };
})(window);
