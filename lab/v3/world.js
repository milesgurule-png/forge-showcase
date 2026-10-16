// Forge Labs Science Lab v3: the facility.
// A central atrium (vault, director's glass office, coffee lounge) ringed by corridors
// and eight themed rooms. Exposes work spots, the route map for walking, and animated props.

export const ROOM_LIST = [
  { id:'atrium',       label:'Atrium',           c:[0,0] },
  { id:'director',     label:"Director's Office", c:[-5.8,-3.6] },
  { id:'historian',    label:'History Library',  c:[-20,-14] },
  { id:'venture',      label:'Venture War Room', c:[0,-14] },
  { id:'tech-scout',   label:'Radar Room',       c:[20,-14] },
  { id:'psychologist', label:'Mind Lab',         c:[-20,0] },
  { id:'physicist',    label:'Observatory',      c:[20,0] },
  { id:'model-lab',    label:'Fabrication Shop', c:[-20,14] },
  { id:'quant',        label:'Quant Room',       c:[0,14] },
  { id:'ai-lab',       label:'Server Room',      c:[20,14] },
];

// room id -> bounds [x0,x1,z0,z1], door {side, at}, theme
const ROOMS = {
  'historian':    { b:[-29,-11,-20,-8], door:{side:'s', at:-20}, floor:'#6b4a2e', wall:'#efe3cf', light:'#ffcf8a', accent:'#e07a5f' },
  'venture':      { b:[-9,9,-20,-8],    door:{side:'s', at:0},   floor:'#2b3a36', wall:'#e3efe9', light:'#b8ffe6', accent:'#20c997' },
  'tech-scout':   { b:[11,29,-20,-8],   door:{side:'s', at:20},  floor:'#1d2a33', wall:'#d9e9ee', light:'#9ff3ef', accent:'#3dd6d0' },
  'psychologist': { b:[-29,-11,-6,6],   door:{side:'e', at:0},   floor:'#3a2a35', wall:'#f1e2ea', light:'#ffc2dc', accent:'#ff7eb6' },
  'physicist':    { b:[11,29,-6,6],     door:{side:'w', at:0},   floor:'#0b1020', wall:'#1b2238', light:'#7fb2ff', accent:'#74c0fc', dark:true },
  'model-lab':    { b:[-29,-11,8,20],   door:{side:'n', at:-20}, floor:'#2f2d3a', wall:'#e6e3f2', light:'#d8ccff', accent:'#9b7bff' },
  'quant':        { b:[-9,9,8,20],      door:{side:'n', at:0},   floor:'#2c3328', wall:'#ebe6d8', light:'#ffd9a8', accent:'#ffa94d' },
  'ai-lab':       { b:[11,29,8,20],     door:{side:'n', at:20},  floor:'#151b22', wall:'#cfd8e2', light:'#a8ffc0', accent:'#5ad16b' },
};
const ATRIUM = [-9,9,-6,6];
const OFFICE = [-8.6,-3,-5.6,-1.6];
const DOOR_W = 2.4, WALL_H = 2.8, WALL_T = 0.16;

