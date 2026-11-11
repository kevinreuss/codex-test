'use strict';
const $ = id => document.getElementById(id);
const W=495,H=279,S=3;
function surface(){const c=document.createElement('canvas');c.width=W*S;c.height=H*S;return c}
const wood=surface(), paint=surface(), preview=surface(), work=paint.getContext('2d');
const grain=wood.getContext('2d');
let seed=937;
function random(){seed=(seed*16807)%2147483647;return seed/2147483647}
grain.fillStyle='#deb482';grain.fillRect(0,0,wood.width,wood.height);
for(let i=0;i<7000;i++){
 const x=random()*wood.width,y=random()*wood.height,length=12+random()*400;
 grain.strokeStyle=random()>.5?'rgba(115,68,30,.12)':'rgba(255,231,182,.25)';
 grain.lineWidth=random()*1.8;grain.beginPath();grain.moveTo(x,y);
 grain.bezierCurveTo(x+length*.3,y+2,x+length*.75,y-4,x+length,y+random()*3);grain.stroke();
}
const scene=new THREE.Scene();scene.background=new THREE.Color(0x293330);
const camera=new THREE.OrthographicCamera(-350,350,210,-210,1,12000);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));$('stage').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xfff8eb,0x66756a,1.25));
const light=new THREE.DirectionalLight(0xfff4de,.82);light.position.set(-250,500,150);scene.add(light);
function box(w,h,d,color,x,y,z,parent=scene){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.74}));
 mesh.position.set(x,y,z);parent.add(mesh);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
light.castShadow=true;
Object.assign(light.shadow.camera,{left:-760,right:760,top:650,bottom:-650,near:1,far:1750});
light.shadow.camera.updateProjectionMatrix();
light.shadow.mapSize.set(2048,2048);light.shadow.bias=-.0003;
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.14;
scene.environment=workshopReflections(renderer);
buildWorkshop();
const fumes=createExtraction(scene);
const birchPhoto=new Image();
birchPhoto.onload=()=>{grain.drawImage(birchPhoto,0,0,wood.width,wood.height);show(t,true)};
birchPhoto.src=workshopPhotos.birch;
const blank=box(W,3,H,0xb48453,0,-1.6,0);
const texture=new THREE.CanvasTexture(paint);texture.encoding=THREE.sRGBEncoding;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
function plane(map,y,transparent=false){const m=new THREE.Mesh(new THREE.PlaneGeometry(W,H),(transparent?new THREE.MeshBasicMaterial({map,transparent,depthWrite:false}):new THREE.MeshStandardMaterial({map,roughness:.91})));m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=!transparent;scene.add(m);return m}
const sheetFace=plane(texture,0);const previewMap=new THREE.CanvasTexture(preview);const overlay=plane(previewMap,.1,true);
for(const sign of [-1,1]){
 box(10,10,320,0x45534f,sign*260,2,0);
 box(535,6,7,0x3f4b46,0,-1,sign*154);
 for(let k=-120;k<=120;k+=10)box(k%30===0?5:2,.5,.5,0xabb3a8,sign*260,7.1,k);
}
const rail=new THREE.Group();scene.add(rail);box(531,9,9,0x454c48,0,19,-12,rail);
box(530,2,2,0xb4bab5,0,23,-7,rail);
const head=new THREE.Group();rail.add(head);box(30,18,26,0x202725,0,24,0,head);box(24,2,21,0x48524c,0,34,0,head);
for(let k=-6;k<=6;k+=3)box(1,1,13,0x1d2520,k,35,0,head);
const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(7,2.2,9,16),new THREE.MeshStandardMaterial({color:0x45413b}));nozzle.position.y=10;head.add(nozzle);
const beam=new THREE.Mesh(new THREE.CylinderGeometry(.65,.65,6,8),new THREE.MeshBasicMaterial({color:0xff7c29}));beam.position.y=3;head.add(beam);
const spot=new THREE.Mesh(new THREE.SphereGeometry(1.5,10,8),new THREE.MeshBasicMaterial({color:0xffe498}));spot.position.y=.9;head.add(spot);
const target=new THREE.Vector3(0,98,-65);
let angle=.22,elevation=.44,zoom=1,drag;
let panTool=false;
$('pan').onclick=()=>{
 panTool=!panTool;
 $('pan').setAttribute('aria-pressed',String(panTool));
 $('pan').classList.toggle('active',panTool);
};
function view(){const el=$('stage');if(!el.clientWidth||!el.clientHeight)return;const ratio=el.clientWidth/el.clientHeight,span=Math.max(880,1600/ratio)/zoom;
 camera.left=-span*ratio/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-camera.top;
 camera.position.set(5500*Math.sin(angle)*Math.cos(elevation),5500*Math.sin(elevation),5500*Math.cos(angle)*Math.cos(elevation));camera.position.add(target);camera.lookAt(target);camera.updateProjectionMatrix();for(const wall of roomWalls)wall.visible=wall.userData.inside(camera.position);renderer.setSize(el.clientWidth,el.clientHeight,false);renderer.render(scene,camera)}
