// All dimensions are in millimetres, with the material surface at y = 0.
const roomWalls=[];
const lidHinge=new THREE.Group();
function buildWorkshop() {
 const ivory=0xe8e6df, graphite=0x272b2b;
 function panel(w,d,h,r,x,y,z,color) {
  const shape=new THREE.Shape(), a=w/2,b=d/2;
  shape.moveTo(-a+r,-b);shape.lineTo(a-r,-b);shape.quadraticCurveTo(a,-b,a,-b+r);
  shape.lineTo(a,b-r);shape.quadraticCurveTo(a,b,a-r,b);shape.lineTo(-a+r,b);
  shape.quadraticCurveTo(-a,b,-a,b-r);shape.lineTo(-a,-b+r);shape.quadraticCurveTo(-a,-b,-a+r,-b);
  const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:h,bevelThickness:1.3,bevelSize:1.3,bevelSegments:3}),new THREE.MeshStandardMaterial({color,roughness:.38}));
  mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);mesh.castShadow=color!==0x647c78;mesh.receiveShadow=true;scene.add(mesh);return mesh;
 }
 function disk(r,h,x,y,z,color){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,48),new THREE.MeshStandardMaterial({color,roughness:.37}));
  m.position.set(x,y,z);scene.add(m);return m;
 }
 panel(920,524,66,25,0,-109,0,ivory);
 panel(914,517,4,24,0,-43,0,graphite);
 for(const side of [-1,1]){
  panel(147,520,82,19,side*386,-39,0,ivory);
  box(8,65,462,graphite,side*311,-1,0);
 }
 panel(637,52,82,8,0,-39,-234,ivory);
 panel(632,30,72,7,0,-39,244,ivory);
 const lidStart=scene.children.length;
 panel(635,35,9,6,0,34,242,graphite);
 panel(622,450,2,6,0,40,5,0x647c78).material=new THREE.MeshPhongMaterial({color:0x749394,transparent:true,opacity:.13,shininess:110,depthWrite:false});
 // Soft bands of window light across the closed glass.
 const reflection=document.createElement('canvas');reflection.width=512;reflection.height=256;
 const gc=reflection.getContext('2d'),g=gc.createLinearGradient(0,90,480,200);
 for(const [p,a] of [[0,.02],[.12,.03],[.22,.19],[.26,.18],[.27,.04],[.29,.04],[.3,.17],[.38,.15],[.42,.02],[1,0]])g.addColorStop(p,'rgba(226,242,249,'+a+')');
 gc.fillStyle=g;gc.fillRect(0,0,512,256);
 const sheen=new THREE.Mesh(new THREE.PlaneGeometry(612,443),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(reflection),transparent:true,depthWrite:false}));
 sheen.rotation.x=-Math.PI/2;sheen.position.set(0,44,5);sheen.renderOrder=2;scene.add(sheen);
 const label=document.createElement('canvas');label.width=512;label.height=80;
 const ink=label.getContext('2d');ink.fillStyle='#e0dfd7';ink.font='52px Georgia';ink.textAlign='center';ink.fillText('glowforge',256,56);
 const mark=new THREE.Mesh(new THREE.PlaneGeometry(115,18),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(label),transparent:true,depthWrite:false}));
 mark.rotation.x=-Math.PI/2;mark.position.set(0,45,243);scene.add(mark);
 for(const side of [-1,1])box(7,4,452,graphite,side*309,42,5);
 box(614,4,8,graphite,0,42,-217);
 const lidParts=scene.children.slice(lidStart);
 lidHinge.position.set(0,42,-217);scene.add(lidHinge);
 for(const part of lidParts){part.position.sub(lidHinge.position);lidHinge.add(part)}
 disk(16,2,383,45,178,0x949a99);disk(14,2,383,47,178,0xdceeee);
 for(let i=0;i<22;i++)box(78,1,2,0x898d8a,-388,45,-196+i*5);
 const tray=panel(552,391,12,5,0,-17,0,0x272a29);
 const tile=document.createElement('canvas');tile.width=96;tile.height=56;
 const ctx=tile.getContext('2d');ctx.fillStyle='#232525';ctx.fillRect(0,0,96,56);
 for(let row=-1;row<3;row++)for(let col=-1;col<3;col++){
  const x=col*48,y=row*56+(col%2)*28;
  ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.lineTo(x+32*Math.cos(a),y+32*Math.sin(a))}ctx.closePath();ctx.strokeStyle='#797c77';ctx.lineWidth=2.3;ctx.stroke();
 }
 const meshMap=new THREE.CanvasTexture(tile);meshMap.wrapS=meshMap.wrapT=THREE.RepeatWrapping;meshMap.repeat.set(45,55);
 const bed=new THREE.Mesh(new THREE.PlaneGeometry(542,380),new THREE.MeshStandardMaterial({map:meshMap,roughness:.68}));
 bed.rotation.x=-Math.PI/2;bed.position.y=tray.position.y+14;scene.add(bed);
 // A laminated timber bench with individually grained staves.
 const timber=new THREE.CanvasTexture(wood);
 const bench=box(2240,48,924,0xffffff,0,-141,-61);
 const oak=photoTexture('oak');bench.material.map=oak;
 bench.material.bumpMap=oak;bench.material.bumpScale=.7;
 for(const x of [-920,920])for(const z of [-390,320])box(68,780,68,0x565c55,x,-555,z);
 const floor=box(4600,24,3600,0xb5b3ac,0,-950,1050);
 floor.material.map=photoTexture('concrete',5,4);
 // Cut away the near wall as the camera orbits around the room.
 function wall(w,d,x,z,inside){
  const mesh=box(w,2460,d,0xd1ccb9,x,292,z);
  mesh.material.map=photoTexture('plaster',3,2);
  mesh.userData.inside=inside;roomWalls.push(mesh);
  return mesh;
 }
 const back=wall(4600,30,0,-650,p=>p.z>-650);
 wall(30,3600,-2300,1050,p=>p.x>-2300);
 wall(30,3600,2300,1050,p=>p.x<2300);
 wall(4600,30,0,2850,p=>p.z<2850);
 const toolWall=new THREE.Mesh(new THREE.PlaneGeometry(2540,1270),new THREE.MeshStandardMaterial({map:photoTexture('wall'),roughness:.92}));
 toolWall.position.set(-160,155,17);toolWall.receiveShadow=true;back.add(toolWall);
 // Drawer pedestals support the bench, with recessed metal pulls.
 for(const x of [-730,730]){
  box(530,710,670,0x4c5855,x,-526,-40);
  for(let i=0;i<5;i++){
   const y=-235-i*137;
   box(512,126,17,0x697971,x,y,302);
   box(136,13,21,0x303734,x,y+32,320);
  }
 }
 for(const x of [1190,2080])for(const z of [-570,-178])box(29,2050,29,0x515956,x,87,z);
 for(let shelf=0;shelf<5;shelf++){
  const y=-790+shelf*397;
  box(932,30,440,0xb59160,1635,y,-374);
  for(let bin=0;bin<3;bin++){
   const x=1340+bin*293;
   box(254,167,312,shelf%2?0x687a76:0xb19670,x,y+99,-381);
   box(96,41,2,0xe8dfc7,x,y+104,-223);
   box(59,14,3,0x484c48,x,y+140,-222);
  }
 }
 for(let i=0;i<6;i++){
  const stock=box(16,1040+i*66,460,0xc3a579,-1750-i*45,-410+i*33,-316);
  stock.material.map=timber;stock.rotation.z=-.09;
 }
 for(let i=0;i<4;i++){
  const sheet=box(268,7,195,0xc49a66,635+i*3,-113+i*7,-60);sheet.material.map=timber;sheet.rotation.y=.09+i*.013;
 }
 const ruler=box(305,2,25,0xa7aca8,-653,-116,52);ruler.rotation.y=-.35;
 for(let i=0;i<60;i++)box(1,.4,i%2?4:9,graphite,-145+i*5,1.3,-7,ruler);
 // Ribbed aluminium extraction hose from the rear port to the wall.
 const duct=new THREE.CatmullRomCurve3([new THREE.Vector3(-355,-50,-245),new THREE.Vector3(-360,-53,-353),new THREE.Vector3(-455,-30,-460),new THREE.Vector3(-460,10,-639)]);
 const metal=new THREE.MeshStandardMaterial({color:0x999b98,metalness:.45,roughness:.43});
 scene.add(new THREE.Mesh(new THREE.TubeGeometry(duct,68,44,28,false),metal));
 const rib=new THREE.TorusGeometry(44,1.6,5,32),axis=new THREE.Vector3(0,0,1);
 for(let i=0;i<=54;i++){
  const ring=new THREE.Mesh(rib,metal);ring.position.copy(duct.getPointAt(i/54));ring.quaternion.setFromUnitVectors(axis,duct.getTangentAt(i/54));scene.add(ring);
 }
 box(116,116,9,0x777c79,-460,10,-632);
}