export function buildWorld(k) {
  const { THREE, scene, add, mat, box, cyl, table, chair, screen, plant, canvasBoard, handwriting, CSS2DObject, sun } = k;
  const V = (x,z)=>new THREE.Vector3(x,0,z);
  const anim = [];            // per-frame animators
  const tick = (fn)=>anim.push(fn);

  // ---------- floors
  const floorPlane = (x0,x1,z0,z1,color,rough=.75)=>{ const m=add(new THREE.PlaneGeometry(x1-x0,z1-z0), new THREE.MeshStandardMaterial({color, roughness:rough}), (x0+x1)/2, .002, (z0+z1)/2); m.rotation.x=-Math.PI/2; m.castShadow=false; return m; };
  floorPlane(-30,30,-21,21,'#3a404c',.9);                       // corridors / base slab
  const tileTex=(()=>{ const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'); g.fillStyle='#d5d8de'; g.fillRect(0,0,256,256);
    g.strokeStyle='#bfc4cc'; g.lineWidth=3; for(let i=0;i<=256;i+=64){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,256); g.stroke(); g.beginPath(); g.moveTo(0,i); g.lineTo(256,i); g.stroke(); }
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(9,6); t.colorSpace=THREE.SRGBColorSpace; return t; })();
  { const m=add(new THREE.PlaneGeometry(18,12), new THREE.MeshStandardMaterial({map:tileTex, roughness:.3, metalness:.05}), 0,.004,0); m.rotation.x=-Math.PI/2; m.castShadow=false; }
  for (const r of Object.values(ROOMS)) { const [x0,x1,z0,z1]=r.b; floorPlane(x0,x1,z0,z1,r.floor, r.dark?.95:.7).position.y=.004; }
  // corridor runner stripes
  for (const z of [-7,7]) floorPlane(-29,29,z-.35,z+.35,'#4b5262').position.y=.006;
  for (const x of [-10,10]) floorPlane(x-.35,x+.35,-20,20,'#4b5262').position.y=.006;

  // ---------- walls
  const wallMats = {};
  const wallMat = (c, glass)=> wallMats[c+glass] ||= glass ? new THREE.MeshPhysicalMaterial({color:'#cfe8ff', transparent:true, opacity:.22, roughness:.05, metalness:0, transmission:.6, depthWrite:false})
                                                          : new THREE.MeshStandardMaterial({color:c, roughness:.9});
  function wall(x1,z1,x2,z2,color,glass=false,h=WALL_H){
    const len=Math.hypot(x2-x1,z2-z1); if(len<.05) return;
    const m=new THREE.Mesh(new THREE.BoxGeometry(len,h,WALL_T), wallMat(color,glass));
    m.position.set((x1+x2)/2,h/2,(z1+z2)/2); m.rotation.y=-Math.atan2(z2-z1,x2-x1); m.castShadow=!glass; m.receiveShadow=true; scene.add(m);
    if(!glass){ const cap=new THREE.Mesh(new THREE.BoxGeometry(len,.06,WALL_T+.04), new THREE.MeshStandardMaterial({color:'#8d96a8'})); cap.position.set(m.position.x,h+.03,m.position.z); cap.rotation.y=m.rotation.y; scene.add(cap); }
  }
  // rectangle with one doorway; side: n (z0), s (z1), w (x0), e (x1)
  function room(b, door, color, glass=false, h=WALL_H){
    const [x0,x1,z0,z1]=b, d=DOOR_W/2;
    const seg=(side,a1,a2,fixed,horiz)=>{ if(door && door.side===side){ if(horiz){ wall(a1,fixed,door.at-d,fixed,color,glass,h); wall(door.at+d,fixed,a2,fixed,color,glass,h); } else { wall(fixed,a1,fixed,door.at-d,color,glass,h); wall(fixed,door.at+d,fixed,a2,color,glass,h); } }
      else horiz ? wall(a1,fixed,a2,fixed,color,glass,h) : wall(fixed,a1,fixed,a2,color,glass,h); };
    seg('n',x0,x1,z0,true); seg('s',x0,x1,z1,true); seg('w',z0,z1,x0,false); seg('e',z0,z1,x1,false);
  }
  for (const r of Object.values(ROOMS)) room(r.b, r.door, r.wall);
  // atrium: four doorways (one per side) -> build as 8 segments
  { const [x0,x1,z0,z1]=ATRIUM, d=DOOR_W/2, c='#e9edf3';
    wall(x0,z0,-d,z0,c); wall(d,z0,x1,z0,c); wall(x0,z1,-d,z1,c); wall(d,z1,x1,z1,c);
    wall(x0,z0,x0,-d,c); wall(x0,d,x0,z1,c); wall(x1,z0,x1,-d,c); wall(x1,d,x1,z1,c); }
  // building shell + corridor end caps
  { const c='#59606f'; wall(-29.2,-20.2,29.2,-20.2,c); wall(-29.2,20.2,29.2,20.2,c); wall(-29.2,-20.2,-29.2,20.2,c); wall(29.2,-20.2,29.2,20.2,c); }
  // director's glass office (inside the atrium, back-left)
  room(OFFICE, {side:'s', at:-5.8}, '#cfe8ff', true, 2.6);

  // ---------- signs
  function sign(text, color, x, z){ const el=document.createElement('div'); el.className='label'; el.style.cssText=`font-size:12px;padding:2px 8px;border-radius:6px;background:${color}33;border:1px solid ${color};`; el.textContent=text; const o=new CSS2DObject(el); o.position.set(x,3.2,z); scene.add(o); }
  const doorPoint=(r)=>{ const [x0,x1,z0,z1]=r.b, a=r.door.at; return r.door.side==='n'?[a,z0]:r.door.side==='s'?[a,z1]:r.door.side==='w'?[x0,a]:[x1,a]; };
  for (const def of ROOM_LIST) { const r=ROOMS[def.id]; if(!r) continue; const [x,z]=doorPoint(r); sign(def.label, r.accent, x, z); }
  sign("Director's Office", '#f5c542', -5.8, -1.6); sign('Atrium · Vault', '#8b5cf6', 0, 6);

  // ---------- lights (one shadow sun from the main file + soft colored room lights)
  if (sun) { Object.assign(sun.shadow.camera, { left:-31, right:31, top:23, bottom:-23, far:80 }); sun.position.set(-12,34,16); sun.shadow.camera.updateProjectionMatrix(); }
  for (const r of Object.values(ROOMS)) { const [x0,x1,z0,z1]=r.b; const pl=new THREE.PointLight(r.light, r.dark?6:11, 15, 1.6); pl.position.set((x0+x1)/2,2.6,(z0+z1)/2); scene.add(pl); }
  { const pl=new THREE.PointLight('#fff1dd', 12, 16, 1.6); pl.position.set(0,2.7,0); scene.add(pl); }

  // ---------- shared helpers
  const local = (rid)=>{ const [x0,x1,z0,z1]=ROOMS[rid].b; const cx=(x0+x1)/2, cz=(z0+z1)/2; return { cx, cz, p:(x,z)=>V(cx+x,cz+z), x:(x)=>cx+x, z:(z)=>cz+z }; };
  const spot = (p, face, pose, act)=>({ p, face, pose, act });
  const SPOTS = {};
  function instanced(geo, material, count, place){ const m=new THREE.InstancedMesh(geo, material, count); const o=new THREE.Object3D(), c=new THREE.Color();
    for(let i=0;i<count;i++){ place(i,o,c); o.updateMatrix(); m.setMatrixAt(i,o.matrix); m.setColorAt(i,c); } m.castShadow=m.receiveShadow=true; scene.add(m); return m; }

  // ================= ATRIUM: vault, director office, meeting table, coffee lounge
  cyl(1.2,1.3,.75,'#262c3f',0,.375,0,{metalness:.3,roughness:.4}); cyl(1.25,1.25,.03,'#7c3aed',0,.76,0,{emissive:'#6d28d9',emissiveIntensity:.6});
  const crystal=add(new THREE.OctahedronGeometry(.5), mat('#8b5cf6',{emissive:'#6d28d9',emissiveIntensity:.7,metalness:.2,roughness:.15}), 0,1.6,0);
  const gh=add(new THREE.BoxGeometry(.28,.28,.28), mat('#e6ebf5',{emissive:'#555',emissiveIntensity:.3}));
  tick((t,dt)=>{ crystal.rotation.y+=dt*.5; crystal.position.y=1.6+Math.sin(t*1.2)*.06; gh.position.set(Math.cos(t*.6),1.85+Math.sin(t*1.2)*.08,Math.sin(t*.6)); gh.rotation.y+=dt*.8; });
  // director office furniture
  table(-5.8,-4.3,2.2,1.0,'#6b5236'); chair(-5.8,-3.3,Math.PI);
  const dirScreen=screen(.9,.52,-5.8,1.24,-4.6,0,'#f5c542');
  const missionBoard=canvasBoard(3.2,1.8,-8.5,1.55,-3.6,Math.PI/2);
  // meeting table
  table(5,-3.6,3,1.3,'#4a4f5e'); for(const [x,z,f] of [[3.9,-2.6,Math.PI],[5,-2.6,Math.PI],[6.1,-2.6,Math.PI],[3.9,-4.6,0],[6.1,-4.6,0]]) chair(x,z,f);
  // coffee lounge (front-right)
  box(3.4,.9,.7,'#6d5643',5.5,.45,5.45,{roughness:.6}); box(3.4,.05,.72,'#d9d4cc',5.5,.925,5.45);
  box(.45,.6,.4,'#2a2a2a',4.6,1.25,5.5,{metalness:.5,roughness:.3}); cyl(.05,.045,.1,'#fff',6.2,1.0,5.4); cyl(.05,.045,.1,'#e07a5f',6.5,1.0,5.5);
  box(2.4,.45,.9,'#4a5a7a',-5,.23,4.9); box(2.4,.5,.25,'#4a5a7a',-5,.65,5.3); box(1.1,.04,.6,'#c9a77c',-5,.42,3.7); // sofa + coffee table
  // wall clock (real time) on the atrium back wall
  const clockCv=document.createElement('canvas'); clockCv.width=clockCv.height=256; const clockTex=new THREE.CanvasTexture(clockCv); clockTex.colorSpace=THREE.SRGBColorSpace;
  { const m=add(new THREE.CircleGeometry(.45,40), new THREE.MeshStandardMaterial({map:clockTex}), 2.5,2.2,-5.9); m.castShadow=false; }
  const drawClock=()=>{ const g=clockCv.getContext('2d'), d=new Date(); g.fillStyle='#fff'; g.beginPath(); g.arc(128,128,124,0,7); g.fill(); g.lineWidth=10; g.strokeStyle='#2b3140'; g.stroke();
    for(let i=0;i<12;i++){ const a=i/12*Math.PI*2; g.lineWidth=i%3?3:7; g.beginPath(); g.moveTo(128+Math.sin(a)*100,128-Math.cos(a)*100); g.lineTo(128+Math.sin(a)*114,128-Math.cos(a)*114); g.stroke(); }
    const hand=(a,l,w,c)=>{ g.strokeStyle=c; g.lineWidth=w; g.lineCap='round'; g.beginPath(); g.moveTo(128,128); g.lineTo(128+Math.sin(a)*l,128-Math.cos(a)*l); g.stroke(); };
    const s=d.getSeconds(), mi=d.getMinutes()+s/60, h=d.getHours()%12+mi/60; hand(h/12*Math.PI*2,60,9,'#2b3140'); hand(mi/60*Math.PI*2,90,6,'#2b3140'); hand(s/60*Math.PI*2,100,2,'#e05d5d'); clockTex.needsUpdate=true; };
  drawClock(); setInterval(drawClock,1000);
  for (const [x,z] of [[-8.3,5.4],[8.3,-5.4],[8.3,5.4],[-2.4,-5.4]]) plant(x,z,1);
  SPOTS['director'] = [ spot(V(-5.8,-3.3),Math.PI,'sit','Planning the next cycle'), spot(V(-7.6,-3.6),-Math.PI/2,'board','Updating the Mission Board'), spot(V(5,-2.6),Math.PI,'sit','Running the cycle review') ];
  const COFFEE = [ V(3.4,3.6), V(5.0,3.4), V(6.6,3.7), V(3.9,2.0), V(5.6,1.9), V(7.2,2.3),   // by the coffee bar
                   V(-6.2,3.0), V(-4.8,2.8), V(-3.4,3.2), V(-6.6,1.6), V(-5.2,1.4), V(-3.6,1.7) ]; // by the sofa
  const MACHINE = V(4.6,5.3);

  // ================= HISTORY LIBRARY
  { const L=local('historian');
    const bookColors=['#8e3b2f','#2f5d8e','#3f7a3a','#b8902f','#6b3f8e','#7a2e2e','#2e6b6b','#d8d0bc'].map(c=>new THREE.Color(c));
    const shelf=(cx,cz,w,ry)=>{ const g=new THREE.Group(); g.position.set(cx,0,cz); g.rotation.y=ry; scene.add(g);
      box(w,2.6,.5,'#5a3a22',0,1.3,0,{roughness:.8},g); for(let r=0;r<5;r++) box(w,.04,.5,'#4a2f1b',0,.12+r*.52,0,{},g); return {g,w}; };
    const shelves=[ shelf(L.x(-4.85),L.z(-5.6),7.3,0), shelf(L.x(4.85),L.z(-5.6),7.3,0), shelf(L.x(-8.6),L.z(-.5),8,Math.PI/2) ];
    let n=0; const per=[]; for(const s of shelves){ per.push(Math.floor(s.w/0.09)*5); n+=per[per.length-1]; }
    let si=0, k2=0;
    instanced(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({roughness:.85}), n, (i,o,c)=>{
      while(k2>=per[si]){ k2-=per[si]; si++; } const s=shelves[si], cols=Math.floor(s.w/0.09), row=Math.floor(k2/cols), col=k2%cols; k2++;
      const h=.32+((i*37)%17)/100, lx=-s.w/2+.06+col*.09, ly=.15+row*.52+h/2, lz=.08;
      const p=new THREE.Vector3(lx,ly,lz).applyAxisAngle(new THREE.Vector3(0,1,0),s.g.rotation.y).add(s.g.position);
      o.position.copy(p); o.rotation.set(0,s.g.rotation.y,((i*13)%7===0)?.08:0); o.scale.set(.075,h,.32); c.copy(bookColors[(i*7)%bookColors.length]); });
    // rolling ladder
    { const g=new THREE.Group(); g.position.set(L.x(-6.5),0,L.z(-5.1)); g.rotation.x=-.18; scene.add(g); for(const x of [-.25,.25]) box(.05,2.7,.05,'#3b2614',x,1.35,0,{},g); for(let r=0;r<8;r++) box(.5,.04,.05,'#3b2614',0,.25+r*.32,0,{},g); }
    table(L.x(4),L.z(1),2.0,1.0,'#5a3a22'); chair(L.x(4),L.z(2.05),Math.PI);
    box(.46,.03,.34,'#e9dfc7',L.x(3.5),.885,L.z(1.15)); const lamp=cyl(.12,.05,.12,'#2f5d3a',L.x(4.7),1.12,L.z(.75));
    { const pl=new THREE.PointLight('#ffcc77',3,4,2); pl.position.set(L.x(4.7),1.4,L.z(.9)); scene.add(pl); }
    cyl(.05,.12,.9,'#8a6a3a',L.x(-4),.45,L.z(2)); const globe=add(new THREE.SphereGeometry(.38,32,20), mat('#2f6fb5',{roughness:.5}), L.x(-4),1.25,L.z(2));
    tick((t,dt)=>{ globe.rotation.y+=dt*.25; });
    // old maps on the east wall
    for (const [z,c] of [[-2.5,'#d8c49a'],[1.2,'#cdb58a']]) { const m=add(new THREE.PlaneGeometry(2.4,1.5), mat(c,{roughness:1}), L.x(8.84),1.7,L.z(z)); m.rotation.y=-Math.PI/2; m.castShadow=false;
      const lines=add(new THREE.PlaneGeometry(1.9,1.0), new THREE.MeshBasicMaterial({color:'#7a5a33',wireframe:true}), L.x(8.82),1.7,L.z(z)); lines.rotation.y=-Math.PI/2; }
    // banners
    for (const [x,c] of [[-6.5,'#7a2e2e'],[6.5,'#2f5d8e']]) { const m=add(new THREE.PlaneGeometry(.9,1.6), mat(c,{side:THREE.DoubleSide}), L.x(x),1.9,L.z(5.84)); m.rotation.y=Math.PI; }
    SPOTS['historian'] = [ spot(L.p(-3.5,-4.75),Math.PI,'shelf','Pulling sources from the archive'), spot(L.p(4,2.05),Math.PI,'sit','Writing a leader profile'), spot(L.p(7.9,-.6),Math.PI/2,'board','Tracing a trade route on the map') ];
  }

  // ================= VENTURE WAR ROOM
  let pitchBoard, recipeBoard;
  { const L=local('venture');
    pitchBoard=canvasBoard(5,2,L.x(0),1.6,L.z(-5.86),0);
    const stickies=['#ffe066','#ff8787','#74c0fc','#8ce99a','#ffc078'];
    instanced(new THREE.PlaneGeometry(.28,.28), new THREE.MeshStandardMaterial({side:THREE.DoubleSide, roughness:1}), 36, (i,o,c)=>{ o.position.set(L.x(-2.3+(i%9)*.58+((i*7)%3)*.04),.85+Math.floor(i/9)*.4,L.z(-5.82)); o.rotation.set(0,0,((i*11)%7-3)*.03); o.scale.set(1,1,1); c.set(stickies[i%stickies.length]); }).position.y=0;
    recipeBoard=canvasBoard(4,1.8,L.x(8.86),1.6,L.z(0),-Math.PI/2);
    table(L.x(-4),L.z(1),2.2,1.0,'#2b4b44'); chair(L.x(-4),L.z(1.95),Math.PI); screen(.9,.52,L.x(-4),1.24,L.z(.7),0,'#20c997');
    box(1.4,1.1,.8,'#2b4b44',L.x(3),.55,L.z(2.5)); screen(.8,.46,L.x(3),1.45,L.z(2.3),Math.PI,'#20c997'); // standing desk
    SPOTS['venture'] = [ spot(L.p(0,-4.85),Math.PI,'board','Sketching an idea recipe on the pitch wall'), spot(L.p(-4,1.95),Math.PI,'sit','Sizing a market'), spot(L.p(7.9,0),Math.PI/2,'board','Running the Recipe → Pain → MVP → $1M ARR check') ];
  }

  // ================= RADAR ROOM (tech scout)
  let radarBoard; const tsScreens=[];
  { const L=local('tech-scout');
    for (let r=0;r<2;r++) for (let c=0;c<4;c++) tsScreens.push(screen(1.5,.85,L.x(-2.4+c*1.6),1.25+r*.95,L.z(-5.75),0, c%2?'#2a9fd6':'#3dd6d0'));
    table(L.x(0),L.z(-3.6),4,1.1,'#4b5466'); chair(L.x(0),L.z(-2.6),Math.PI);
    cyl(.9,1.0,.1,'#163a40',L.x(4.5),.05,L.z(1.6),{emissive:'#3dd6d0',emissiveIntensity:.4});
    const ringM=new THREE.MeshBasicMaterial({color:'#3dd6d0',transparent:true,opacity:.5});
    for (const r of [.35,.6,.85]) { const ring=add(new THREE.TorusGeometry(r,.01,6,48), ringM, L.x(4.5),.9,L.z(1.6)); ring.rotation.x=Math.PI/2; ring.castShadow=false; }
    const sweep=add(new THREE.CircleGeometry(.85,32,0,.6), new THREE.MeshBasicMaterial({color:'#3dd6d0',transparent:true,opacity:.35,side:THREE.DoubleSide}), L.x(4.5),.91,L.z(1.6)); sweep.rotation.x=-Math.PI/2; sweep.castShadow=false;
    tick((t,dt)=>{ sweep.rotation.z-=dt*1.2; tsScreens.forEach((m,i)=>m.material.emissiveIntensity=.6+Math.sin(t*1.3+i)*.15); });
    radarBoard=canvasBoard(4,2.1,L.x(8.86),1.6,L.z(-.5),-Math.PI/2);
    SPOTS['tech-scout'] = [ spot(L.p(0,-2.6),Math.PI,'sit','Scanning papers & repos'), spot(L.p(7.9,-.5),Math.PI/2,'board','Mapping ideas on the radar'), spot(L.p(4.5,2.85),Math.PI,'holo','Reading the radar hologram') ];
  }

  // ================= MIND LAB (psychologist)
  let brainBoard;
  { const L=local('psychologist');
    cyl(.35,.45,.9,'#3a2a35',L.x(-3),.45,L.z(-2));
    const brainM=new THREE.MeshBasicMaterial({color:'#ff7eb6',wireframe:true,transparent:true,opacity:.8});
    const brain=new THREE.Group(); brain.position.set(L.x(-3),1.45,L.z(-2)); scene.add(brain);
    for (const s of [-1,1]) { const h=new THREE.Mesh(new THREE.SphereGeometry(.34,16,12), brainM); h.scale.set(.8,.75,1.1); h.position.x=s*.17; brain.add(h); }
    tick((t,dt)=>{ brain.rotation.y+=dt*.4; brainM.opacity=.55+Math.sin(t*2.5)*.25; });
    box(3,.45,.9,'#7a4a64',L.x(1.5),.23,L.z(-5)); box(3,.55,.25,'#7a4a64',L.x(1.5),.7,L.z(-5.4)); box(.9,.45,.9,'#7a4a64',L.x(4.4),.23,L.z(-3.6)); // couch + armchair
    brainBoard=canvasBoard(3.4,2,L.x(-8.86),1.6,L.z(1.5),Math.PI/2);
    table(L.x(2),L.z(3),1.8,.95,'#5a3a4a'); chair(L.x(2),L.z(3.95),Math.PI);
    plant(L.x(7.5),L.z(-5),1.1);
    SPOTS['psychologist'] = [ spot(L.p(-7.9,1.5),-Math.PI/2,'board','Mapping biases on the brain board'), spot(L.p(2,3.95),Math.PI,'sit','Reading a meta-analysis'), spot(L.p(-3,-.85),Math.PI,'holo','Studying the brain model') ];
  }

  // ================= OBSERVATORY (physicist)
  { const L=local('physicist');
    const grid=new THREE.GridHelper(17,34,'#2b4a8a','#18284a'); grid.position.set(L.cx,.01,L.cz); scene.add(grid);
    const starGeo=new THREE.BufferGeometry(), sp=[]; for(let i=0;i<700;i++){ const v=new THREE.Vector3().randomDirection(); v.y=Math.abs(v.y)*.6+.2; v.multiplyScalar(6.5); sp.push(L.cx+v.x*1.3,2.2+v.y,L.cz+v.z*.9); }
    starGeo.setAttribute('position',new THREE.Float32BufferAttribute(sp,3)); const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:'#dbe7ff',size:.05})); scene.add(stars);
    // telescope
    { const g=new THREE.Group(); g.position.set(L.x(4.2),0,L.z(-2)); scene.add(g); for(const a of [0,2.1,4.2]){ const l=box(.05,1.4,.05,'#555',Math.cos(a)*.3,.68,Math.sin(a)*.3,{metalness:.6},g); l.rotation.z=Math.cos(a)*.22; l.rotation.x=-Math.sin(a)*.22; }
      const tube=cyl(.18,.13,1.8,'#e9ecef',0,1.75,0,{metalness:.4,roughness:.3},g); tube.rotation.z=.85; cyl(.19,.19,.06,'#74c0fc',-.66,2.3,0,{emissive:'#74c0fc',emissiveIntensity:.7},g).rotation.z=.85; }
    // Kepler-22 system hologram
    const star=add(new THREE.SphereGeometry(.22,24,16), new THREE.MeshBasicMaterial({color:'#ffd27a'}), L.x(-2),1.4,L.z(2)); star.castShadow=false;
    const orbit=add(new THREE.TorusGeometry(.8,.006,6,80), new THREE.MeshBasicMaterial({color:'#74c0fc',transparent:true,opacity:.6}), L.x(-2),1.4,L.z(2)); orbit.rotation.x=Math.PI/2; orbit.castShadow=false;
    const planet=add(new THREE.SphereGeometry(.12,24,16), mat('#4f8fd6',{emissive:'#1d4f8a',emissiveIntensity:.6}), 0,0,0);
    cyl(.4,.45,.8,'#1b2238',L.x(-2),.4,L.z(2));
    tick((t,dt)=>{ planet.position.set(L.x(-2)+Math.cos(t*.5)*.8,1.4,L.z(2)+Math.sin(t*.5)*.8); stars.rotation.y+=dt*.004; });
    table(L.x(5),L.z(3.5),2,.9,'#1b2238'); chair(L.x(5),L.z(4.45),Math.PI); screen(.9,.5,L.x(5),1.22,L.z(3.25),0,'#74c0fc');
    SPOTS['physicist'] = [ spot(L.p(3.05,-2),Math.PI/2,'inspect','Observing Kepler-22 through the telescope'), spot(L.p(-2,3.25),Math.PI,'holo','Modeling the Kepler-22b orbit'), spot(L.p(5,4.45),Math.PI,'sit','Running a warp-drive energy estimate') ];
  }

  // ================= FABRICATION SHOP (model lab)
  { const L=local('model-lab'); const heads=[], prints=[];
    for (const z of [-2.2,0,2.2]) { const px=L.x(-7.6), pz=L.z(z);
      box(1.2,.9,1.2,'#3a3f4d',px,.45,pz); for(const [dx,dz] of [[-.53,-.53],[.53,-.53],[-.53,.53],[.53,.53]]) box(.05,1.0,.05,'#aab2c2',px+dx,1.4,pz+dz,{metalness:.7,roughness:.3}); box(1.2,.06,1.2,'#3a3f4d',px,1.92,pz);
      heads.push([box(.16,.1,.16,'#e85d5d',px,1.2,pz),px,pz]); const pr=cyl(.18,.22,.6,'#9b7bff',px,.93,pz); pr.geometry.translate(0,.3,0); prints.push(pr); }
    table(L.x(2),L.z(1),2.4,1.1,'#3b3556'); cyl(.32,.36,.06,'#9b7bff',L.x(2),.9,L.z(1),{emissive:'#9b7bff',emissiveIntensity:1.2});
    const holo=new THREE.Mesh(new THREE.IcosahedronGeometry(.4,1), new THREE.MeshBasicMaterial({color:'#c9b8ff',wireframe:true})); holo.position.set(L.x(2),1.5,L.z(1)); scene.add(holo);
    box(6,2,.06,'#c8a97e',L.x(0),1.5,L.z(5.86)); instanced(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({metalness:.6,roughness:.4}), 24, (i,o,c)=>{ o.position.set(L.x(-2.6+(i%8)*.75),.9+Math.floor(i/8)*.5,L.z(5.8)); o.scale.set(.08,.35+(i%3)*.1,.04); o.rotation.set(0,0,(i%4-1.5)*.2); c.set(['#c0c6d0','#e85d5d','#ffd43b','#495057'][i%4]); });
    table(L.x(-1),L.z(4.6),3,1,'#4a4458');
    tick((t)=>{ heads.forEach(([h,px,pz],i)=>{ const k=((t*.05)+i*.33)%1; prints[i].scale.y=Math.max(.02,k); h.position.set(px+Math.sin(t*3.1+i)*.3,.95+k*.6+.08,pz+Math.cos(t*2.3+i)*.3); }); holo.rotation.y=t*.6; holo.rotation.x=t*.2; });
    SPOTS['model-lab'] = [ spot(L.p(-6.35,0),-Math.PI/2,'tinker','Printing a prototype'), spot(L.p(2,-.25),0,'holo','Shaping a 3D model'), spot(L.p(-1,3.65),0,'tinker','Assembling parts at the workbench') ];
  }

  // ================= QUANT ROOM
  let chalkA, chalkB; const qScreens=[];
  { const L=local('quant');
    const chalk=(x)=>{ const cv=document.createElement('canvas'); cv.width=1024; cv.height=560; const g=cv.getContext('2d'); const tex=new THREE.CanvasTexture(cv); tex.colorSpace=THREE.SRGBColorSpace;
      const m=add(new THREE.PlaneGeometry(4,2.2), new THREE.MeshStandardMaterial({map:tex,roughness:.95}), L.x(x),1.65,L.z(5.86)); m.rotation.y=Math.PI; m.castShadow=false; box(4.12,2.32,.05,'#6b5236',L.x(x),1.65,L.z(5.9)); return {cv,g,tex}; };
    const write=(b,lines)=>{ b.g.fillStyle='#22332a'; b.g.fillRect(0,0,1024,560); b.g.fillStyle='#e9f5ec'; b.g.font='italic 46px Georgia,serif'; lines.forEach((l,i)=>b.g.fillText(l,40,90+i*110)); b.tex.needsUpdate=true; };
    chalkA=chalk(-4); write(chalkA,['E[X] = Σ x · p(x)','P(A|B) = P(B|A)·P(A) / P(B)','f* = (bp − q) / b','σ² = E[X²] − E[X]²']);
    chalkB=chalk(3); write(chalkB,['dS = μS dt + σS dW','Sharpe = (R − r_f) / σ','LTV / CAC ≥ 3','NPV = Σ CF_t / (1+r)^t']);
    table(L.x(4),L.z(-.3),3,1.1,'#3e4a3a'); chair(L.x(4),L.z(-1.25),0);
    for (let i=0;i<3;i++) { const cv=document.createElement('canvas'); cv.width=256; cv.height=144; const tex=new THREE.CanvasTexture(cv); tex.colorSpace=THREE.SRGBColorSpace;
      const g=new THREE.Group(); g.position.set(L.x(3+i*1.0),1.28,L.z(.05)); g.rotation.y=Math.PI+(i-1)*.2; scene.add(g); box(.92,.55,.04,'#111',0,0,0,{},g);
      const f=add(new THREE.PlaneGeometry(.86,.5), new THREE.MeshBasicMaterial({map:tex}),0,0,.022,g); f.castShadow=false; qScreens.push({cv,tex,seed:i*7+1,pts:[]}); }
    let acc=0; tick((t,dt)=>{ acc+=dt; if(acc<.25) return; acc=0; for(const s of qScreens){ const g=s.cv.getContext('2d'); s.pts.push((s.pts.at(-1)??72)+(Math.sin(t*s.seed)+ (Math.random()-.5)*2)*4); if(s.pts.length>60) s.pts.shift();
      g.fillStyle='#0b1210'; g.fillRect(0,0,256,144); g.strokeStyle='#ffa94d'; g.lineWidth=2; g.beginPath(); s.pts.forEach((y,i)=>{ const yy=Math.max(8,Math.min(136,y)); i?g.lineTo(i*4.3,yy):g.moveTo(0,yy); }); g.stroke(); s.tex.needsUpdate=true; } });
    SPOTS['quant'] = [ spot(L.p(-4,4.9),0,'board','Deriving a formula on the chalkboard'), spot(L.p(4,-1.25),0,'sit','Checking a worked example'), spot(L.p(3,4.9),0,'board','Working through Kelly sizing') ];
  }

  // ================= SERVER ROOM (AI lab)
  { const L=local('ai-lab');
    const racks=[]; for (const x of [3.6,6.8]) for (let i=0;i<4;i++) racks.push([L.x(x),L.z(-.6+i*1.4)]);
    for (const [x,z] of racks) { box(.9,2.4,1.1,'#171b24',x,1.2,z,{metalness:.4,roughness:.4}); }
    const ledCount=racks.length*2*12;
    const leds=instanced(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:'#ffffff'}), ledCount, (i,o,c)=>{ const r=racks[Math.floor(i/24)], side=(Math.floor(i/12)%2)?1:-1, row=i%12;
      o.position.set(r[0]+side*.46,.35+row*.17,r[1]-.35+((i*7)%10)*.07); o.scale.set(.02,.025,.04); c.set('#5ad16b'); });
    leds.castShadow=false;
    for (const z of [-.6,1.5,3.7]) box(4.4,.05,.3,'#3a4250',L.x(5.2),2.6,L.z(z)); // cable trays
    table(L.x(-4),L.z(1),2.4,1.0,'#4b5466'); chair(L.x(-4),L.z(.05),0); const aiScreen=screen(1.1,.62,L.x(-4),1.3,L.z(1.25),Math.PI,'#5ad16b');
    const c=new THREE.Color(), on=new THREE.Color('#5ad16b'), off=new THREE.Color('#0b2a12'), amber=new THREE.Color('#ffa94d'); let acc=0;
    tick((t,dt)=>{ acc+=dt; aiScreen.material.emissiveIntensity=.75+Math.sin(t*2)*.12; if(acc<.15) return; acc=0; for(let i=0;i<ledCount;i++){ const v=Math.sin(t*5+i*1.7); leds.setColorAt(i, v>.2?on:(v>-.6?off:(i%9===0?amber:off))); } leds.instanceColor.needsUpdate=true; });
    SPOTS['ai-lab'] = [ spot(L.p(5.2,2.2),-Math.PI/2,'inspect','Checking Forge AI on the servers'), spot(L.p(-4,.05),0,'sit','Coding Forge AI'), spot(L.p(5.2,-.6),Math.PI/2,'inspect','Swapping a drive in rack 2') ];
  }
  handwriting(brainBoard,'Mind Lab','#c2417e',[['Influence','reciprocity · social proof · scarcity','#7a2a50'],['Biases','anchoring · loss aversion · framing','#7a2a50'],['Brain','dopamine · habits · plasticity','#7a2a50'],['Defense','inoculation · spot dark patterns','#7a2a50']]);
  handwriting(pitchBoard,'Idea Pipeline','#0b7285',[['Idea A','score —/25','#0b7285'],['Idea B','score —/25','#0b7285'],['Idea C','score —/25','#0b7285']]);
  handwriting(recipeBoard,'Recipe → Pain → MVP → $1M ARR','#0b7285',[['Recipe','Tech + Mind + Quant + History','#0b7285'],['Pain','real buyers, real quotes','#0b7285'],['MVP','30 days, 10 customers','#0b7285'],['Kill criteria','decide before you build','#c92a2a']]);

  // ================= NAVIGATION (waypoint graph + A*)
  const nodes=[]; const edges=[];
  const node=(x,z,region)=>{ nodes.push({p:V(x,z),region,n:[]}); return nodes.length-1; };
  const link=(a,b)=>{ nodes[a].n.push(b); nodes[b].n.push(a); };
  const C={};
  for (const z of [-7,7]) for (const x of [-20,-10,0,10,20]) C[`${x},${z}`]=node(x,z,'corridor');
  for (const x of [-10,10]) C[`${x},0`]=node(x,0,'corridor');
  for (const z of [-7,7]) for (const [a,b] of [[-20,-10],[-10,0],[0,10],[10,20]]) link(C[`${a},${z}`],C[`${b},${z}`]);
  for (const x of [-10,10]) { link(C[`${x},-7`],C[`${x},0`]); link(C[`${x},0`],C[`${x},7`]); }
  const roomLink=(rid, cKey, inside, hub)=>{ const i=node(inside[0],inside[1],rid), h=node(hub[0],hub[1],rid); link(C[cKey],i); link(i,h); };
  roomLink('historian','-20,-7',[-20,-9.3],[-20,-12]); roomLink('venture','0,-7',[0,-9.3],[0,-11.5]); roomLink('tech-scout','20,-7',[20,-9.3],[20,-11.5]);
  roomLink('psychologist','-10,0',[-12.3,0],[-17,0]); roomLink('physicist','10,0',[12.3,0],[16,0]);
  roomLink('model-lab','-20,7',[-20,9.3],[-20,11.5]); roomLink('quant','0,7',[0,9.3],[0,11.5]); roomLink('ai-lab','20,7',[20,9.3],[20,11.5]);
  // atrium ring around the vault table + its four doors
  const ring={}; for (const [k,x,z] of [['n',0,-3],['s',0,3],['w',-3,0],['e',3,0],['nw',-2.3,-2.3],['ne',2.3,-2.3],['sw',-2.3,2.3],['se',2.3,2.3]]) ring[k]=node(x,z,'atrium');
  for (const [a,b] of [['n','ne'],['ne','e'],['e','se'],['se','s'],['s','sw'],['sw','w'],['w','nw'],['nw','n']]) link(ring[a],ring[b]);
  const aDoor=(cKey,inside,to)=>{ const i=node(inside[0],inside[1],'atrium'); link(C[cKey],i); for(const t of to) link(i,ring[t]); return i; };
  aDoor('0,-7',[0,-4.9],['n','ne']); aDoor('0,7',[0,4.9],['s','sw','se']); const wDoor=aDoor('-10,0',[-7.9,0],['w']); aDoor('10,0',[7.9,0],['e']);
  const officeOut=node(-5.8,-.6,'atrium'), officeIn=node(-5.8,-2.4,'office'); link(officeOut,officeIn); link(officeOut,ring.w); link(officeOut,wDoor);

  const inBox=(p,[x0,x1,z0,z1],m=0)=>p.x>x0-m&&p.x<x1+m&&p.z>z0-m&&p.z<z1+m;
  function regionOf(p){ if(inBox(p,OFFICE)) return 'office'; for(const [id,r] of Object.entries(ROOMS)) if(inBox(p,r.b)) return id; if(inBox(p,ATRIUM)) return 'atrium'; return 'corridor'; }
  const nearest=(p,region)=>{ let best=-1, bd=1e9; nodes.forEach((n,i)=>{ if(n.region!==region) return; const d=n.p.distanceToSquared(p); if(d<bd){ bd=d; best=i; } }); return best; };
  const crossesVault=(a,b)=>{ const d=b.clone().sub(a); const t=Math.max(0,Math.min(1,-a.dot(d)/Math.max(d.lengthSq(),1e-6))); return a.clone().add(d.multiplyScalar(t)).setY(0).length()<1.9; };
  function route(from, to){
    const ra=regionOf(from), rb=regionOf(to);
    if (ra===rb && ra!=='corridor' && !(ra==='atrium' && crossesVault(from,to))) return [];
    const s=nearest(from,ra), g=nearest(to,rb); if(s<0||g<0) return [];
    const open=new Set([s]), came=new Map(), gs=new Map([[s,0]]), fs=new Map([[s,nodes[s].p.distanceTo(nodes[g].p)]]);
    while(open.size){ let cur=null, cf=1e9; for(const o of open){ const f=fs.get(o); if(f<cf){ cf=f; cur=o; } }
      if(cur===g){ const path=[cur]; while(came.has(path[0])) path.unshift(came.get(path[0])); return path.map(i=>nodes[i].p.clone()); }
      open.delete(cur); for(const nb of nodes[cur].n){ const tg=gs.get(cur)+nodes[cur].p.distanceTo(nodes[nb].p); if(tg<(gs.get(nb)??1e9)){ came.set(nb,cur); gs.set(nb,tg); fs.set(nb,tg+nodes[nb].p.distanceTo(nodes[g].p)); open.add(nb); } } }
    return [];
  }

  return { SPOTS, COFFEE, MACHINE, missionBoard, radarBoard, route, regionOf, rooms:ROOM_LIST, tick:(t,dt)=>{ for(const f of anim) f(t,dt); } };
}