new ResizeObserver(view).observe($('stage'));
const canvas=renderer.domElement;
canvas.oncontextmenu=e=>e.preventDefault();
canvas.onpointerdown=e=>{
 if(drag)return;
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,pan:panTool||e.shiftKey||e.button===2||e.button===1};
 canvas.setPointerCapture(e.pointerId);
};
canvas.onpointermove=e=>{
 if(!drag||drag.id!==e.pointerId)return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(drag.pan){
  const scale=(camera.top-camera.bottom)/canvas.clientHeight;
  const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
  const up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
  target.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);
 }else{
  angle-=dx*.008;
  elevation=Math.max(.12,Math.min(1.569,elevation+dy*.006));
  $('topView').classList.remove('active');$('iso').classList.add('active');
 }
 drag.x=e.clientX;drag.y=e.clientY;view();
};
canvas.onlostpointercapture=e=>{if(drag?.id===e.pointerId)drag=null};
canvas.onwheel=e=>{e.preventDefault();zoom=Math.min(4,Math.max(.29,zoom*Math.exp(-e.deltaY*.001)));view()};
function preset(top){angle=top?0:.22;elevation=top?1.5707:.44;target.set(0,top?0:98,top?0:-65);zoom=top?1.6:1;$('iso').classList.toggle('active',!top);$('topView').classList.toggle('active',top);view()}
$('iso').onclick=()=>preset(false);$('topView').onclick=()=>preset(true);
const modes={engrave:'Gravieren',score:'Ritzen',cut:'Schneiden',skip:'Überspringen'}, speeds={engrave:150,score:55,cut:18};
let groups=[],moves=[],duration=0,t=0,drawn=0,playing=false,last=0;
function physical(value){const m=/^([\d.]+)(mm|cm|in|px|pt)?$/.exec(value||'');return m?Number(m[1])*({mm:1,cm:10,in:25.4,pt:25.4/72,px:25.4/96}[m[2]||'px']):0}
function loadSVG(source,name){
 const doc=new DOMParser().parseFromString(source,'image/svg+xml'),root=doc.documentElement;
 if(root.localName!=='svg'||doc.querySelector('parsererror'))throw Error('Die Datei enthält kein gültiges SVG.');
 if(doc.querySelector('use,text,image,mask,clipPath,pattern,filter'))throw Error('Bitte Schrift und Instanzen in Pfade umwandeln und Masken oder Rasterbilder auflösen.');
 const loader=new THREE.SVGLoader();loader.defaultDPI=96;
 const paths=loader.parse(source).paths, map=new Map(),bounds=new THREE.Box2();
 function add(color,mode,lines,rule,stroke){
  const key=mode+color;if(!map.has(key))map.set(key,{color,mode,speed:speeds[mode],shapes:[]});
  map.get(key).shapes.push({lines,rule,stroke});
 }
 for(const path of paths){const st=path.userData.style;if(st.visibility==='hidden'||st.opacity===0)continue;
 const lines=path.subPaths.map(p=>p.getPoints(32)).filter(line=>line.length>1);
 if(!lines.length)continue;
 for(const line of lines)for(const p of line)bounds.expandByPoint(p);
 if(st.fill&&st.fill!=='none'&&st.fillOpacity!==0)add(st.fill,'engrave',lines,st.fillRule,false);
 if(st.stroke&&st.stroke!=='none'&&st.strokeOpacity!==0)add(st.stroke,'cut',lines,st.fillRule,true);
 }
 if(!map.size)throw Error('Keine sichtbaren Vektorpfade gefunden.');
 const size=bounds.getSize(new THREE.Vector2()),center=bounds.getCenter(new THREE.Vector2());
 const vb=(root.getAttribute('viewBox')||'').trim().split(/[ ,]+/).map(Number);
 const real=physical(root.getAttribute('width')),scale=Math.min(real&&vb[2]?real/vb[2]:25.4/96,(W-8)/(size.x||1),(H-8)/(size.y||1));
 const next=[...map.values()].sort((a,b)=>Number(a.mode==='cut')-Number(b.mode==='cut'));
 const modified=new Set();
 for(const g of next)for(const shape of g.shapes){const path=new Path2D();
 for(const line of shape.lines){for(const p of line){if(!modified.has(p)){p.x=(p.x-center.x)*scale+W/2;p.y=(p.y-center.y)*scale+H/2;modified.add(p)}}
 path.moveTo(line[0].x,line[0].y);for(const p of line.slice(1))path.lineTo(p.x,p.y)}
 shape.path=path}
 groups=next;$('filename').textContent=name;$('dimensions').textContent=(size.x*scale).toFixed(1)+' × '+(size.y*scale).toFixed(1)+' mm · zentriert';$('error').textContent='';panel();plan();
}
function panel(){$('ops').replaceChildren();$('count').textContent=groups.length;
 groups.forEach((g,i)=>{const row=document.createElement('div');row.className='op';
 row.innerHTML='<div class="row"><strong><i class="dot"></i><span></span></strong><label><input class="speed" type="number" min="1" max="1000"> mm/s</label></div><select></select>';
 row.querySelector('i').style.background=g.color;row.querySelector('span').textContent=g.name||'Farbe '+(i+1);
 const speed=row.querySelector('input');speed.value=g.speed;speed.ariaLabel='Fahrgeschwindigkeit Farbe '+(i+1);
 speed.onchange=()=>{g.speed=Math.min(1000,Math.max(1,Number(speed.value)||1));speed.value=g.speed;plan()};
 const sel=row.querySelector('select');sel.ariaLabel='Bearbeitung Farbe '+(i+1);
 for(const [v,label] of Object.entries(modes))if(!g.name||v==='cut'||v==='engrave')sel.add(new Option(label,v));sel.value=g.mode;
 sel.onchange=()=>{g.mode=sel.value;g.speed=speeds[g.mode]||g.speed;speed.value=g.speed;plan()};$('ops').append(row)})}
function plan(){clearReveal();playing=false;moves=[];duration=0;let x=8,y=8;
 const ctx=preview.getContext('2d');ctx.setTransform(S,0,0,S,0,0);ctx.clearRect(0,0,W,H);
 function move(nx,ny,mode,speed){const len=Math.hypot(nx-x,ny-y);if(len<.0001)return;
 const end=duration+len/speed;moves.push({x,y,nx,ny,mode,start:duration,end});duration=end;x=nx;y=ny}
 for(const g of groups){if(g.mode==='skip')continue;
 for(const shape of g.shapes){ctx.strokeStyle='rgba(76,61,39,.45)';ctx.lineWidth=g.mode==='engrave'&&shape.width?shape.width:.45;ctx.lineCap=ctx.lineJoin='round';ctx.stroke(g.mode==='cut'&&shape.cutLoop?shape.cutLoop.path:shape.path)}
 if(g.mode==='engrave'){
 const mask=surface(),mc=mask.getContext('2d',{willReadFrequently:true});mc.scale(S,S);mc.lineWidth=.6;
 for(const sh of g.shapes){if(sh.stroke){mc.lineWidth=sh.width||.6;mc.lineCap=mc.lineJoin=sh.width?'round':'butt';mc.stroke(sh.path)}else mc.fill(sh.path,sh.rule==='evenodd'?'evenodd':'nonzero')}
 const w=mask.width,h=mask.height,pixels=mc.getImageData(0,0,w,h).data;
 for(let j=0;j<h;j++){const reverse=j%2===1;let first=-1;
 for(let k=0;k<=w;k++){const col=reverse?w-1-k:k,lit=k<w&&pixels[(j*w+col)*4+3]>64;
 if(lit&&first<0)first=k;
 if(!lit&&first>=0){move((reverse?w-first:first)/S,(j+.5)/S,'travel',180);move((reverse?w-k:k)/S,(j+.5)/S,'engrave',g.speed);first=-1}}}
 }else for(const sh of g.shapes)for(const line of cutLines(sh,g.mode)){move(line[0].x,line[0].y,'travel',180);for(const p of line.slice(1))move(p.x,p.y,g.mode,g.speed)}
 }
 previewMap.needsUpdate=true;show(0,true)}
function stroke(m,f){if(m.mode==='travel'||f<=0)return;work.strokeStyle={cut:'#231a13',score:'#7f5131',engrave:'#805532'}[m.mode];work.lineWidth=m.mode==='cut'?.75:m.mode==='score'?.45:.36;work.beginPath();work.moveTo(m.x,m.y);work.lineTo(m.x+(m.nx-m.x)*f,m.y+(m.ny-m.y)*f);work.stroke()}
function clock(v){return Math.floor(v/60)+':'+String(Math.floor(v%60)).padStart(2,'0')}
function show(value,clear=false){
 if(clear||value<t){drawn=0;work.setTransform(1,0,0,1,0,0);work.drawImage(wood,0,0);work.setTransform(S,0,0,S,0,0)}
 if(value<duration)clearReveal();
 t=Math.max(0,Math.min(value,duration));
 while(drawn<moves.length&&moves[drawn].end<=t)stroke(moves[drawn++],1);
 const m=moves[drawn]||moves[moves.length-1],f=m?Math.min(1,(t-m.start)/(m.end-m.start)):0;
 if(m&&drawn<moves.length)stroke(m,f);
 const x=m?m.x+(m.nx-m.x)*f:8,y=m?m.y+(m.ny-m.y)*f:8;
 head.position.x=x-W/2;rail.position.z=y-H/2;beam.visible=false;spot.visible=!!(playing&&m&&m.mode!=='travel');texture.needsUpdate=true;
 fumes.update(x-W/2,y-H/2,m?.mode,playing,clear);
 $('coord').textContent='X '+x.toFixed(1)+'   Y '+y.toFixed(1)+' mm';$('time').textContent=clock(t)+' / '+clock(duration);$('seek').value=duration?t/duration*100000:0;
 $('state').textContent=playing?(m?.mode==='travel'?'Leerfahrt':modes[m?.mode]):t===0?'Bereit':t>=duration?'Abgeschlossen':'Pausiert';
 $('play').textContent=playing?'Ⅱ Pause':t>=duration&&duration?'↺ Wiederholen':'▶ Starten';$('play').disabled=!duration;if(duration&&t===duration)startReveal();renderer.render(scene,camera)}
function tick(now){if(!playing)return;const next=t+(now-last)/1000*parseInt($('rate').value);last=now;if(next>=duration)playing=false;show(next);if(playing)frame=requestAnimationFrame(tick)}
let frame=0;
$('play').onclick=()=>{cancelAnimationFrame(frame);if(!playing&&t>=duration)show(0,true);playing=!playing;last=performance.now();show(t);if(playing)frame=requestAnimationFrame(tick)};
$('reset').onclick=()=>{playing=false;show(0,true)};$('seek').oninput=()=>{playing=false;show(duration*$('seek').value/100000,true)};
$('guide').onchange=()=>{overlay.visible=!reveal&&$('guide').checked;renderer.render(scene,camera)};
async function read(file){try{if(!file)return;loadSVG(await file.text(),file.name)}catch(e){$('error').textContent=e.message}}
$('upload').onchange=e=>{read(e.target.files[0]);e.target.value=''};document.ondragover=e=>e.preventDefault();document.ondrop=e=>{e.preventDefault();read(e.dataTransfer.files[0])};
loadSVG('<svg xmlns="http://www.w3.org/2000/svg" width="212mm" viewBox="0 0 212 118"><g fill="#52664d"><circle cx="142" cy="37" r="9"/><path d="M29 86L70 37 86 57 103 26 137 68 148 54 183 90 172 90 148 65 139 77 145 86 103 40 97 50 102 48 109 59 101 55 94 59 88 69 74 53 70 49 39 86Z"/></g><g fill="none" stroke="#a8783b"><path d="M34 96 Q65 86 98 94 T178 95 M49 101 Q78 94 99 100 T161 101"/></g><rect x="2" y="2" width="208" height="114" rx="21" stroke="#aa5043" fill="none"/></svg>','Alpenpass.svg');
groups[1].mode='score';groups[1].speed=speeds.score;panel();plan();view();
